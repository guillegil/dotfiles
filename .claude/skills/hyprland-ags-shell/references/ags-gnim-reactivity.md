# AGS v3 — gnim Reactivity Reference

> Target: **AGS v3** (Astal + gnim, GTK4). AGS v1 was GTK3 with a completely different API — do not mix.
> Verified against context7 `/aylur/ags` (306 snippets).

---

## Core Primitives

### `createState<T>(initialValue): [Accessor<T>, Setter<T>]`

Creates a writable reactive signal. Returns a **tuple** — destructure it.

```tsx
import { createState } from "ags"

const [count, setCount] = createState(0)

// Read: call as function
count()                          // → current value

// Write: pass value or updater
setCount(5)
setCount(c => c + 1)
```

**VERIFIED** — context7 `/aylur/ags`, `createState` APIDOC.

---

### `createComputed<T>(fn: () => T): Accessor<T>`

Derives a reactive value. Dependencies are **auto-tracked** — any accessor called inside `fn` becomes a dependency.

```tsx
import { createState, createComputed } from "ags"

const [celsius, setCelsius] = createState(22)
const fahrenheit = createComputed(() => (celsius() * 9) / 5 + 32)
```

**VERIFIED** — context7 `/aylur/ags`, `createComputed` APIDOC.

---

### `createBinding(obj, prop): Accessor<T>`

Binds reactively to a **GObject property**. Re-evaluates when the property emits `notify::prop`.

```tsx
import { createBinding } from "ags"
import AstalBattery from "gi://AstalBattery"

const battery = AstalBattery.get_default()
const pct = createBinding(battery, "percentage")
const icon = createBinding(battery, "iconName")
```

The property name must match the GObject property name (camelCase in GJS bindings). Use `ags types -d <dir>` to generate type stubs and verify exact names before binding — wrong names fail silently.

**VERIFIED** — context7 `/aylur/ags`, `createBinding` APIDOC.

---

## Accessor Methods

### `.as(fn)` — inline derivation

Transforms the accessor's value without `createComputed`. Safe for simple one-shot transforms.

```tsx
const label = createBinding(battery, "percentage").as(p => `${Math.floor(p * 100)}%`)
// or from createState:
const display = count.as(c => `Clicked ${c} times`)
```

**VERIFIED** — context7 `/aylur/ags`, examples show `.as()` on both `createState` accessors and `createBinding`.

### `.peek()` — non-tracking read

Reads the current value **without** registering a reactive dependency. Use inside event handlers and imperative escape hatches where you don't want to re-run on change.

```tsx
// Inside a key handler — read without subscribing:
const len = results.peek().length
setSelectedIdx(i => Math.min(i, len - 1))
```

**Verified empirically** — used throughout Launcher.tsx; confirm `.peek()` exists on your installed AGS version.

### `.subscribe(fn)` — side-effect on change

Runs `fn` every time the accessor's value changes. Returns an unsubscribe function.

```tsx
results.subscribe(() => {
  const len = results.peek().length
  setSelectedIdx(i => len === 0 ? 0 : Math.min(i, len - 1))
})
```

**Verified empirically** — used in Launcher.tsx; confirm against your AGS version.

### Inline shorthand (call accessor as transform)

Accessor returned by `createState` can also be called directly with a transform function, as shorthand for `.as()`:

```tsx
const [count, setCount] = createState(0)
const label = count(c => `Clicked ${c} times`)
// equivalent to count.as(c => `Clicked ${c} times`)
```

**VERIFIED** — context7 `/aylur/ags`, `createState` APIDOC.

---

## `<For>` — Dynamic List Rendering

Renders a list from an `Accessor<T[]>`. Reconciles only the diff — added items create new widgets, removed items destroy them.

```tsx
import { For } from "ags"

<For each={items}>
  {(item, idx) => (
    <label label={item.name} />
  )}
</For>
```

**`idx` is `Accessor<number>`** — call it as `idx()` for the current index. It is NOT a plain number.

```tsx
<For each={results}>
  {(a: App, idx) => (
    <button
      cssClasses={createComputed(() =>
        selectedIdx() === idx() ? ["item", "selected"] : ["item"]
      )}
    />
  )}
</For>
```

**VERIFIED** — context7 `/aylur/ags`, `<For>` APIDOC; `idx` type confirmed `Accessor<number>` from docs and empirically in Launcher.tsx.

---

## ANTI-PATTERN: `.as(arr => arr.map(...))` inside JSX

**This renders the literal string `"Accessor{}"` instead of widgets.**

```tsx
// WRONG — do NOT do this:
<box>
  {items.as(arr => arr.map(item => <label label={item.name} />))}
</box>

// CORRECT — use <For>:
<box>
  <For each={items}>
    {(item) => <label label={item.name} />}
  </For>
</box>
```

When you need a derived scalar from an array, `.as()` is fine. Only avoid it for rendering lists of widgets.

---

## The `$` Prop — Imperative Escape Hatch

The `$` prop receives the realized `Gtk.Widget` instance after it is constructed. Use it to:
- Add GTK controllers imperatively
- Call methods not exposed as JSX props
- Store a ref to the widget

```tsx
<entry
  $={self => {
    searchEntry = self          // store ref
    const fc = new Gtk.EventControllerFocus()
    fc.connect("enter", () => { entryFocused = true })
    self.add_controller(fc)
    self.grab_focus()
  }}
/>
```

**Verified empirically** — used pervasively in Launcher.tsx, NotificationsPanel.tsx. Confirm prop name `$` against your AGS version.

---

## Usage Decision Table

| Need | Use |
|------|-----|
| Local mutable value | `createState` |
| Value derived from other accessors | `createComputed` |
| Bind to GObject `notify::` property | `createBinding` |
| Simple transform of an accessor | `.as(fn)` |
| Read without tracking (event handlers) | `.peek()` |
| Side-effect on change | `.subscribe(fn)` |
| Render reactive list of widgets | `<For each={accessor}>` |
| Imperative GTK access after mount | `$` prop |
