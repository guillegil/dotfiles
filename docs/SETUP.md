# SETUP.md

System-level setup for this machine. The dotfiles in this repo (symlinked by
`install.sh`) cover everything under `~/.config`. **They do not cover system
state** — drivers, services, firewall, groups, bootloader. This file documents
that part, so the repo alone is enough to rebuild the machine.

Target OS: **CachyOS** (Arch-based). Two contexts are covered:
- **VM** — CachyOS inside QEMU/KVM, used for development.
- **Bare metal** — the Lenovo Yoga Pro 9 16IAH10 (hybrid Intel + NVIDIA).

---

## 1. Base install

1. Install CachyOS from the ISO. Choose a **minimal profile** (no preinstalled
   desktop) — the desktop is built from this repo.
2. Firmware mode: **UEFI**. Bootloader: **systemd-boot**.
3. Create your user during install.

## 2. Clone the repo and run the installer

```sh
git clone <your-repo-url> ~/dotfiles
cd ~/dotfiles
chmod +x install.sh
./install.sh
```

This installs all packages (`packages/pacman.txt`, `packages/aur.txt`) and
symlinks every folder in `config/` into `~/.config/`.

`install.sh` needs an AUR helper for `aur.txt`. CachyOS ships `paru`
preinstalled; on a plain Arch base, install one first.

## 3. Services to enable

Not covered by dotfiles — enable explicitly:

```sh
sudo systemctl enable --now sshd          # SSH access
# add others here as they are introduced
```

## 4. Firewall

CachyOS enables **UFW** by default (deny incoming, allow outgoing). Allow what
you need — at minimum SSH if you connect to this machine:

```sh
sudo ufw allow ssh
```

Rule of thumb: if a networked service works locally but not from another
machine, check `ufw` first — the symptom is a connection *timeout*.

## 5. User groups

```sh
sudo usermod -aG video,input $USER        # desktop / input access
# on a virtualization host also: libvirt,kvm
```

Log out and back in for group changes to apply.

## 6. Graphics

### VM (QEMU/KVM guest)

Install guest integration (already in `pacman.txt`):

```sh
sudo systemctl enable --now spice-vdagent
sudo systemctl enable --now qemu-guest-agent
```

3D acceleration is configured **on the host**, not here — see the project's
Notion page *Virtual Machine Setup* for the full host-side QEMU/KVM
configuration and caveats.

### Bare metal (Lenovo Yoga Pro 9 — hybrid Intel + NVIDIA)

This laptop has an Intel iGPU + NVIDIA RTX 5060 (Blackwell, 50-series).

- NVIDIA 50-series **requires the open kernel modules** — install
  `nvidia-open` (or `nvidia-open-dkms`) with a recent driver, plus `nvidia-utils`.
- Follow the current **Hyprland NVIDIA wiki** page for the required kernel
  parameters and environment variables — it changes with driver releases:
  https://wiki.hypr.land/Nvidia/
- Environment variables for Hyprland go in **`~/.config/uwsm/env`**, *not* in
  `hyprland.lua`.

## 7. Launching Hyprland

- Log in at the TTY and run `start-hyprland` (not bare `Hyprland`; never over
  SSH — a compositor needs a real display/seat).
- Optional auto-start on TTY1 — already handled if `config/fish` is linked;
  otherwise add to `~/.config/fish/config.fish`:

```fish
if status is-login; and test (tty) = /dev/tty1
    exec start-hyprland
end
```

## 8. AGS (the shell)

After install, regenerate the GObject typings (these are **not** committed —
see `.gitignore`):

```sh
ags types -d ~/.config/ags
```

Run the shell with `ags run`; it is also started by the Hyprland autostart
block in `hyprland.lua`.

## 9. Secrets

API tokens (Todoist, Google Calendar, etc.) and SSH keys are **never** committed
to this repo. Store them outside version control, e.g.:

- SSH keys: `~/.ssh/` (default).
- API tokens: an untracked file such as `~/.config/secrets.env`, sourced by the
  scripts/widgets that need them.

Document *which* secrets are required here as widgets are built:

- _(none yet)_

## 10. Post-install checklist

- [ ] `install.sh` ran — packages installed, configs symlinked
- [ ] `sshd` enabled, `ufw allow ssh` done
- [ ] user added to required groups, re-logged-in
- [ ] graphics: guest agent (VM) **or** NVIDIA drivers + env (bare metal)
- [ ] `ags types -d ~/.config/ags` run
- [ ] `start-hyprland` brings up the session
- [ ] bar, microphone widget and launcher (Super+R) all work

---

_See the project's Notion workspace (`CachyOS + Hyprland Dev Environment`) for
the detailed narrative, the hardware inventory, and the full virt-manager
setup with caveats._