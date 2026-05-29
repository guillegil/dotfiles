# Research request: first-expand flicker on a layer-shell notification toast (AGS v3 / GTK4)

## Goal

We have an on-screen notification **toast** (a popup that appears top-right when a
notification arrives). Long notifications show a 2-line preview with a **"Show more"**
button that expands the body to its full text. We want the expand/collapse to be visually
clean.

**The remaining problem:** the **first** time a given toast is expanded, there is a
one-frame flicker — the toast's **top edge contracts slightly and then expands**. Every
subsequent Show more / Show less on the *same* toast animates/changes cleanly. Only the
first expansion of each toast flickers.

We need to know: **what causes this and how to eliminate it** (ideally a clean,
idiomatic fix; alternatively a confirmation that it's an unavoidable layer-shell limitation
with the least-bad workaround).

---

## Environment

| Component | Version / detail |
|---|---|
| Compositor | Hyprland (Wayland) |
| Shell toolkit | **AGS v3.1.0** (Aylur's GTK Shell), Astal + **gnim** JSX runtime |
| GTK | **4.22.4** (`pkg-config --modversion gtk4`) |
| Layer shell | `gtk4-layer-shell` (Astal.Window) |
| Notification daemon | AstalNotifd (AGS-native; swaync removed) |
| Language | TypeScript `.tsx` compiled by AGS's esbuild bundler |

Relevant facts about this stack that we've already confirmed empirically:
- GTK4 CSS has **no `width`/`height`/`max-width`** — only `min-width`/`min-height`.
- `color-mix()`, `transform`, `transition`, media queries all work on 4.22.
- gnim intrinsics include `<box> <label> <image> <button> <revealer> <scrolledwindow> <overlay> <window>` etc. `<calendar>`/`<progressbar>` are NOT intrinsics.
- The toast window is a **`gtk4-layer-shell` layer surface** anchored `TOP | RIGHT`, `layer = OVERLAY`, content-sized (no fixed width/height), `visible` only while ≥1 toast is shown.

---

## The widget

File: `config/ags/widget/NotificationToasts.tsx`

Structure (simplified):

```
<window name="notification-toasts" layer=OVERLAY anchor={TOP|RIGHT} marginTop=38 marginRight=12>
  <box orientation=VERTICAL spacing=8>          // toast stack
    <For each={toasts}>
      {(n) => <Toast n={n} .../>}               // one card per active notification
    </For>
  </box>
</window>
```

Each `<Toast>` is a vertical card:

```
<box class="toast" orientation=VERTICAL spacing=4>   // min-width: 360px (CSS)
  <box>                                              // title row
    <icon-tile/> <summary hexpand/> <× button/>
  </box>
  <box orientation=VERTICAL marginStart=44>          // body, indented under title
    <label class="notif-body" lines=2 .../>          // collapsed preview
    ... expand mechanism here ...
    <button class="toast-expand">Show more</button>
  </box>
</box>
```

- The toast width is meant to be **constant** (all toasts identical width). This is now
  achieved with `min-width: 360px` on `.toast` plus a pinned body width (see below).
- Body text wraps in a fixed column (~210px / 30 chars).
- Expansion is driven by reactive state: `const [expanded, setExpanded] = createState(false)`
  and the body reacts to `expanded`.
- Each toast has a pausable auto-dismiss timer (hover pauses, leave resumes) — not relevant
  to the flicker but present.

---

## What we have already SOLVED (for context — do not undo these)

These were earlier bugs we fixed; the research should preserve these properties:

1. **Half-screen growth** for long bodies → fixed by `max-width-chars` (caps the natural
   wrap width). GTK4 has no `max-width`, so this is the only cap.
2. **All toasts must be the same width** → `.toast { min-width: 360px }` floors short ones;
   `max-width-chars` caps long ones below 360 → uniform.
3. **Horizontal shift on expand** (toast is right-anchored, so width changes move it
   sideways) → fixed by pinning the body width with `set_size_request(210, -1)` *and*
   `max-width-chars=30` so the label's **min == max** width.
4. **"Show less" not returning to original width** (layer-shell windows grow but resist
   shrinking) → also fixed by the fixed width pin above.

So **horizontal** behavior is now correct and stable. The ONLY remaining issue is the
**first-expand vertical flicker** (top contracts then expands).

---

## The remaining problem in detail

- On the **first** `Show more` of a toast, the card's **top edge briefly contracts** (gets
  a few px shorter) and then **expands** to the full height. Visible as a quick "jump".
- On **all subsequent** expands/collapses of the same toast, the height change is clean.
- Our hypothesis: the layer-shell surface is content-sized; the **first** time it must grow,
  `gtk4-layer-shell` performs a **two-phase size commit** (first the minimum size, then the
  natural size), and GTK hasn't cached the new measurement yet — producing the
  contract-then-expand. Once measured/cached, later resizes are smooth.
- We have NOT confirmed this hypothesis at the layer-shell level; it's inference.

---

## Solutions attempted (and why each did NOT fully work)

All edits are in `config/ags/widget/NotificationToasts.tsx` on the body `<label>`.

### 1. Toggle `ellipsize` END↔NONE + `lines` -1↔2
```tsx
lines={expanded(e => e ? -1 : 2)}
ellipsize={expanded(e => e ? Pango.EllipsizeMode.NONE : Pango.EllipsizeMode.END)}
```
- **Result:** expansion worked, but toggling `ellipsize` **recomputed the label width**,
  causing a horizontal **width jitter** on expand.

### 2. Constant `ellipsize=END` + toggle `lines` 2↔-1
```tsx
lines={expanded(e => e ? -1 : 2)}
ellipsize={Pango.EllipsizeMode.END}   // constant
```
- **Result:** `lines={-1}` (the "unlimited" sentinel) rendered as a **collapse** — "Show
  more" *reduced* the visible text instead of revealing it. So `-1` is unusable here.

### 3. `max-width-chars` to cap width
```tsx
maxWidthChars={30}
```
- **Result:** fixed the half-screen growth, but the **first-expand jitter/flicker remained**
  (max-width-chars caps the *natural* width but not the *minimum*).

### 4. `width-chars` == `max-width-chars` to pin natural width
```tsx
widthChars={30} maxWidthChars={30}
```
- **Result:** more stable horizontally, but still a first-expand horizontal nudge (min width
  still jumped when ellipsize flipped).

### 5. `hexpand` on the body to fill a fixed column
```tsx
hexpand={true}
```
- **Result:** made it **worse** — on "Show less" the toast **did not return to its original
  width** (layer-shell grew the surface and did not shrink it back).

### 6. `set_size_request(px, -1)` alone (no max-width-chars)
```tsx
$={(self) => self.set_size_request(264, -1)}
```
- **Result:** `set_size_request` only pins the **minimum** width, not the maximum, so a very
  long body requested its full natural width again → **half-screen growth returned**.

### 7. `max-width-chars` + `set_size_request` together (min == max, finite `lines`)
```tsx
maxWidthChars={30}
ellipsize={Pango.EllipsizeMode.END}     // constant
lines={expanded(e => e ? 100 : 2)}      // finite, not -1
$={(self) => self.set_size_request(210, -1)}
```
- **Result:** **horizontal is now fully fixed** (no shift, no half-screen, returns
  correctly, uniform width). BUT the **first-expand vertical flicker remains** (top contracts
  then expands). This is the current baseline minus the revealer below.

### 8. (CURRENT) `Gtk.Revealer` SLIDE_DOWN to mask the flicker
```tsx
<label class="notif-body" lines=2 visible={expanded(e => !e && !!bodyText)} .../>   // preview
<revealer
  revealChild={expanded}
  transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
  transitionDuration={220}
>
  <label class="notif-body" lines=100 .../>   // full body
</revealer>
```
- **Idea:** a collapsed 2-line preview shown when not expanded; the full body lives in a
  Revealer that slides down on expand, so the animation *masks* the two-phase resize.
- **Result:** _pending user verification at time of writing._ (This document is being
  produced to get an authoritative answer rather than keep guessing.)

---

## Questions for the research agent

1. **Root cause:** Is the first-expand contract-then-expand a known behavior of
   `gtk4-layer-shell` content-sized surfaces (two-phase size negotiation on first grow), or a
   GTK4 label/box measurement caching artifact? Authoritative source preferred (gtk4-layer-shell
   issues, GTK drawing-model docs, Astal/AGS issues).

2. **Clean fix:** Is there an idiomatic way to make a layer-shell surface resize cleanly on
   first grow? e.g.:
   - Pre-measuring / pre-realizing the expanded content while hidden so GTK caches the size?
   - A specific layer-shell property (exclusive zone, `set_default_size`, keyboard/anchor
     config) that stabilizes resizing?
   - Forcing a single-phase commit?

3. **Does the Revealer approach (attempt 8) actually fix it**, or merely hide it? Is there a
   better animation/container (e.g. `Gtk.Revealer` `CROSSFADE`, a `Gtk.Stack` with transition,
   animating `min-height` via CSS `transition`) that is more robust on a layer surface?

4. **Is animating `min-height` via GTK4 CSS `transition` viable** for the body/card so the
   height change eases (masking the two-phase commit) without a Revealer? GTK4 4.22 supports
   CSS transitions — does it animate `min-height` on a content-sized layer-shell child?

5. **Alternative architecture:** Would giving the toast window a **fixed width** (and letting
   only height vary) — or rendering toasts in a single persistent always-visible window rather
   than mapping/unmapping — avoid the first-resize artifact?

## Constraints the solution must respect

- Must keep **uniform, fixed toast width** (no half-screen growth, no horizontal shift,
  returns to original on collapse).
- GTK4 has **no `max-width`**; width control is via `min-width` (CSS) + `width-chars` /
  `max-width-chars` / `set_size_request` (widget).
- `lines={-1}` is unusable (renders as a collapse); use finite line counts.
- Stack is AGS v3.1.0 / gnim / GTK 4.22.4 / gtk4-layer-shell on Hyprland.
- Prefer a fix that also works for the notification **panel** popover (same pattern, a
  `gtk4-layer-shell` popover anchored `TOP|RIGHT`), which has expandable rows too.

## Key files

- `config/ags/widget/NotificationToasts.tsx` — the toast widget (this issue).
- `config/ags/widget/NotificationsPanel.tsx` — the bell panel with the same expandable rows.
- `config/ags/widget/Popover.tsx` — shared full-screen-scrim popover wrapper used by the panel.
- `config/ags/style/_widgets.scss` — `.toast`, `.notif-body`, `.toast-expand` styles.
