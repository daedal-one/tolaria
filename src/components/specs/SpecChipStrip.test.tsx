import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpecChipStrip } from './SpecChipStrip'
import type { VaultEntry } from '@/types'

function makeEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/specs/req.md',
    filename: 'req.md',
    title: 'A spec',
    isA: 'requirement',
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
    organized: true,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {
      id: 'REQ:auth/session-expiry',
      status: 'accepted',
      level: 'MUST',
    },
    hasH1: false,
    ...overrides,
  }
}

describe('SpecChipStrip', () => {
  it('renders nothing when the entry is not a spec', () => {
    const { container } = render(
      <SpecChipStrip entry={makeEntry({ isA: 'Note', properties: {} })} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders id, status, and level for a requirement', () => {
    render(<SpecChipStrip entry={makeEntry()} />)
    expect(screen.getByTestId('spec-chip-strip')).toBeInTheDocument()
    expect(screen.getByTestId('spec-id-chip')).toHaveTextContent('REQ:auth/session-expiry')
    expect(screen.getByText('accepted')).toBeInTheDocument()
    expect(screen.getByText('MUST')).toBeInTheDocument()
  })

  it('renders progress badge for a spec-task and no level badge', () => {
    render(
      <SpecChipStrip
        entry={makeEntry({
          isA: 'spec-task',
          properties: {
            id: 'TASK:auth/wire-it',
            progress: 'in-progress',
          },
        })}
      />,
    )
    expect(screen.getByText('in-progress')).toBeInTheDocument()
    expect(screen.queryByText('MUST')).not.toBeInTheDocument()
  })

  it('shows owners label when owners are present', () => {
    render(
      <SpecChipStrip
        entry={makeEntry({
          relationships: { owners: ['alice', 'bob'] },
        })}
      />,
    )
    expect(screen.getByTestId('spec-owners-label')).toHaveTextContent('alice, bob')
  })

  it('returns null when the entry is null', () => {
    const { container } = render(<SpecChipStrip entry={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
