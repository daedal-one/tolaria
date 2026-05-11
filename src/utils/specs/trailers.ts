/**
 * Parse Spec-Ref: git commit trailers.
 *
 * Format: Spec-Ref: REQ:auth/session-expiry (implements)
 * Kinds: implements, refines, tests, violates, touches (default if bare)
 */

export interface SpecTrailer {
  specId: string
  kind: string
}

const TRAILER_RE = /^Spec-Ref:\s+(.+?)(?:\s+\((\w+)\))?\s*$/

/** Extract all Spec-Ref trailers from a commit message body. */
export function parseSpecTrailers(message: string): SpecTrailer[] {
  const trailers: SpecTrailer[] = []
  for (const line of message.split('\n')) {
    const m = TRAILER_RE.exec(line.trim())
    if (m) {
      trailers.push({
        specId: m[1],
        kind: m[2] ?? 'touches',
      })
    }
  }
  return trailers
}

/** Check if a commit message contains any Spec-Ref trailers. */
export function hasSpecTrailers(message: string): boolean {
  return message.split('\n').some((line) => TRAILER_RE.test(line.trim()))
}

/** Build a Spec-Ref trailer line. */
export function formatSpecTrailer(specId: string, kind: string): string {
  return `Spec-Ref: ${specId} (${kind})`
}
