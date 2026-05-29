// lib/launcher-history.ts — JSON recency store for the launcher (REQ-LH-01..04)
//
// Exports:
//   RecentEntry   { id: string; name: string; icon?: string; ts: number }
//   readRecents(): RecentEntry[]
//   recordLaunch(app): void
//   getRecent(limit: number): string[]   — returns entry IDs, MRU first
//
// Storage: $XDG_STATE_HOME/ags/launcher-recents.json (default ~/.local/state/ags/)
// Atomic write: write to .tmp then Gio.File.move(OVERWRITE) — never write direct.
// Imports: only GLib and Gio — no JSX, no Gtk.

import GLib from "gi://GLib"
import Gio from "gi://Gio"

export type RecentEntry = {
  id:    string
  name:  string
  icon?: string
  ts:    number
}

const MAX_ENTRIES = 8

function historyPath(): string {
  return GLib.get_user_state_dir() + "/ags/launcher-recents.json"
}

function historyDir(): string {
  return GLib.get_user_state_dir() + "/ags"
}

// In-memory cache so repeated calls in one session are cheap.
// Invalidated by getRecent() so re-opens get a fresh disk read.
let _cache: RecentEntry[] | null = null

function readFromDisk(): RecentEntry[] {
  try {
    const path = historyPath()
    const file = Gio.File.new_for_path(path)
    const [ok, bytes] = file.load_contents(null)
    if (!ok) return []
    const text = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return []
    return parsed as RecentEntry[]
  } catch {
    return []
  }
}

export function readRecents(): RecentEntry[] {
  if (_cache !== null) return _cache
  _cache = readFromDisk()
  return _cache
}

function writeRecents(entries: RecentEntry[]): void {
  try {
    const dir = historyDir()
    GLib.mkdir_with_parents(dir, 0o755)

    const json = JSON.stringify(entries, null, 2)
    const encoded = new TextEncoder().encode(json)
    const tmp  = historyPath() + ".tmp"
    const dest = historyPath()

    // Write to .tmp — atomic on most filesystems.
    const tmpFile = Gio.File.new_for_path(tmp)
    tmpFile.replace_contents(
      encoded,
      null,
      false,
      Gio.FileCreateFlags.REPLACE_DESTINATION,
      null,
    )

    // Rename .tmp → dest so the durable name is only ever a complete file.
    const destFile = Gio.File.new_for_path(dest)
    tmpFile.move(destFile, Gio.FileCopyFlags.OVERWRITE, null, null)

    // Update in-memory cache.
    _cache = entries
  } catch {
    // Silently ignore write failures — recents are non-critical.
  }
}

/**
 * Record an app launch. Dedupes by id, moves entry to front, caps at MAX_ENTRIES.
 * app argument accepts any AstalApps.Application-compatible object.
 * The `entry` property is the .desktop filename key — used as the dedupe id.
 */
export function recordLaunch(app: {
  name: string
  iconName?: string
  entry?: string
  executable?: string
}): void {
  const id = (app.entry ?? app.executable ?? app.name).toString()
  const entry: RecentEntry = {
    id,
    name:  app.name,
    icon:  app.iconName,
    ts:    Date.now(),
  }

  const existing = readRecents().filter(e => e.id !== id)
  const updated  = [entry, ...existing].slice(0, MAX_ENTRIES)
  writeRecents(updated)
}

/**
 * Returns up to `limit` entry IDs from the history, most-recent-first.
 * Invalidates the in-memory cache so a fresh disk read happens, ensuring
 * re-opening the launcher always reflects the latest persisted state.
 * Never throws; returns [] on any error.
 */
export function getRecent(limit: number): string[] {
  try {
    // Invalidate cache — force re-read from disk on each call.
    _cache = null
    return readRecents().slice(0, limit).map(e => e.id)
  } catch {
    return []
  }
}
