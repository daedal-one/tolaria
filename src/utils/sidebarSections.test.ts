import { describe, it, expect } from 'vitest'
import type { VaultEntry } from '../types'
import {
  buildAuxRootSections,
  buildDynamicSections,
} from './sidebarSections'

const NOW = Math.floor(Date.now() / 1000)

function makeEntry(overrides: Partial<VaultEntry> & { path: string; title: string }): VaultEntry {
  return {
    path: overrides.path,
    filename: overrides.path.split('/').pop() ?? overrides.path,
    title: overrides.title,
    isA: null,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: NOW,
    createdAt: NOW,
    fileSize: 100,
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
    outgoingLinks: [],
    properties: {},
    listPropertiesDisplay: [],
    hasH1: false,
    fileKind: 'markdown',
    ...overrides,
  }
}

describe('buildDynamicSections — aux-root filtering', () => {
  it('excludes entries that carry a rootLabel from regular type-based sections', () => {
    const entries: VaultEntry[] = [
      makeEntry({ path: '/vault/Project.md', title: 'Project A', isA: 'Project' }),
      makeEntry({
        path: '/vault/.specs/requirements/auth.md',
        title: 'auth/session-expiry',
        isA: 'requirement',
        rootLabel: 'specs',
      }),
    ]

    const sections = buildDynamicSections(entries, {})
    const types = sections.map((s) => s.type)

    expect(types).toContain('Project')
    expect(types).not.toContain('requirement')
  })

  it('returns regular sections unchanged when no entry has a rootLabel', () => {
    const entries: VaultEntry[] = [
      makeEntry({ path: '/vault/p.md', title: 'P', isA: 'Project' }),
      makeEntry({ path: '/vault/e.md', title: 'E', isA: 'Experiment' }),
    ]

    const sections = buildDynamicSections(entries, {})
    expect(sections.map((s) => s.type).sort()).toEqual(['Experiment', 'Project'])
  })
})

describe('buildAuxRootSections', () => {
  it('returns no sections when no entries carry a rootLabel', () => {
    const entries: VaultEntry[] = [
      makeEntry({ path: '/vault/p.md', title: 'P', isA: 'Project' }),
    ]
    expect(buildAuxRootSections(entries, {})).toEqual([])
  })

  it('groups aux-root entries by rootLabel, then sub-groups by isA', () => {
    const entries: VaultEntry[] = [
      makeEntry({
        path: '/vault/.specs/r/a.md',
        title: 'auth/a',
        isA: 'requirement',
        rootLabel: 'specs',
      }),
      makeEntry({
        path: '/vault/.specs/r/b.md',
        title: 'auth/b',
        isA: 'requirement',
        rootLabel: 'specs',
      }),
      makeEntry({
        path: '/vault/.specs/i/c.md',
        title: 'auth/c',
        isA: 'invariant',
        rootLabel: 'specs',
      }),
    ]

    const aux = buildAuxRootSections(entries, {})

    expect(aux).toHaveLength(1)
    expect(aux[0].rootLabel).toBe('specs')
    expect(aux[0].label).toBe('specs')
    expect(aux[0].subGroups.map((g) => g.type).sort()).toEqual(['invariant', 'requirement'])
    const req = aux[0].subGroups.find((g) => g.type === 'requirement')
    expect(req?.entries).toHaveLength(2)
    expect(req?.entries.map((e) => e.title).sort()).toEqual(['auth/a', 'auth/b'])
  })

  it('keeps aux-root sections separate per distinct rootLabel', () => {
    const entries: VaultEntry[] = [
      makeEntry({
        path: '/vault/.specs/r.md',
        title: 'r1',
        isA: 'requirement',
        rootLabel: 'specs',
      }),
      makeEntry({
        path: '/vendor/.contracts/c.md',
        title: 'c1',
        isA: 'invariant',
        rootLabel: 'contracts',
      }),
    ]

    const aux = buildAuxRootSections(entries, {})
    expect(aux.map((s) => s.rootLabel).sort()).toEqual(['contracts', 'specs'])
  })

  it('skips archived aux-root entries', () => {
    const entries: VaultEntry[] = [
      makeEntry({
        path: '/vault/.specs/a.md',
        title: 'live',
        isA: 'requirement',
        rootLabel: 'specs',
      }),
      makeEntry({
        path: '/vault/.specs/b.md',
        title: 'gone',
        isA: 'requirement',
        rootLabel: 'specs',
        archived: true,
      }),
    ]

    const aux = buildAuxRootSections(entries, {})
    const req = aux[0].subGroups.find((g) => g.type === 'requirement')
    expect(req?.entries.map((e) => e.title)).toEqual(['live'])
  })
})
