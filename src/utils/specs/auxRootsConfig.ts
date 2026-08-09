/**
 * Helpers for resolving forge-spec project roots for a vault. A repository's
 * local `.specs` directory is automatic; configured auxiliary roots map a
 * human-readable `label` (e.g. "Auth Specs") to an absolute directory path.
 * The frontend uses the resolved path as the `specsDir` argument to all
 * `spec_*` Tauri commands.
 *
 * Additional roots live in `<vault>/config/forge-spec.md`; the Tauri command
 * combines those entries with an implicit `<vault>/.specs` root.
 */
import type { VaultEntry } from '../../types'
import { resolveAuxRoots, type AuxRootEntry } from './api'

export type { AuxRootEntry }

/**
 * Synchronously check whether any vault entries are tagged with an aux-root
 * label. Used to gate the visibility of spec sidebar actions without a
 * Tauri round-trip.
 */
export function hasAuxRootEntries(entries: VaultEntry[]): boolean {
  return entries.some((entry) => typeof entry.rootLabel === 'string' && entry.rootLabel.length > 0)
}

/**
 * Pick a single primary spec root for the vault. Loads the resolved list via
 * the Tauri command, then returns the entry matching the optional `label`
 * (falling back to the first entry). Returns `null` when no aux root is
 * configured or when the command fails (e.g. running outside Tauri).
 */
export async function resolvePrimaryAuxRoot(
  vaultPath: string,
  label?: string,
): Promise<AuxRootEntry | null> {
  if (!vaultPath) return null
  try {
    const roots = await resolveAuxRoots(vaultPath)
    if (roots.length === 0) return null
    if (label) {
      const match = roots.find((root) => root.label === label)
      if (match) return match
    }
    return roots[0]
  } catch {
    return null
  }
}
