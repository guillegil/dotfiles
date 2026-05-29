# First-expand toast flicker — root cause + fix (AGS v3 / GTK 4.22 / gtk4-layer-shell)

**Verdict:** the flicker is a **layer-shell surface "first resize after map" artifact**, not a Pango/label
problem and not the two-phase *measurement* you hypothesised. The fix is to **stop unmapping the toast
window** (make it persistent) and **collapse the duplicate preview-label + Revealer back to a single body
label**. That single label is your attempt-7 baseline, which you already confirmed is horizontally
perfect; the persistent surface removes the one remaining vertical flicker. The Revealer (attempt 8) is
the wrong tool here and is shown below to be structurally unable to do "2-line preview ↔ full body"
without a jump.

---

## 1. Root cause (refined against your actual code)

Your earlier hypothesis was a two-phase *measurement* on first grow. The code rules that out:

- In attempt 7 the body is a single label with `lines={expanded(e => e ? 100 : 2)}`.
- Setting `lines` on a `GtkLabel` is a size-affecting change → it calls `queue_resize` and **invalidates
  the label's cached size every toggle**. The expanded height is therefore re-measured *cold on every
  expand*, not just the first.
- If a cold **label measurement** caused the flicker, **every** expand would flicker. You observe
  **first-expand-only**. ∴ the cause is **not** label-measurement caching.

What *is* "first-time" and *persists across* the lines-toggling? The **mapped surface's resize path**.
GTK's toplevel size negotiation is intrinsically multi-pass: it computes min/natural **width**, then
uses the *minimum width* to compute the *minimum height for that width*, makes that the toplevel's
minimum, and only then allocates the natural size. (GTK `Gtk.Widget` "Height-for-width geometry
management".) On a **content-sized layer surface** that result must round-trip to the compositor
(`commit` → `configure` → ack → allocate) before it is painted. The **first** content-driven resize
after a surface is mapped is where the initial Wayland configure handshake settles; once settled, later
resizes on that same surface are smooth.

Why it reads as "first expand of *each toast*": your window is `visible={toasts(t => t.length > 0)}`, so
it **unmaps when the last toast clears and remaps when the next arrives**. Toasts almost always appear
solo (5–10 s auto-dismiss), so in practice **each toast = a freshly remapped surface = a fresh
first-resize-after-map**. The contract-then-expand is that first post-map resize; every subsequent
expand/collapse of the *same* (still-mapped) toast reuses the warmed path and is clean — exactly your
symptom.

Two stack-specific facts corroborate this:

- gtk4-layer-shell **remaps the surface** for several state changes, and the **auto exclusive zone is
  driven by the non-anchored margin** — i.e. size/anchor handling is bound up with (re)mapping.
- Hidden→shown GTK windows **reuse the size they had before hiding** rather than re-deriving it from
  content (`Gtk.Window.set_default_size` notes), so map/unmap is never free of size bookkeeping.

> This is the best-supported explanation given the evidence; the persistent-window change below is also
> the clean **confirmation test** (see §6). It is honest to say the exact intra-frame sequence inside the
> compositor isn't directly observable from here — but the fix is determined by the *behavioural* fact
> (first-resize-after-map), which the code makes unambiguous.

---

## 2. Why the Revealer (attempt 8) can't be clean here

A `GtkRevealer` "animates the transition of its child from invisible to visible" and "only hides its
contents, not itself"; its allocated height moves monotonically `0 → child natural`. That's great for
*reveal-from-nothing*, but your design is *2-line preview ↔ full body*, implemented as **two stacked
labels** (preview `lines=2` + full `lines=100` in the revealer). Stacked vertically, the heights add up,
so every variant jumps:

| Timing of preview hide | Card height path | Result |
|---|---|---|
| Preview `visible=false` at t=0 (your current code) | `H₂ → 0 → … → Hₙ` | **start contract** (drops `H₂` then grows) |
| Keep preview, hide after `child-revealed` | `H₂ → H₂+Hₙ → Hₙ` | **overshoot then snap down** |
| Keep preview + fade opacity | same as above (opacity doesn't change layout) | still overshoots |

There is no placement of two stacked labels that yields a pure `H₂ → Hₙ` ramp, because preview and full
occupy *separate* vertical space. (A `Gtk.Stack` doesn't rescue it either: it sizes to the largest child
or snaps, it doesn't ease height.) Hence: drop the duplication, use one label, and fix the surface.

---

## 3. The fix

Two edits to `NotificationToasts.tsx`:

1. **Make the toast window persistent** (`visible` always true) so the surface is mapped once and its
   resize path stays warm across toasts.
2. **Replace the preview-label + Revealer + full-label with a single body label** whose `lines` toggles
   `2 ↔ 100` (your attempt-7 baseline). This preserves all four horizontal fixes you already shipped
   (`min-width: 360px` on `.toast`, `max-width-chars: 30`, `set_size_request(210, -1)`, finite line
   counts), and matches what `NotificationsPanel.tsx` already does.

`NotificationsPanel.tsx` needs **no change** — its rows already use the single-label pattern, and its
list lives in a `scrolledwindow` (`propagateNaturalHeight`, `maxContentHeight: 600`) inside a popover
that stays mapped while open, so height changes are absorbed by the scroller rather than the surface.

---

## 4. Diff

### 4.1 `config/ags/widget/NotificationToasts.tsx`

**(a) Persistent window** — the surface is mapped once, not per-toast.

```diff
     <window
       name="notification-toasts"
-      visible={toasts(t => t.length > 0)}
+      // Persistent: map the layer surface ONCE and keep it mapped. Unmapping
+      // per-toast forced a fresh Wayland configure handshake on every arrival,
+      // and the first content-driven resize after each (re)map is what produced
+      // the first-expand contract-then-expand. Empty stack => ~0-size, transparent
+      // (.toast-window has no background), so it doesn't show or block the corner.
+      visible
       layer={Astal.Layer.OVERLAY}
       anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
       marginTop={38}
       marginRight={12}
       cssClasses={["toast-window"]}
       application={app}
     >
```

> If your Hyprland build drops a zero-size layer surface (most don't), keep it alive with a 1×1
> transparent placeholder as the stack's first child, e.g. `<box widthRequest={1} heightRequest={1} />`,
> or give `.toast-stack { min-width: 1px; min-height: 1px; }`. Try without it first.

**(b) Single body label** — remove the duplicate preview + Revealer. Replace the entire body `<box …
marginStart={44}>` block with:

```diff
       <box orientation={Gtk.Orientation.VERTICAL} spacing={2} marginStart={44}>
-        <label
-          cssClasses={["notif-body"]}
-          label={bodyText}
-          halign={Gtk.Align.START}
-          xalign={0}
-          wrap={true}
-          maxWidthChars={30}
-          ellipsize={Pango.EllipsizeMode.END}
-          lines={2}
-          visible={expanded(e => !e && !!bodyText)}
-          $={(self) => self.set_size_request(210, -1)}
-        />
-        <revealer
-          revealChild={expanded}
-          transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
-          transitionDuration={220}
-        >
-          <label
-            cssClasses={["notif-body"]}
-            label={bodyText}
-            halign={Gtk.Align.START}
-            xalign={0}
-            wrap={true}
-            maxWidthChars={30}
-            ellipsize={Pango.EllipsizeMode.END}
-            lines={100}
-            $={(self) => self.set_size_request(210, -1)}
-          />
-        </revealer>
+        {/* Single body label. `lines` toggles the clamp; width is pinned
+            (set_size_request 210 + max-width-chars 30) so min == max width and
+            the card never shifts horizontally. The persistent surface (above)
+            removes the first-expand vertical flicker — no Revealer needed, and a
+            Revealer can't do preview↔full without a height jump anyway. */}
+        <label
+          cssClasses={["notif-body"]}
+          label={bodyText}
+          halign={Gtk.Align.START}
+          xalign={0}
+          wrap={true}
+          maxWidthChars={30}
+          ellipsize={Pango.EllipsizeMode.END}
+          lines={expanded(e => e ? 100 : 2)}
+          visible={!!bodyText}
+          $={(self) => self.set_size_request(210, -1)}
+        />
         {isLong && (
           <button
             cssClasses={["toast-expand"]}
             halign={Gtk.Align.START}
             label={expanded(e => e ? "Show less" : "Show more")}
             onClicked={() => {
               const next = !expanded.get()
               setExpanded(next)
               if (next) {
                 pauseTimer() // (3) keep it up while expanded
               } else {
                 maybeResume()
               }
             }}
           />
         )}
       </box>
```

Nothing else in `Toast` changes — the timer, motion controller, click-to-dismiss `pick()` walk, and the
title row stay as-is. `Pango` is still imported (used by the summary label), so no import churn.

### 4.2 `config/ags/widget/NotificationsPanel.tsx`

**No change.** Already single-label; the `scrolledwindow` cushions row growth and the popover stays
mapped while open. (If you ever see a one-frame flicker on the *first* row-expand right after the panel
opens, it's the same surface-first-resize; for popovers the scroller normally hides it. If it ever
matters, the panel's `Popover.tsx` could keep its surface mapped and toggle child visibility instead of
mapping/unmapping — but don't pre-emptively do this.)

### 4.3 `_widgets.scss`

**No required change.** `.toast-window { background: transparent; }` is exactly what makes the persistent
empty window invisible. Two **optional** additions:

```diff
 // ── Notification toasts (transient arrival popups) ───────────────────────────
 .toast-window { background: transparent; }
+
+// Optional: only if your compositor refuses a zero-size layer surface and the
+// persistent window fails to map when empty. Keeps a 1px transparent surface
+// alive in the corner. Remove if not needed.
+// .toast-stack { min-width: 1px; min-height: 1px; }
```

The body label's collapsed-vs-expanded height is now driven purely by `lines` (widget side), so no CSS
height/transition is involved — see §5 Q4 for why a CSS `min-height` transition is *not* the right lever
here.

---

## 5. Direct answers to the five questions

**Q1 — Root cause.** Surface **first-resize-after-map** on a content-sized `gtk4-layer-shell` surface,
exposed because the window is remapped per (usually solo) toast. Not a label-measurement cache (ruled out
by `lines` toggling every expand yet only the first flickering), not a Pango bug, not a reportable GTK
bug (per the library's policy, treat anything misbehaving while linked to gtk4-layer-shell as layer-shell
behaviour). Mechanism = GTK's multi-pass height-for-width negotiation + the Wayland configure handshake
settling on first post-map resize.

**Q2 — Clean fix.** Persistent window + single body label (§3/§4). This is idiomatic and removes the
*cause*, not just the symptom. Pre-realizing/pre-measuring the expanded label does **not** reliably help,
because toggling `lines` invalidates that very measurement — so there's no warm cache to populate.

**Q3 — Does the Revealer fix or hide it?** It would *mask* the surface flicker by spreading the grow over
220 ms, but in your two-label layout it *introduces* a height jump (start contract / overshoot — §2) and
fundamentally can't ramp `H₂ → Hₙ` for "preview ↔ full". So: not a clean fix here; remove it.

**Q4 — CSS `min-height` transition?** Supported on 4.22 (both `transition` and `min-height` are in the
GTK CSS properties reference, and you already rely on transitions elsewhere), but it can only ease toward
a **concrete px** target — there is no transition to "content/auto" height. For variable-length bodies
you'd have to measure the target and set it yourself, which is more work than the single-label fix and
buys nothing. Keep it only for genuinely fixed-height rows.

**Q5 — Architecture.** The **persistent always-mapped window is the recommended fix**, and doubles as the
diagnostic (§6). A **fixed-width window** is not the lever: your toast width is already constant
(`.toast` `min-width: 360px` + capped body), so the window isn't renegotiating width on expand. Don't pin
the window with `set_size_request` (that blocks shrink); `set_default_size` only sets the initial size
and still allows shrinking.

---

## 6. Verify / confirm the diagnosis

1. Apply **only** the persistent-window change (4.1a), keep everything else as attempt 7's single label.
   Expand a toast's first "Show more".
   - **Flicker gone** → confirms surface-first-resize-after-map. Done.
   - **Flicker remains** → the post-map first resize isn't the (whole) cause on your compositor; then add
     the CSS softener for fixed rows or open a minimal-reproducer issue on gtk4-layer-shell.
2. Watch the CSS log while testing so an unrelated CSS parse error doesn't masquerade as a layout bug:
   ```sh
   GTK_DEBUG=actions ags run 2>&1 | tee /tmp/ags-debug.log
   # and check your existing /tmp/ags-debug.log for "color-mix"/property errors
   ```
3. Sanity-check there's no stray second resize source: ensure the title row's summary label keeps
   `singleLineMode` (it does) so only the body changes height.

---

## References

GTK 4 (library 4.22):
- Height-for-width size negotiation (multi-pass min-width → min-height-for-width → allocate natural):
  https://docs.gtk.org/gtk4/class.Widget.html
- `Gtk.Revealer` (animates child invisible→visible; only hides contents; `reveal-child` true at
  transition *start*, `child-revealed` at completion): https://docs.gtk.org/gtk4/class.Revealer.html
- `Gtk.Window.set_default_size` (initial-only; hidden→shown reuses prior size; still shrinkable):
  https://docs.gtk.org/gtk4/method.Window.set_default_size.html
- GTK CSS properties (confirms `transition`, `min-height`, `min-width`; no `width`/`height`/`max-width`):
  https://docs.gtk.org/gtk4/css-properties.html

gtk4-layer-shell:
- API overview (remap on certain changes; auto exclusive zone via non-anchored margin; sizing rules,
  anchored-opposite-edges ignores requested size):
  https://wmww.github.io/gtk4-layer-shell/gtk4-layer-shell-GTK4-Layer-Shell.html
- Project README (report layer-shell-linked misbehaviour here, not to upstream GTK):
  https://github.com/wmww/gtk4-layer-shell

AGS / Astal:
- Common Issues (a window whose child starts unrevealed may not allocate unless wrapped in a sized box —
  the revealer-in-layer-window allocation quirk): https://aylur.github.io/ags-docs/config/common-issues/
- Astal docs: https://aylur.github.io/astal/
