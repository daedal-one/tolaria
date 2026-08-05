import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { SpecIdChip } from './SpecIdChip'
import type { SpecMeta } from '@/hooks/useSpecForActiveNote'

const baseMeta: SpecMeta = {
  id: 'REQ:auth/session-expiry',
  entityType: 'requirement',
  status: 'accepted',
  level: 'MUST',
  owners: ['alice', 'bob'],
  refines: ['REQ:auth/parent'],
  related: ['REQ:auth/login'],
  categorizedUnder: ['TOPIC:auth'],
}

describe('SpecIdChip', () => {
  it('renders the spec ID as a chip', () => {
    render(<SpecIdChip meta={baseMeta} />)
    const chip = screen.getByTestId('spec-id-chip')
    expect(chip).toHaveTextContent('REQ:auth/session-expiry')
  })

  it('opens popover after hover delay and shows frontmatter rows', async () => {
    render(<SpecIdChip meta={baseMeta} />)
    const chip = screen.getByTestId('spec-id-chip')

    fireEvent.pointerEnter(chip)
    // Wait for the 250ms delay; use waitFor with a generous timeout.
    await waitFor(
      () => {
        expect(screen.getByText('Spec frontmatter')).toBeInTheDocument()
      },
      { timeout: 800 },
    )

    // Spot-check rows
    expect(screen.getAllByText('REQ:auth/session-expiry').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('accepted')).toBeInTheDocument()
    expect(screen.getByText('Level')).toBeInTheDocument()
    expect(screen.getByText('MUST')).toBeInTheDocument()
    expect(screen.getByText('Owners')).toBeInTheDocument()
    expect(screen.getByText('alice, bob')).toBeInTheDocument()
    expect(screen.getByText('REQ:auth/parent')).toBeInTheDocument()
    expect(screen.getByText('TOPIC:auth')).toBeInTheDocument()
  })

  it('cancels the open timer when the pointer leaves before delay', async () => {
    render(<SpecIdChip meta={baseMeta} />)
    const chip = screen.getByTestId('spec-id-chip')

    fireEvent.pointerEnter(chip)
    fireEvent.pointerLeave(chip)

    // Wait long enough for the timer to have fired if it weren't cancelled.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400))
    })
    expect(screen.queryByText('Spec frontmatter')).not.toBeInTheDocument()
  })
})
