# GTK4 Icons — Symbolic Icons, Hicolor Themes, and Custom Icons

> Authority: GTK 4 docs + in-repo reference `docs/gtk_css_reference_overview.md` + empirical
> observation on GTK 4.22 (marked **[empirical GTK 4.22]**). Symbolic icon recoloring via `color`
> is noted in the GTK docs and confirmed empirically. Hicolor install procedure follows
> freedesktop.org XDG icon theme spec (not GTK-specific).

---

## Symbolic Icon Recoloring

GTK symbolic icons are recolored at render time using the widget's CSS `color` property.

**How it works:** A symbolic icon is a single-path SVG where the fill is replaced by GTK with the current foreground color. The `color` CSS property on the `Gtk.Image` widget (or any ancestor it inherits from) controls the rendered color.

```css
/* Recolor the icon to match the text color */
.status-icon image { color: var(--text); }

/* State-driven recoloring — the image inherits from the parent */
.battery.low  { color: var(--red); }    /* icon + label both go red */
.battery.high { color: var(--green); }

/* Target only the image node if label color should differ */
.battery.low image { color: var(--red); }
.battery.low label { color: var(--text); }
```

**[empirical GTK 4.22]** — confirmed working across all system status icons and custom symbolic icons in this project.

---

## Symbolic vs Full-Color Icons

| Icon type | CSS `color` effect | Notes |
|---|---|---|
| Symbolic (`*-symbolic`) | Full recolor — the entire glyph takes the CSS `color` | Designed as single-path, fill-friendly SVGs |
| Full-color (application icon) | No effect | Rendered as-is from the icon theme |

To check: `gtk-query-immodules-3.0` or look at the icon name in the theme — symbolic icons end in `-symbolic` by convention.

---

## STROKE-Art SVGs Render as Solid Fills

**Critical gotcha:** GTK's symbolic icon renderer treats SVG paths as fill shapes, not strokes. If a custom SVG icon uses `stroke` without a fill, or relies on complex path operations, it may render incorrectly (invisible, solid blob, or wrong shape).

**Design rule for custom symbolic icons:**
- Use single closed paths with `fill="currentColor"` (or GTK-compatible fill)
- Avoid `stroke` as the primary visual element
- Use negative space (cutout paths) to create holes/detail, not strokes
- Test with `gtk4-icon-browser` or by loading into a real AGS widget before finalizing

---

## -gtk-icon-palette for Named Color Slots

Symbolic icons can define named color slots beyond the single default color. Use `-gtk-icon-palette` to override specific named slots:

```css
/* Recolor named semantic slots in the icon */
.status image {
  -gtk-icon-palette: error #f38ba8, warning #f9e2af, success #a6e3a1;
}
```

The icon SVG must be designed with these named colors (using GTK's `gtk:colorN` named color conventions). Most system status icons support at least `error`, `warning`, and `success`. **[ref-doc]**

---

## -gtk-icon-size

Sets the rendered size of a symbolic icon widget. Not the same as `width`/`height` (which don't exist in GTK CSS). **[ref-doc]**

```css
.tray-icon  { -gtk-icon-size: 16px; }
.app-tile   { -gtk-icon-size: 40px; }
.status-bar { -gtk-icon-size: 22px; }
```

---

## Installing Custom Icons into the Hicolor Theme

GTK's icon lookup follows the freedesktop.org XDG Icon Theme Specification. The standard install path for user-local icons is the `hicolor` fallback theme.

### Directory structure

```
~/.local/share/icons/hicolor/
  scalable/apps/
    my-app.svg
    my-app-symbolic.svg
  16x16/apps/
    my-app.png
  22x22/apps/
    my-app.png
  48x48/apps/
    my-app.png
```

For symbolic icons, `scalable/apps/` is the primary location. GTK will also look in `symbolic/apps/` in newer themes.

### Register the cache

After adding icons, rebuild the icon cache:

```sh
gtk-update-icon-cache ~/.local/share/icons/hicolor/
# Or force-update even if nothing seems changed:
gtk-update-icon-cache -f -t ~/.local/share/icons/hicolor/
```

Without this step, newly installed icons may not appear until a full session restart (GTK caches icon lookups).

### Use unique icon names

Icon names in the hicolor theme shadow each other globally. If you use a name that already exists in the system theme (e.g. `audio-volume-muted`), your icon may override the system one or be hidden by it depending on theme priority.

**Convention:** prefix custom icons with your app or shell name:

```
my-shell-launcher-symbolic.svg    ✓
launcher-symbolic.svg             ✗  may collide with system icon
```

---

## Loading Icons in AGS / Astal

```tsx
// By icon name (looked up in the active icon theme)
<image iconName="my-shell-launcher-symbolic" pixelSize={20} />

// By file path (absolute, bypasses icon theme)
<image file="/home/user/.config/ags/assets/my-icon.svg" pixelSize={20} />

// Setting icon size via CSS (symbolic icons only)
// In TSX: pixelSize prop sets the GdkPixbuf size
// In CSS: -gtk-icon-size property
```

---

## Wallpaper-Derived Palettes (matugen)

`matugen` is a tool that generates a color palette from a wallpaper image using Material You's color extraction algorithm. Typical workflow in AGS shells:

1. User sets wallpaper (e.g. via `swww`, `swaybg`, or `hyprpaper`).
2. A hook triggers `matugen image /path/to/wallpaper` → generates `~/.config/matugen/colors.scss` (or JSON/CSS).
3. AGS hot-reloads the stylesheet, picking up the new palette tokens.

```sh
# Basic matugen usage
matugen image ~/wallpapers/current.jpg

# With output format (check matugen docs for available templates)
matugen image ~/wallpapers/current.jpg --type scheme-tonal-spot
```

The palette is used as the SCSS variable layer in `_tokens.scss`. Since the values are baked at build time (SCSS), a stylesheet reload is required on each wallpaper change — not a live runtime update.

For runtime palette switching without reload, emit the palette as CSS `--custom-prop` values instead of SCSS variables, then reload only a small override CSS provider (see theming doc).

---

## Icon Theme Runtime Switching

GTK reads the icon theme name from GSettings (`org.gnome.desktop.interface icon-theme`). Changing this setting causes GTK to reload its icon lookup — no app restart needed. The CSS `color` recoloring still applies to whatever symbolic icons the new theme provides.

```sh
# Switch icon theme at runtime
gsettings set org.gnome.desktop.interface icon-theme "Papirus-Dark"
```

---

## References

- `config/ags/style/_widgets.scss` — `-gtk-icon-size` and `-gtk-icon-palette` usage patterns
- `docs/gtk_css_reference_overview.md` — §5 Fonts, text & icons (-gtk extension properties)
- https://docs.gtk.org/gtk4/css-properties.html (icon properties section)
- https://specifications.freedesktop.org/icon-theme-spec/icon-theme-spec-latest.html (XDG Icon Theme Spec)
