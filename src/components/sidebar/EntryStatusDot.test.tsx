import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { VaultEntry } from '../../types'
import { EntryStatusDot } from './EntryStatusDot'
import { getEntryStatusDotColor } from './entryStatusDotColor'

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

describe('getEntryStatusDotColor', () => {
  it('returns null for non-spec entries', () => {
    const entry = makeEntry({ path: '/v/p.md', title: 'P', isA: 'Project' })
    expect(getEntryStatusDotColor(entry)).toBeNull()
  })

  it('returns a color for a requirement entry with a status', () => {
    const entry = makeEntry({
      path: '/v/.specs/r.md',
      title: 'r',
      isA: 'requirement',
      properties: { id: 'REQ:auth/x', status: 'accepted' },
    })
    expect(getEntryStatusDotColor(entry)).toBe('var(--spec-status-accepted)')
  })

  it('falls back to level color when status is missing on a requirement', () => {
    const entry = makeEntry({
      path: '/v/.specs/r.md',
      title: 'r',
      isA: 'requirement',
      properties: { id: 'REQ:auth/x', level: 'MUST' },
    })
    expect(getEntryStatusDotColor(entry)).toBe('var(--spec-level-must)')
  })

  it('uses progress color for spec-task entries', () => {
    const entry = makeEntry({
      path: '/v/.specs/t.md',
      title: 't',
      isA: 'spec-task',
      properties: { id: 'TASK:auth/x', progress: 'in-progress' },
    })
    expect(getEntryStatusDotColor(entry)).toBe('var(--spec-progress-in-progress)')
  })

  it('returns a fallback color when nothing is recognized but the entry is a spec', () => {
    const entry = makeEntry({
      path: '/v/.specs/r.md',
      title: 'r',
      isA: 'requirement',
      properties: { id: 'REQ:auth/x' },
    })
    expect(getEntryStatusDotColor(entry)).toBe('var(--spec-status-default)')
  })
})

describe('EntryStatusDot', () => {
  it('renders nothing for a non-spec entry', () => {
    const entry = makeEntry({ path: '/v/p.md', title: 'P', isA: 'Project' })
    const { container } = render(<EntryStatusDot entry={entry} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a 6px dot for a spec entry', () => {
    const entry = makeEntry({
      path: '/v/.specs/r.md',
      title: 'r',
      isA: 'requirement',
      properties: { id: 'REQ:auth/x', status: 'accepted' },
    })
    const { container } = render(<EntryStatusDot entry={entry} />)
    const dot = container.querySelector('[data-testid="entry-status-dot"]') as HTMLElement | null
    expect(dot).not.toBeNull()
    expect(dot?.style.width).toBe('6px')
    expect(dot?.style.height).toBe('6px')
  })
})
