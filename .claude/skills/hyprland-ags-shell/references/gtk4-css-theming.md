# GTK4 CSS Theming — Tokens, Variables, and Runtime Switching

> Authority: GTK 4 docs (context7-verified for `var()` since 4.16, `@define-color` status) +
> in-repo reference `docs/gtk_css_reference_overview.md` + empirical evidence from
> `config/ags/style/_tokens.scss` (GTK 4.22, marked **[empirical GTK 4.22]**).

---

## The Universal Selector for Custom Properties

**Use `*` (universal selector), NOT `:root`, for custom property declarations.**

`:root` is listed as a valid selector in GTK docs **[ref-doc]**, but in practice it behaves inconsistently for custom property cascade. The GTK 5 migration guide recommends `:root`, which suggests GTK 4's support may be partial. The production pattern confirmed to work reliably: **[empirical GTK 4.22]**

```css
/* RELIABLE in GTK 4 — custom props cascade to every widget */
* {
  --bg:     #1e1e2e;
  --fg:     #cdd6f4;
  --accent: #89b4fa;
  --radius: 14px;
  --t-base: 0.15s;
}

/* Fragile in GTK 4 — may not cascade as expected */
:root {
  --bg: #1e1e2e;
}
```

The `*` selector appears in `config/ags/style/_tokens.scss` with explicit comment:
> "GTK4 CSS does not support :root or attribute selectors. Tokens are emitted on the universal selector so they cascade to every widget."

---

## CSS Custom Properties (var()) — since GTK 4.16 **[docs-verified]**

Standard CSS custom properties work: declare with `--name: value`, consume with `var(--name)` or `var(--name, fallback)`.

```css
* {
  --accent: #89b4fa;
  --radius: 14px;
}

.card {
  border-radius: var(--radius);
  border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
}

/* Fallback if a token is unset */
.badge { color: var(--badge-color, var(--accent)); }
```

Custom properties are **runtime values** — they can be changed by swapping the CSS provider. This is the correct mechanism for runtime theme switching.

---

## SCSS color.mix() vs CSS color-mix() — a critical distinction

These look similar but execute at entirely different times:

| Mechanism | When it runs | Who runs it | Output |
|---|---|---|---|
| SCSS `color.mix($a, $b, 50%)` | Build time | dart-sass compiler | Baked `#rrggbb` in the CSS file |
| CSS `color-mix(in oklab, var(--a) 50%, var(--b))` | Runtime | GTK CSS engine | Computed on-the-fly per widget |

**Consequence:** SCSS `color.mix()` cannot reference CSS `var()` tokens — the variables don't exist at build time.

```scss
// WRONG — $accent is a SCSS variable; var(--accent) doesn't exist at compile time
$mixed: color.mix(var(--accent), transparent, 18%);  // compile error

// RIGHT — use SCSS variables for build-time mixing
@use "sass:color";
$accent: #89b4fa;
$accent-tint: color.mix($accent, transparent, 18%);  // → resolved hex

// OR — use CSS color-mix() at runtime (GTK 4.22+ empirically confirmed)
.button:hover {
  background: color-mix(in oklab, var(--accent) 12%, transparent);
}
```

The project uses **both** approaches:
- `_tokens.scss`: SCSS `color.mix()` for palette helpers that don't need runtime swapping
- `_widgets.scss`: CSS `color-mix()` for interactive states that consume `var()` tokens at runtime

---

## @define-color — legacy mechanism, deprecated **[ref-doc]**

`@define-color name color;` declares a named color; reference it as `@name`. GTK-specific, not part of any web CSS spec.

```css
/* Legacy pattern */
@define-color accent #89b4fa;
.button { background: alpha(@accent, 0.2); }
/* Also: lighter(), darker(), shade(), mix() GTK color functions */
```

Status: **still works in GTK 4** but is explicitly deprecated in favor of CSS custom properties. The GTK 5 migration guide says to replace all `@define-color` with `--custom-prop` in `:root` scope. For new code, always use `var()`.

---

## Runtime Theme Switching

GTK has no equivalent of the web's `data-theme="dark"` attribute selector pattern. Attribute selectors are not supported **[ref-doc]**. To switch themes at runtime, you must either:

**Option A: Reload the entire CSS provider**

```ts
// AGS / GJS — swap or reload the GtkCssProvider
app.apply_css(newCssString, true);
// Or reset and add a new provider:
const provider = new Gtk.CssProvider();
provider.load_from_string(newCssString);
Gtk.StyleContext.add_provider_for_display(
  Gdk.Display.get_default(),
  provider,
  Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
);
```

**Option B: Swap custom property values via a new provider at high priority**

Define all tokens as `var()` in `*`. Then apply a small override sheet that redefines only the tokens for the alternate theme:

```css
/* base.css — always loaded */
* { --bg: #1e1e2e; --fg: #cdd6f4; }

/* light-override.css — loaded on top when switching to light */
* { --bg: #eff1f5; --fg: #4c4f69; }
```

Add the override provider at a higher priority than the base, remove it to revert.

**Option C: Media query (GTK 4.22+)**

```css
* { --bg: #1e1e2e; --fg: #cdd6f4; }

@media (prefers-color-scheme: light) {
  * { --bg: #eff1f5; --fg: #4c4f69; }
}
```

Automatic — follows the system color scheme setting. No code needed. Requires GTK ≥ 4.22.

**Option D: External palette generator (e.g. matugen)**

Tools like matugen read the wallpaper and regenerate the SCSS/CSS token file, then the app reloads its stylesheet. The theme switching happens at the file level, not at the CSS selector level.

---

## Token Naming Conventions

Group tokens by semantic role, not by raw color value:

```css
* {
  /* Palette layer — raw named colors */
  --blue:   #89b4fa;
  --red:    #f38ba8;
  --green:  #a6e3a1;

  /* Semantic layer — role-based aliases */
  --accent:    var(--green);   /* primary interactive accent */
  --bg:        rgba(30,30,46,0.94);
  --bg2:       #313244;        /* elevated surface */
  --bg3:       #45475a;        /* double-elevated surface */
  --text:      #cdd6f4;
  --dim:       #7f849c;        /* secondary/placeholder text */
  --bar-border: #232535;       /* subtle separator lines */

  /* Shape tokens */
  --radius:        14px;
  --radius-inner:  10px;
  --radius-hero:   18px;
  --pad:           8px;

  /* Motion tokens */
  --t-fast:  0.12s;
  --t-base:  0.15s;
  --t-morph: 0.18s;
}
```

Widgets consume only semantic tokens. The palette layer is only referenced in the semantic layer and in one-off SCSS helpers. This two-layer structure lets you swap palettes (dark → light) by only redefining the semantic layer.

---

## References

- `config/ags/style/_tokens.scss` — canonical token file, `*` selector pattern, SCSS vs CSS comment
- `docs/gtk_css_reference_overview.md` — §6 Colors, §6.2 Custom properties, §6.3 @define-color
- https://docs.gtk.org/gtk4/css-properties.html (Custom Properties section: "Starting with version 4.16")
- https://docs.gtk.org/gtk4/migrating-4to5.html (@define-color → var() migration guidance)
