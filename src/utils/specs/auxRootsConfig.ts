/**
 * Helpers for resolving the auxiliary-roots config (forge-spec projects)
 * configured for a vault. Auxiliary roots map a human-readable `label`
 * (e.g. "Auth Specs") to an absolute directory path on disk that holds the
 * spec files. The frontend uses the resolved path as the `specsDir`
 * argument to all `spec_*` Tauri commands.
 *
 * The source of truth lives in `<vault>/config/forge-spec.md`, parsed by the
 * `spec_resolve_aux_roots` Tauri command.
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
 * Pick a single primary aux root for the vault. Loads the resolved list via
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
