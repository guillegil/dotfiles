# Arch Packaging — Hyprland + AGS stack

> Verification status:
> - Package names for Hyprland ecosystem (`hyprland`, `uwsm`, `xdg-desktop-portal-hyprland`,
>   etc.) are **official Arch repo packages**, verified against this project's
>   `packages/pacman.txt`.
> - `aylurs-gtk-shell-git` and `libastal-*-git` AUR package names are taken from this
>   project's `packages/aur.txt` — **empirically confirmed** in use. Stable (non-git)
>   AUR equivalents may exist; check the AUR for current names.
> - `dart-sass` as the `sass` binary provider is **verified** from `pacman.txt` + AGS docs.
> - `ags types -d` command is **empirically verified** (see `docs/SETUP.md`).
> - Any package name you cannot confirm via `pacman -Si` or AUR search should be treated
>   as unverified — package names change.

---

## Package manager overview

| Source | Tool | Notes |
|--------|------|-------|
| Official repos | `pacman` | Ships with Arch / CachyOS |
| AUR | `paru` or `yay` | Pick one; they are interchangeable for all commands here |

CachyOS ships `paru` preinstalled. On a plain Arch base, install an AUR helper first
(bootstrap from `makepkg` or the AUR helper's own PKGBUILD).

---

## Core stack — official repos (pacman)

```sh
sudo pacman -S --needed \
  hyprland \
  uwsm \
  xdg-desktop-portal-hyprland \
  hyprpaper \
  hyprlock \
  hypridle \
  hyprpicker \
  hyprpolkitagent \
  dart-sass
```

`dart-sass` provides the `sass` binary. AGS uses it to compile `.scss` files at runtime
— it is a **build-time dependency of the shell**, not just a dev tool.

---

## AGS and Astal service libs — AUR

```sh
paru -S --needed \
  aylurs-gtk-shell-git \
  libastal-wireplumber-git \
  libastal-apps-git \
  libastal-notifd-git \
  libastal-bluetooth-git \
  libastal-network-git \
  libastal-battery-git \
  libastal-mpris-git
```

Or with yay (identical flags):

```sh
yay -S --needed aylurs-gtk-shell-git libastal-notifd-git ...
```

### Package name notes

| Package | Status |
|---------|--------|
| `aylurs-gtk-shell-git` | AUR; `-git` tracks the main branch. A stable `aylurs-gtk-shell` may exist — check the AUR |
| `libastal-*-git` | AUR; one package per Astal service library |

The `-git` variants always reflect the latest upstream commit. Prefer `-git` on a
rolling Arch base where mismatched versions cause GObject introspection failures.

### What `aylurs-gtk-shell-git` pulls in

The AGS metapackage pulls in the core Astal runtime (`libastal4`) and the `ags` CLI
binary. Service libraries (`libastal-notifd-git`, etc.) are separate packages — install
only what your widgets use.

---

## Wayland utilities — official repos

```sh
sudo pacman -S --needed \
  grim slurp \
  wl-clipboard \
  cliphist \
  brightnessctl \
  playerctl \
  pipewire pipewire-pulse wireplumber
```

---

## Post-install: generate GObject type stubs

AGS v3 uses TypeScript. The GObject introspection type stubs are **not committed** to
version control (they are generated from the installed libraries and are user-specific).
After installing or updating AGS/Astal packages, regenerate them:

```sh
ags types -d ~/.config/ags
```

This writes `.d.ts` files into `~/.config/ags` (or the path you pass) so your editor
and TypeScript compiler can resolve `gi://AstalNotifd`, `gi://Astal`, etc.

Re-run this command after any `paru -Su` that updates AGS or Astal packages.

---

## Dotfiles install pattern

The typical pattern for dotfiles that manage an AGS shell:

```
dotfiles/
├── install.sh              # bootstrap: installs packages + symlinks configs
├── packages/
│   ├── pacman.txt          # official-repo packages, one per line
│   └── aur.txt             # AUR packages, one per line
└── config/
    └── ags/                # symlinked to ~/.config/ags by install.sh
```

### install.sh pattern

```sh
# Install official packages (strip comments + blank lines)
awk '{ sub(/#.*$/, ""); if (NF) print $1 }' packages/pacman.txt \
    | xargs -r sudo pacman -S --needed --noconfirm

# Install AUR packages (try paru first, fall back to yay)
for h in paru yay; do
    command -v "$h" >/dev/null 2>&1 && { AUR_HELPER="$h"; break; }
done
awk '{ sub(/#.*$/, ""); if (NF) print $1 }' packages/aur.txt \
    | xargs -r "$AUR_HELPER" -S --needed --noconfirm

# Symlink config/ entries into ~/.config/
for entry in config/*; do
    ln -sfn "$(realpath "$entry")" "$HOME/.config/$(basename "$entry")"
done
```

### Symlinking vs copying

Prefer symlinks — edits in the repo are immediately live, and `git diff` shows all
changes without a sync step. Each top-level directory under `config/` becomes a symlink
in `~/.config/`.

---

## Swaync removal (important for notification daemon)

If swaync is installed, its `Type=dbus` systemd unit can D-Bus–activate it and steal
`org.freedesktop.Notifications` from AstalNotifd. Either uninstall it or mask the unit:

```sh
sudo pacman -R swaync                           # remove
# or
systemctl --user mask swaync.service            # keep installed but prevent D-Bus activation
```

See `references/notification-daemon.md` for the full explanation.

---

## Common upgrade issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `gi://AstalNotifd` import fails | Stale type stubs | `ags types -d ~/.config/ags` |
| Type errors after `paru -Su` | New Astal API; stubs need regeneration | Same as above |
| SCSS fails to compile | `dart-sass` not installed or wrong `sass` binary | `which sass` → ensure it's `dart-sass`, not `ruby-sass` |
| Layer surface not appearing | `xdg-desktop-portal-hyprland` missing | Install and check `systemctl --user status xdg-desktop-portal-hyprland` |
