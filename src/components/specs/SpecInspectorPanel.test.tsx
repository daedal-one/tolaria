import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VaultEntry } from '@/types'
import { SpecInspectorPanel } from './SpecInspectorPanel'

vi.mock('@/utils/specs/api', () => ({
  getCoverage: vi.fn(),
  getLintResults: vi.fn(),
  listTasks: vi.fn(),
}))

import { getCoverage, getLintResults } from '@/utils/specs/api'

function makeEntry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: '/specs/req/example.md',
    filename: 'example.md',
    title: 'Example',
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

function makeRequirement(): VaultEntry {
  return makeEntry({
    path: '/specs/req/auth/session-expiry.md',
    isA: 'Requirement',
    properties: { id: 'REQ:auth/session-expiry' },
  })
}

function makeTask(): VaultEntry {
  return makeEntry({
    path: '/specs/task/auth/wire-expiry.md',
    isA: 'spec-task',
    properties: {
      id: 'TASK:auth/wire-expiry',
      progress: 'in-progress',
      assignee: 'alice',
      eta: '2026-06-01',
    },
    relationships: {
      blocked_by: ['REQ:auth/foo'],
    },
  })
}

function makePlainNote(): VaultEntry {
  return makeEntry({
    isA: 'Note',
    properties: { title: 'Plain' },
  })
}

beforeEach(() => {
  vi.mocked(getCoverage).mockReset()
  vi.mocked(getLintResults).mockReset()
  vi.mocked(getCoverage).mockResolvedValue([])
  vi.mocked(getLintResults).mockResolvedValue([])
})

describe('SpecInspectorPanel', () => {
  it('renders nothing when the entry is not a forge-spec note', () => {
    const { container } = render(
      <SpecInspectorPanel entry={makePlainNote()} specsDir="/proj/.specs" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when entry isA matches but id is missing', () => {
    const entry = makeEntry({ isA: 'Requirement', properties: {} })
    const { container } = render(
      <SpecInspectorPanel entry={entry} specsDir="/proj/.specs" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the panel header with spec id', async () => {
    render(
      <SpecInspectorPanel
        entry={makeRequirement()}
        specsDir="/proj/.specs"
      />,
    )
    expect(screen.getByTestId('spec-inspector-panel')).toBeInTheDocument()
    expect(screen.getByText('REQ:auth/session-expiry')).toBeInTheDocument()
    await waitFor(() => {
      expect(getCoverage).toHaveBeenCalledWith('/proj/.specs', 'REQ:auth/session-expiry')
    })
  })

  it('shows coverage section for requirements with rows and uncovered styling', async () => {
    vi.mocked(getCoverage).mockResolvedValue([
      { clause_id: 'REQ:auth/session-expiry#c1', clause_text: 'Sessions expire', children: ['TASK:auth/x'] },
      { clause_id: 'REQ:auth/session-expiry#c2', clause_text: 'Expired sessions log out', children: [] },
    ])
    render(
      <SpecInspectorPanel
        entry={makeRequirement()}
        specsDir="/proj/.specs"
      />,
    )
    await waitFor(() => {
      expect(screen.getAllByTestId('spec-coverage-row')).toHaveLength(2)
    })
    const rows = screen.getAllByTestId('spec-coverage-row')
    expect(rows[0].getAttribute('data-uncovered')).toBe('false')
    expect(rows[1].getAttribute('data-uncovered')).toBe('true')
  })

  it('does not render coverage section for tasks', async () => {
    render(
      <SpecInspectorPanel entry={makeTask()} specsDir="/proj/.specs" />,
    )
    expect(screen.queryByTestId('spec-inspector-coverage')).toBeNull()
    // Lint still loads; wait for stable state
    await waitFor(() => {
      expect(getLintResults).toHaveBeenCalled()
    })
  })

  it('shows task progress section for spec-tasks with assignee/eta/blocked-by', async () => {
    render(
      <SpecInspectorPanel entry={makeTask()} specsDir="/proj/.specs" />,
    )
    expect(screen.getByTestId('spec-inspector-task')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('2026-06-01')).toBeInTheDocument()
    expect(screen.getByText('REQ:auth/foo')).toBeInTheDocument()
    await waitFor(() => {
      expect(getLintResults).toHaveBeenCalled()
    })
  })

  it('filters lint results to the active file', async () => {
    vi.mocked(getLintResults).mockResolvedValue([
      { code: 'LINT001', severity: 'error', message: 'Bad clause', file: 'req/auth/session-expiry.md', line: 12 },
      { code: 'LINT002', severity: 'warning', message: 'Other file', file: 'req/other.md', line: 1 },
    ])
    render(
      <SpecInspectorPanel
        entry={makeRequirement()}
        specsDir="/proj/.specs"
      />,
    )
    await waitFor(() => {
      const rows = screen.getAllByTestId('spec-lint-row')
      expect(rows).toHaveLength(1)
    })
    expect(screen.getByText('LINT001')).toBeInTheDocument()
    expect(screen.queryByText('LINT002')).toBeNull()
  })

  it('shows empty-state for lint when no diagnostics match', async () => {
    vi.mocked(getLintResults).mockResolvedValue([
      { code: 'LINT002', severity: 'warning', message: 'Other file', file: 'req/other.md', line: 1 },
    ])
    render(
      <SpecInspectorPanel
        entry={makeRequirement()}
        specsDir="/proj/.specs"
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('No findings for this file')).toBeInTheDocument()
    })
  })

  it('exposes a footer link that calls onOpenSpecOverview', async () => {
    const onOpenSpecOverview = vi.fn()
    render(
      <SpecInspectorPanel
        entry={makeRequirement()}
        specsDir="/proj/.specs"
        onOpenSpecOverview={onOpenSpecOverview}
      />,
    )
    const btn = await screen.findByTestId('spec-inspector-footer-link')
    expect(btn).toHaveTextContent('Open spec overview')
    btn.click()
    expect(onOpenSpecOverview).toHaveBeenCalledOnce()
  })

  it('uses task-board label when entry is a task', async () => {
    render(
      <SpecInspectorPanel
        entry={makeTask()}
        specsDir="/proj/.specs"
        onOpenSpecOverview={() => {}}
      />,
    )
    const btn = await screen.findByTestId('spec-inspector-footer-link')
    expect(btn).toHaveTextContent('Open task board')
  })

  it('exposes a lint focus trigger when onLintFocus is provided', async () => {
    const onLintFocus = vi.fn()
    render(
      <SpecInspectorPanel
        entry={makeRequirement()}
        specsDir="/proj/.specs"
        onLintFocus={onLintFocus}
      />,
    )
    const focus = await screen.findByTestId('spec-inspector-lint-focus')
    focus.click()
    expect(onLintFocus).toHaveBeenCalledOnce()
  })
})
