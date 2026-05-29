#!/usr/bin/env bash
#
# install.sh — bootstrap script for the Hyprland dotfiles repo.
#
# What it does:
#   - symlinks everything under  config/  into  ~/.config/
#   - (optionally) installs packages listed in  packages/pacman.txt / aur.txt
#   - backs up any existing real files before replacing them
#
# Usage:
#   ./install.sh              # link configs + install packages
#   ./install.sh --link-only  # only create the symlinks
#   ./install.sh --packages   # only install packages
#   ./install.sh --help

set -euo pipefail

# --- paths -----------------------------------------------------------------

DOTFILES="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_SRC="$DOTFILES/config"
CONFIG_DEST="${XDG_CONFIG_HOME:-$HOME/.config}"
BACKUP_DIR="$HOME/.dotfiles-backup/$(date +%Y%m%d-%H%M%S)"

PACMAN_LIST="$DOTFILES/packages/pacman.txt"
AUR_LIST="$DOTFILES/packages/aur.txt"

DO_LINK=1
DO_PACKAGES=1

# --- helpers ---------------------------------------------------------------

c_info()  { printf '\033[1;34m::\033[0m %s\n' "$*"; }
c_ok()    { printf '\033[1;32m ok\033[0m %s\n' "$*"; }
c_warn()  { printf '\033[1;33m  !\033[0m %s\n' "$*"; }
c_err()   { printf '\033[1;31m  x\033[0m %s\n' "$*" >&2; }

usage() {
    sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 0
}

# --- argument parsing ------------------------------------------------------

for arg in "$@"; do
    case "$arg" in
        --link-only)  DO_PACKAGES=0 ;;
        --packages)   DO_LINK=0 ;;
        --help|-h)    usage ;;
        *) c_err "unknown option: $arg"; exit 1 ;;
    esac
done

# --- package installation --------------------------------------------------

install_packages() {
    c_info "Installing packages"

    if ! command -v pacman >/dev/null 2>&1; then
        c_err "pacman not found — this script targets Arch / CachyOS."
        exit 1
    fi

    # Official repositories
    if [[ -f "$PACMAN_LIST" ]]; then
        c_info "pacman packages from $(basename "$PACMAN_LIST")"
        # awk strips inline comments and blank lines; --needed skips installed pkgs
        awk '{ sub(/#.*$/, ""); if (NF) print $1 }' "$PACMAN_LIST" \
            | xargs -r sudo pacman -S --needed --noconfirm
        c_ok "official-repo packages done"
    else
        c_warn "no $PACMAN_LIST — skipping official packages"
    fi

    # AUR
    if [[ -f "$AUR_LIST" ]]; then
        local helper=""
        for h in paru yay; do
            command -v "$h" >/dev/null 2>&1 && { helper="$h"; break; }
        done

        if [[ -z "$helper" ]]; then
            c_warn "no AUR helper (paru/yay) found — skipping AUR packages"
        else
            c_info "AUR packages via $helper from $(basename "$AUR_LIST")"
            awk '{ sub(/#.*$/, ""); if (NF) print $1 }' "$AUR_LIST" \
                | xargs -r "$helper" -S --needed --noconfirm
            c_ok "AUR packages done"
        fi
    else
        c_warn "no $AUR_LIST — skipping AUR packages"
    fi
}

# --- system services -------------------------------------------------------

write_sddm_default_session() {
    local drop_in="/etc/sddm.conf.d/10-default-session.conf"
    local expected
    expected="$(printf '[General]\nDefaultSession=hyprland-uwsm.desktop\n\n[Autologin]\nSession=hyprland-uwsm.desktop\n')"

    if [[ -f "$drop_in" && "$(sudo cat "$drop_in")" == "$expected" ]]; then
        c_ok "SDDM drop-in already up to date — skipped."
        return 1
    fi

    printf '%s' "$expected" | sudo install -D -m 0644 /dev/stdin "$drop_in"
    c_ok "SDDM default session set to hyprland-uwsm.desktop."
    return 0
}

enable_hyprpolkitagent() {
    if ! pacman -Q hyprpolkitagent >/dev/null 2>&1; then
        c_warn "hyprpolkitagent not installed — skipping user-unit enable"
        return 0
    fi

    if ! systemctl --user show-environment >/dev/null 2>&1; then
        c_warn "user bus unreachable — run 'systemctl --user enable hyprpolkitagent.service' after first login"
        return 0
    fi

    systemctl --user enable hyprpolkitagent.service
    c_ok "enabled hyprpolkitagent.service"
}

enable_services() {
    c_info "Enabling system services"

    if ! command -v systemctl >/dev/null 2>&1; then
        c_warn "systemctl not found — skipping service enabling"
        return
    fi

    # Display manager — needed to actually log into Hyprland
    if pacman -Q sddm >/dev/null 2>&1; then
        local first_time_uwsm=1
        write_sddm_default_session && first_time_uwsm=0

        if systemctl is-enabled sddm.service >/dev/null 2>&1; then
            c_ok "sddm.service already enabled"
        else
            sudo systemctl enable sddm.service
            c_ok "enabled sddm.service"
        fi

        enable_hyprpolkitagent

        if (( first_time_uwsm == 0 )); then
            c_warn "Log out and back in to switch to the uwsm-managed Hyprland session."
        fi
    else
        c_warn "sddm not installed — skipping enable"
    fi
}

# --- symlinking ------------------------------------------------------------

link_one() {
    # $1 = source path in repo, $2 = destination path on system
    local src="$1" dest="$2"

    # Already the correct symlink — nothing to do.
    if [[ -L "$dest" && "$(readlink -f "$dest")" == "$(readlink -f "$src")" ]]; then
        c_ok "linked  $dest"
        return
    fi

    # Something else is there — back it up.
    if [[ -e "$dest" || -L "$dest" ]]; then
        mkdir -p "$BACKUP_DIR"
        mv "$dest" "$BACKUP_DIR/"
        c_warn "backed up existing $dest -> $BACKUP_DIR/"
    fi

    mkdir -p "$(dirname "$dest")"
    ln -s "$src" "$dest"
    c_ok "linked  $dest"
}

link_configs() {
    c_info "Linking configs from $CONFIG_SRC into $CONFIG_DEST"

    if [[ ! -d "$CONFIG_SRC" ]]; then
        c_err "no config/ directory in repo — nothing to link."
        exit 1
    fi

    # Symlink each top-level entry under config/ (hypr, ags, kitty, ...)
    for entry in "$CONFIG_SRC"/*; do
        [[ -e "$entry" ]] || continue
        link_one "$entry" "$CONFIG_DEST/$(basename "$entry")"
    done

    c_ok "config linking complete"
}

# Install bundled custom symbolic icons (e.g. arch-symbolic for the launcher
# pill) into the user hicolor theme so GTK can resolve them by name + recolor.
install_icons() {
    local src="$CONFIG_SRC/ags/assets"
    [[ -d "$src" ]] || return 0
    local dest="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/scalable/actions"
    mkdir -p "$dest"
    local found=0
    for svg in "$src"/*-symbolic.svg; do
        [[ -e "$svg" ]] || continue
        cp -f "$svg" "$dest/"
        found=1
    done
    (( found )) || return 0
    command -v gtk-update-icon-cache >/dev/null 2>&1 \
        && gtk-update-icon-cache -f -t "${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor" 2>/dev/null
    c_ok "custom symbolic icons installed"
}

# --- main ------------------------------------------------------------------

c_info "Dotfiles repo: $DOTFILES"

(( DO_PACKAGES )) && install_packages
(( DO_PACKAGES )) && enable_services
(( DO_LINK ))     && link_configs
(( DO_LINK ))     && install_icons

if [[ -d "$BACKUP_DIR" ]]; then
    c_info "Replaced files were backed up to: $BACKUP_DIR"
fi

c_info "Done. Log out / restart Hyprland to apply."