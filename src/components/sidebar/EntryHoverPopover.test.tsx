import { fireEvent, render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { VaultEntry } from '../../types'
import { EntryHoverPopover, HOVER_OPEN_DELAY_MS } from './EntryHoverPopover'

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

describe('EntryHoverPopover', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function specEntry(): VaultEntry {
    return makeEntry({
      path: '/v/.specs/auth.md',
      title: 'auth/session-expiry',
      isA: 'requirement',
      properties: {
        id: 'REQ:auth/session-expiry',
        status: 'accepted',
        level: 'MUST',
        version: '1.2.0',
      },
      relationships: {
        owners: ['security'],
        refines: ['REQ:auth/login'],
        related: ['INV:auth/token'],
      },
    })
  }

  it('does not open immediately on pointer enter', () => {
    render(
      <EntryHoverPopover entry={specEntry()}>
        <span data-testid="trigger">title</span>
      </EntryHoverPopover>,
    )

    fireEvent.pointerEnter(screen.getByTestId('trigger').parentElement!)
    expect(screen.queryByTestId('entry-hover-content')).toBeNull()
  })

  it('opens after the hover delay and shows expected frontmatter fields', () => {
    render(
      <EntryHoverPopover entry={specEntry()}>
        <span data-testid="trigger">title</span>
      </EntryHoverPopover>,
    )

    const wrapper = screen.getByTestId('trigger').parentElement!
    fireEvent.pointerEnter(wrapper)
    act(() => {
      vi.advanceTimersByTime(HOVER_OPEN_DELAY_MS + 10)
    })

    const content = screen.getByTestId('entry-hover-content')
    expect(content).toHaveTextContent('requirement')
    expect(content).toHaveTextContent('accepted')
    expect(content).toHaveTextContent('MUST')
    expect(content).toHaveTextContent('1.2.0')
    expect(content).toHaveTextContent('security')
    expect(content).toHaveTextContent('REQ:auth/login')
    expect(content).toHaveTextContent('INV:auth/token')
  })

  it('cancels opening when the pointer leaves before the delay elapses', () => {
    render(
      <EntryHoverPopover entry={specEntry()}>
        <span data-testid="trigger">title</span>
      </EntryHoverPopover>,
    )

    const wrapper = screen.getByTestId('trigger').parentElement!
    fireEvent.pointerEnter(wrapper)
    act(() => {
      vi.advanceTimersByTime(50)
    })
    fireEvent.pointerLeave(wrapper)
    act(() => {
      vi.advanceTimersByTime(HOVER_OPEN_DELAY_MS + 100)
    })

    expect(screen.queryByTestId('entry-hover-content')).toBeNull()
  })

  it('omits empty frontmatter fields', () => {
    const entry = makeEntry({
      path: '/v/.specs/x.md',
      title: 'plain',
      isA: 'invariant',
      properties: { id: 'INV:auth/x', status: 'draft' },
    })

    render(
      <EntryHoverPopover entry={entry}>
        <span data-testid="trigger">title</span>
      </EntryHoverPopover>,
    )

    fireEvent.pointerEnter(screen.getByTestId('trigger').parentElement!)
    act(() => {
      vi.advanceTimersByTime(HOVER_OPEN_DELAY_MS + 10)
    })

    const content = screen.getByTestId('entry-hover-content')
    expect(content).not.toHaveTextContent('owners')
    expect(content).not.toHaveTextContent('progress')
    expect(content).not.toHaveTextContent('refines')
  })
})
