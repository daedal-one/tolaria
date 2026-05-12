import { describe, expect, it } from 'vitest'
import { formatSpecTrailer, hasSpecTrailers, parseSpecTrailers } from './trailers'

describe('parseSpecTrailers', () => {
  it('parses a single trailer with explicit kind', () => {
    const message = `feat: add session expiry

Implements the 30-day cap discussed last week.

Spec-Ref: REQ:auth/session-expiry (implements)`

    expect(parseSpecTrailers(message)).toEqual([
      { specId: 'REQ:auth/session-expiry', kind: 'implements' },
    ])
  })

  it('defaults to "touches" for bare trailers', () => {
    expect(parseSpecTrailers('Spec-Ref: REQ:auth/session-expiry')).toEqual([
      { specId: 'REQ:auth/session-expiry', kind: 'touches' },
    ])
  })

  it('parses multiple trailers across lines', () => {
    const message = `fix: tighten idle check

Spec-Ref: REQ:auth/session-expiry (refines)
Spec-Ref: INV:auth/no-stale-tokens (tests)
Spec-Ref: IFC:auth/session-api`

    expect(parseSpecTrailers(message)).toEqual([
      { specId: 'REQ:auth/session-expiry', kind: 'refines' },
      { specId: 'INV:auth/no-stale-tokens', kind: 'tests' },
      { specId: 'IFC:auth/session-api', kind: 'touches' },
    ])
  })

  it('returns an empty list when no trailers are present', () => {
    expect(parseSpecTrailers('chore: bump deps\n\nNo specs involved.')).toEqual([])
  })

  it('tolerates surrounding whitespace on trailer lines', () => {
    expect(parseSpecTrailers('   Spec-Ref: REQ:foo/bar (implements)   ')).toEqual([
      { specId: 'REQ:foo/bar', kind: 'implements' },
    ])
  })
})

describe('hasSpecTrailers', () => {
  it('returns true when at least one trailer exists', () => {
    expect(hasSpecTrailers('body\n\nSpec-Ref: REQ:foo/bar')).toBe(true)
  })

  it('returns false otherwise', () => {
    expect(hasSpecTrailers('just a regular commit')).toBe(false)
  })
})

describe('formatSpecTrailer', () => {
  it('builds a properly shaped trailer line', () => {
    expect(formatSpecTrailer('REQ:auth/session-expiry', 'implements')).toBe(
      'Spec-Ref: REQ:auth/session-expiry (implements)',
    )
  })
})
