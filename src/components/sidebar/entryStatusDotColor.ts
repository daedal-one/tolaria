import type { VaultEntry } from '../../types'
import { deriveSpecMeta, type SpecMeta } from '../../hooks/useSpecForActiveNote'

/** Solid CSS colors for the 6px status dot. The values resolve to CSS
 *  variables so the palette stays themable. */
const STATUS_DOT_COLOR: Record<string, string> = {
  draft: 'var(--spec-status-draft)',
  accepted: 'var(--spec-status-accepted)',
  deprecated: 'var(--spec-status-deprecated)',
  superseded: 'var(--spec-status-superseded)',
}

const LEVEL_DOT_COLOR: Record<string, string> = {
  MUST: 'var(--spec-level-must)',
  SHOULD: 'var(--spec-level-should)',
  MAY: 'var(--spec-level-may)',
  INFO: 'var(--spec-level-info)',
}

const PROGRESS_DOT_COLOR: Record<string, string> = {
  pending: 'var(--spec-progress-pending)',
  'in-progress': 'var(--spec-progress-in-progress)',
  done: 'var(--spec-progress-done)',
  blocked: 'var(--spec-progress-blocked)',
  deferred: 'var(--spec-progress-deferred)',
  wontdo: 'var(--spec-progress-wontdo)',
}

const DEFAULT_DOT_COLOR = 'var(--spec-status-default)'

function colorForTask(meta: SpecMeta): string {
  if (meta.progress && PROGRESS_DOT_COLOR[meta.progress]) {
    return PROGRESS_DOT_COLOR[meta.progress]
  }
  return DEFAULT_DOT_COLOR
}

function colorForEntity(meta: SpecMeta): string {
  if (meta.status && STATUS_DOT_COLOR[meta.status]) {
    return STATUS_DOT_COLOR[meta.status]
  }
  if (meta.level && LEVEL_DOT_COLOR[meta.level]) {
    return LEVEL_DOT_COLOR[meta.level]
  }
  return DEFAULT_DOT_COLOR
}

/**
 * Resolve the dot color for a vault entry. Returns null for entries that are
 * not forge-spec notes (the caller should render nothing in that case).
 */
export function getEntryStatusDotColor(entry: VaultEntry): string | null {
  const meta = deriveSpecMeta(entry)
  if (!meta) return null
  return meta.entityType === 'spec-task' ? colorForTask(meta) : colorForEntity(meta)
}
