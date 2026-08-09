import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SpecOverview } from './SpecOverview'
import { getSpec, listSpecs } from '@/utils/specs/api'
import type { SpecFull, SpecSummary } from '@/utils/specs/types'

vi.mock('@/utils/specs/api', () => ({
  getSpec: vi.fn(),
  listSpecs: vi.fn(),
}))

const SUMMARY: SpecSummary = {
  id: 'REQ:runtime/fast-startup',
  entity_type: 'requirement',
  status: 'draft',
  level: 'MUST',
  summary: 'Keep repository startup responsive.',
  revision: 'r3',
  spec_baseline: 'forge-spec-v0.2.0',
  owners: ['runtime'],
  progress: null,
}

const FULL_SPEC: SpecFull = {
  ...SUMMARY,
  body: '# Fast startup\n\nThe repository opens without scanning generated output.',
  source_path: '/repo/.specs/runtime/fast-startup.spec.md',
  refines: ['REQ:runtime/repository-mode'],
  related: ['ADR:runtime/scanner-boundaries'],
}

describe('SpecOverview', () => {
  beforeEach(() => {
    vi.mocked(listSpecs).mockReset().mockResolvedValue([SUMMARY])
    vi.mocked(getSpec).mockReset().mockResolvedValue(FULL_SPEC)
  })

  it('opens an individual spec from the overview and returns to the list', async () => {
    render(<SpecOverview specsDir="/repo/.specs" />)

    fireEvent.click(await screen.findByRole('button', { name: SUMMARY.id }))

    await waitFor(() => {
      expect(getSpec).toHaveBeenCalledWith('/repo/.specs', SUMMARY.id)
    })
    expect(await screen.findByRole('heading', { name: 'Fast startup' })).toBeVisible()
    expect(screen.getByText('The repository opens without scanning generated output.')).toBeVisible()
    expect(screen.getByText('REQ:runtime/repository-mode')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: /All specs/ }))
    expect(screen.getByRole('button', { name: SUMMARY.id })).toBeVisible()
  })
})
