/**
 * Derive forge-spec metadata from a vault entry's frontmatter.
 *
 * Returns null for vault notes that aren't part of a forge-spec project
 * (no spec-style `type:` or no `id:` field). Pure derivation — does not
 * touch the IPC bridge. Callers that need spec-cli analyses (lint,
 * coverage) should fetch them separately via @/utils/specs/api.
 */

import { useMemo } from 'react'
import type { VaultEntry } from '@/types'

export type SpecEntityType =
  | 'requirement'
  | 'invariant'
  | 'interface'
  | 'adr'
  | 'glossary'
  | 'spec-topic'
  | 'scenario'
  | 'spec-task'

const SPEC_ENTITY_TYPES: ReadonlySet<string> = new Set<SpecEntityType>([
  'requirement',
  'invariant',
  'interface',
  'adr',
  'glossary',
  'spec-topic',
  'scenario',
  'spec-task',
])

export interface SpecMeta {
  /** Fully-qualified id, e.g. "REQ:auth/session-expiry". */
  id: string
  /** Lowercased entity type as recorded in frontmatter (`type:`). */
  entityType: SpecEntityType
  /** Lifecycle state for non-task entities (draft/accepted/deprecated/superseded). */
  status?: string
  /** RFC 2119 level for requirements (MUST/SHOULD/MAY/INFO). */
  level?: string
  /** Progress for tasks (pending/in-progress/done/blocked/deferred/wontdo). */
  progress?: string
  /** Semver-style version string. */
  version?: string
  /** Owner list (vault frontmatter stores arrays of strings). */
  owners: string[]
  /** Parent IDs this entity refines (clause-level anchors allowed). */
  refines: string[]
  /** Related entity IDs. */
  related: string[]
  /** Topic IDs this entity is categorized under. */
  categorizedUnder: string[]
}

const stringField = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const stringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string') return [value]
  return []
}

function isSpecEntityType(value: string): value is SpecEntityType {
  return SPEC_ENTITY_TYPES.has(value)
}

/**
 * Derive SpecMeta from a VaultEntry. Returns null when the entry is not
 * a forge-spec note.
 *
 * Recognition rules:
 *  - frontmatter `type:` matches a forge-spec entity type (lowercased), AND
 *  - frontmatter `id:` exists and looks like `TYPE:ns/slug` (uppercase prefix).
 *
 * Both conditions are required to avoid false positives on knowledge notes
 * that happen to set `type: Note` or carry a `specs:` field.
 */
export function deriveSpecMeta(entry: VaultEntry | null | undefined): SpecMeta | null {
  if (!entry) return null

  const rawType = entry.isA?.toLowerCase().trim()
  if (!rawType || !isSpecEntityType(rawType)) return null

  const props = entry.properties ?? {}
  const id = stringField(props.id)
  if (!id || !/^[A-Z]+:[A-Za-z0-9_-]+\/[A-Za-z0-9_./-]+$/.test(id)) return null

  const relationships = entry.relationships ?? {}

  return {
    id,
    entityType: rawType,
    status: stringField(props.status) ?? entry.status ?? undefined,
    level: stringField(props.level),
    progress: stringField(props.progress),
    version: stringField(props.version),
    owners: stringArray(relationships.owners ?? relationships.Owners ?? props.owners),
    refines: stringArray(relationships.refines ?? relationships.Refines ?? props.refines),
    related: stringArray(
      relationships.related ?? relationships.Related ?? props.related,
    ),
    categorizedUnder: stringArray(
      relationships.categorized_under ??
        relationships['Categorized under'] ??
        props.categorized_under,
    ),
  }
}

/** React hook wrapper around {@link deriveSpecMeta}. */
export function useSpecForActiveNote(entry: VaultEntry | null | undefined): SpecMeta | null {
  return useMemo(() => deriveSpecMeta(entry), [entry])
}
