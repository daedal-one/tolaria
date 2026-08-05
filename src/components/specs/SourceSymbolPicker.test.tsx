import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SourceSymbolPicker } from './SourceSymbolPicker'

const listSourceSymbols = vi.fn()
const resolveSourceReference = vi.fn()

vi.mock('@/utils/specs/api', () => ({
  listSourceSymbols: (...args: unknown[]) => listSourceSymbols(...args),
  resolveSourceReference: (...args: unknown[]) => resolveSourceReference(...args),
}))

vi.mock('@/lib/telemetry', () => ({ trackEvent: vi.fn() }))

describe('SourceSymbolPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('lists, previews, and copies a language-server symbol reference', async () => {
    const symbol = {
      name: 'expire',
      qualified_name: 'SessionStore/expire',
      kind: 'method',
      detail: null,
      path: 'src/session.rs',
      reference: 'spec:src:src/session.rs#symbol=SessionStore/expire',
      range: { start: { line: 4, character: 2 }, end: { line: 8, character: 3 } },
      selection_range: { start: { line: 4, character: 5 }, end: { line: 4, character: 11 } },
      language: 'rust',
      server: 'rust-analyzer',
    }
    listSourceSymbols.mockResolvedValue([symbol])
    resolveSourceReference.mockResolvedValue({
      reference: symbol.reference,
      path: symbol.path,
      symbol: symbol.qualified_name,
      language: 'rust',
      server: 'rust-analyzer',
      locations: [symbol.range],
      snippet: 'fn expire() {}',
      status: 'verified',
      message: null,
    })

    render(<SourceSymbolPicker specsDir="/repo/.specs" locale="en" />)
    fireEvent.click(screen.getByText('Source symbol reference'))
    fireEvent.change(screen.getByPlaceholderText('src/session.rs'), {
      target: { value: 'src/session.rs' },
    })
    fireEvent.click(screen.getByText('Find symbols'))

    expect(await screen.findByText('SessionStore/expire')).toBeInTheDocument()
    expect(listSourceSymbols).toHaveBeenCalledWith('/repo/.specs', 'src/session.rs', '')

    fireEvent.click(screen.getByText('SessionStore/expire'))
    expect(await screen.findByText('fn expire() {}')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Copy reference'))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(symbol.reference)
    })
  })
})
