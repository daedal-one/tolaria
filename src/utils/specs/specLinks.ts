/**
 * Utilities for parsing and resolving spec: URLs in Tolaria's editor.
 *
 * These functions can be used by BlockNote/ProseMirror plugins to detect
 * and render spec: links as interactive elements.
 */

/** The result of parsing a spec: URL. */
export type ParsedSpecUrl =
  | { kind: 'spec'; id: string; anchor: string | null }
  | { kind: 'source'; path: string; lines: string | null }
  | { kind: 'kb'; path: string; heading: string | null }

/** Parse a `spec:` URL into its constituent parts. */
export function parseSpecUrl(url: string): ParsedSpecUrl | null {
  if (!url.startsWith('spec:')) return null
  const rest = url.slice(5)

  if (rest.startsWith('src:')) {
    const srcPath = rest.slice(4)
    // Try to split off trailing :NN-NN or :NN
    const lastColon = srcPath.lastIndexOf(':')
    if (lastColon > 0) {
      const after = srcPath.slice(lastColon + 1)
      if (/^\d+(-\d+)?$/.test(after)) {
        return { kind: 'source', path: srcPath.slice(0, lastColon), lines: after }
      }
    }
    return { kind: 'source', path: srcPath, lines: null }
  }

  if (rest.startsWith('kb:')) {
    const kbPath = rest.slice(3)
    const hashIdx = kbPath.indexOf('#')
    if (hashIdx >= 0) {
      return {
        kind: 'kb',
        path: kbPath.slice(0, hashIdx),
        heading: kbPath.slice(hashIdx + 1) || null,
      }
    }
    return { kind: 'kb', path: kbPath, heading: null }
  }

  // Spec reference: TYPE:ns/slug or TYPE:ns/slug#anchor
  const hashIdx = rest.indexOf('#')
  if (hashIdx >= 0) {
    return {
      kind: 'spec',
      id: rest.slice(0, hashIdx),
      anchor: rest.slice(hashIdx + 1) || null,
    }
  }
  return { kind: 'spec', id: rest, anchor: null }
}

/** Extract the entity type prefix from a spec ID. */
export function entityTypeFromId(id: string): string | null {
  const colon = id.indexOf(':')
  if (colon < 0) return null
  return id.slice(0, colon)
}

/** Return an icon name for a spec entity type. */
export function iconForEntityType(entityType: string): string {
  const icons: Record<string, string> = {
    REQ: 'shield-check',
    INV: 'lock',
    IFC: 'plug',
    ADR: 'landmark',
    GLO: 'book-open',
    TOPIC: 'folder',
    SCN: 'play-circle',
    TASK: 'check-square',
  }
  return icons[entityType] ?? 'file-text'
}
