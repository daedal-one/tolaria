import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SpecLintBadge } from './SpecLintBadge'
import type { VaultEntry } from '@/types'
import type { LintDiagnostic } from '@/utils/specs/types'

const mockInvokeFn = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvokeFn(...args),
}))

vi.mock('../../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: (...args: unknown[]) => mockInvokeFn(...args),
}))

function makeEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/abs/.specs/requirements/auth/session-expiry.md',
    filename: 'session-expiry.md',
    title: 'Spec',
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
    properties: {},
    hasH1: false,
    ...overrides,
  }
}

function makeDiag(overrides: Partial<LintDiagnostic> = {}): LintDiagnostic {
  return {
    code: 'R001',
    severity: 'warning',
    message: 'A warning',
    file: 'requirements/auth/session-expiry.md',
    line: 1,
    ...overrides,
  }
}

describe('SpecLintBadge', () => {
  beforeEach(() => {
    mockInvokeFn.mockReset()
  })

  it('renders nothing when specsDir is null', () => {
    const { container } = render(
      <SpecLintBadge entry={makeEntry()} specsDir={null} />,
    )
    expect(container).toBeEmptyDOMElement()
    expect(mockInvokeFn).not.toHaveBeenCalled()
  })

  it('renders nothing when there are no diagnostics for the active entry', async () => {
    mockInvokeFn.mockResolvedValue([])
    const { container } = render(
      <SpecLintBadge entry={makeEntry()} specsDir="/proj" />,
    )
    await waitFor(() => {
      expect(mockInvokeFn).toHaveBeenCalledWith('spec_get_lint_results', { specsDir: '/proj' })
    })
    expect(container.querySelector('[data-testid="spec-lint-badge"]')).toBeNull()
  })

  it('renders a warning-coloured badge when only warnings are present', async () => {
    mockInvokeFn.mockResolvedValue([
      makeDiag({ severity: 'warning' }),
      makeDiag({ severity: 'info', code: 'R005' }),
    ])
    render(<SpecLintBadge entry={makeEntry()} specsDir="/proj" />)

    const badge = await screen.findByTestId('spec-lint-badge')
    expect(badge).toHaveAttribute('data-severity', 'warning')
    expect(badge).toHaveTextContent('2')
  })

  it('renders an error-coloured badge when any error is present', async () => {
    mockInvokeFn.mockResolvedValue([
      makeDiag({ severity: 'warning' }),
      makeDiag({ severity: 'error', code: 'R002' }),
    ])
    render(<SpecLintBadge entry={makeEntry()} specsDir="/proj" />)

    const badge = await screen.findByTestId('spec-lint-badge')
    expect(badge).toHaveAttribute('data-severity', 'error')
    expect(badge).toHaveTextContent('2')
  })

  it('filters diagnostics that do not match the active entry', async () => {
    mockInvokeFn.mockResolvedValue([
      makeDiag({ file: 'requirements/other/file.md' }),
    ])
    render(<SpecLintBadge entry={makeEntry()} specsDir="/proj" />)

    await waitFor(() => {
      expect(mockInvokeFn).toHaveBeenCalled()
    })
    expect(screen.queryByTestId('spec-lint-badge')).toBeNull()
  })

  it('invokes onClick when the badge is clicked', async () => {
    mockInvokeFn.mockResolvedValue([makeDiag({ severity: 'error' })])
    const onClick = vi.fn()
    render(
      <SpecLintBadge entry={makeEntry()} specsDir="/proj" onClick={onClick} />,
    )
    const badge = await screen.findByTestId('spec-lint-badge')
    fireEvent.click(badge)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
