import { describe, expect, it } from 'vitest'
import { entityTypeFromId, iconForEntityType, parseSpecUrl } from './specLinks'

describe('parseSpecUrl', () => {
  it('returns null for non-spec URLs', () => {
    expect(parseSpecUrl('https://example.com')).toBeNull()
    expect(parseSpecUrl('relative/path.md')).toBeNull()
    expect(parseSpecUrl('')).toBeNull()
  })

  it('parses a bare spec ID', () => {
    expect(parseSpecUrl('spec:REQ:auth/session-expiry')).toEqual({
      kind: 'spec',
      id: 'REQ:auth/session-expiry',
      anchor: null,
    })
  })

  it('parses a spec ID with anchor', () => {
    expect(parseSpecUrl('spec:REQ:auth/session-management#c-lifetime')).toEqual({
      kind: 'spec',
      id: 'REQ:auth/session-management',
      anchor: 'c-lifetime',
    })
  })

  it('parses a source reference without lines', () => {
    expect(parseSpecUrl('spec:src:packages/auth/session.ts')).toEqual({
      kind: 'source',
      path: 'packages/auth/session.ts',
      lines: null,
    })
  })

  it('parses a source reference with a line range', () => {
    expect(parseSpecUrl('spec:src:packages/auth/session.ts:42-78')).toEqual({
      kind: 'source',
      path: 'packages/auth/session.ts',
      lines: '42-78',
    })
  })

  it('parses a source reference with a single line', () => {
    expect(parseSpecUrl('spec:src:packages/auth/session.ts:42')).toEqual({
      kind: 'source',
      path: 'packages/auth/session.ts',
      lines: '42',
    })
  })

  it('parses a kb reference without heading', () => {
    expect(parseSpecUrl('spec:kb:engineering/auth/session-tokens.md')).toEqual({
      kind: 'kb',
      path: 'engineering/auth/session-tokens.md',
      heading: null,
    })
  })

  it('parses a kb reference with heading', () => {
    expect(
      parseSpecUrl('spec:kb:engineering/auth/session-tokens.md#credential-rotation'),
    ).toEqual({
      kind: 'kb',
      path: 'engineering/auth/session-tokens.md',
      heading: 'credential-rotation',
    })
  })

  it('treats empty trailing #anchor as null heading', () => {
    expect(parseSpecUrl('spec:kb:foo.md#')).toEqual({
      kind: 'kb',
      path: 'foo.md',
      heading: null,
    })
  })
})

describe('entityTypeFromId', () => {
  it('extracts the prefix from a spec ID', () => {
    expect(entityTypeFromId('REQ:auth/foo')).toBe('REQ')
    expect(entityTypeFromId('TASK:work/bar')).toBe('TASK')
  })

  it('returns null when no colon is present', () => {
    expect(entityTypeFromId('not-a-spec-id')).toBeNull()
  })
})

describe('iconForEntityType', () => {
  it('returns a known icon for each entity type', () => {
    expect(iconForEntityType('REQ')).toBe('shield-check')
    expect(iconForEntityType('TASK')).toBe('check-square')
    expect(iconForEntityType('ADR')).toBe('landmark')
  })

  it('falls back to file-text for unknown types', () => {
    expect(iconForEntityType('UNKNOWN')).toBe('file-text')
  })
})
