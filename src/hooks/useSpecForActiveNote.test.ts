import { describe, expect, it } from 'vitest'
import { deriveSpecMeta } from './useSpecForActiveNote'
import type { VaultEntry } from '@/types'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: '/vault/x.md',
    filename: 'x.md',
    title: 'x',
    isA: null,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: null,
    createdAt: null,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: false,
    ...overrides,
  }
}

describe('deriveSpecMeta', () => {
  it('returns null for non-spec entries', () => {
    expect(deriveSpecMeta(entry({ isA: 'Note' }))).toBeNull()
    expect(deriveSpecMeta(entry({ isA: null }))).toBeNull()
    expect(deriveSpecMeta(null)).toBeNull()
  })

  it('returns null when isA is a spec type but id is missing', () => {
    expect(deriveSpecMeta(entry({ isA: 'requirement' }))).toBeNull()
  })

  it('returns null when id is malformed', () => {
    expect(
      deriveSpecMeta(
        entry({ isA: 'requirement', properties: { id: 'not-a-spec-id' } }),
      ),
    ).toBeNull()
  })

  it('extracts a full requirement', () => {
    const meta = deriveSpecMeta(
      entry({
        isA: 'requirement',
        status: 'draft',
        properties: {
          id: 'REQ:auth/session-expiry',
          level: 'MUST',
        },
        relationships: {
          refines: ['REQ:auth/session-management#c-lifetime'],
          related: ['INV:auth/no-stale-tokens'],
        },
      }),
    )
    expect(meta).toEqual({
      id: 'REQ:auth/session-expiry',
      entityType: 'requirement',
      status: 'draft',
      level: 'MUST',
      progress: undefined,
      owners: [],
      refines: ['REQ:auth/session-management#c-lifetime'],
      related: ['INV:auth/no-stale-tokens'],
      categorizedUnder: [],
    })
  })

  it('extracts a task with progress', () => {
    const meta = deriveSpecMeta(
      entry({
        isA: 'spec-task',
        properties: { id: 'TASK:work/foo', progress: 'in-progress' },
      }),
    )
    expect(meta?.entityType).toBe('spec-task')
    expect(meta?.progress).toBe('in-progress')
  })

  it('accepts categorized_under via several frontmatter casings', () => {
    const meta = deriveSpecMeta(
      entry({
        isA: 'requirement',
        properties: { id: 'REQ:foo/bar' },
        relationships: { 'Categorized under': ['TOPIC:topics/auth'] },
      }),
    )
    expect(meta?.categorizedUnder).toEqual(['TOPIC:topics/auth'])
  })
})
