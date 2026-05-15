/**
 * "Spec view" tabs are full-tab views over the entire specs registry (not a
 * single note). They live as a parallel, in-memory only state on the App
 * shell. Three views exist: a spec overview table, a task kanban board, and
 * the lint results list.
 *
 * This is intentionally modeled as a separate type from the note-centric
 * `Tab` interface in `hooks/useTabManagement.ts` to keep the existing
 * single-note save/cache flow untouched. Spec-view tabs are not persisted
 * across reloads — opening one is a session-scoped action.
 */

export type SpecView = 'overview' | 'tasks' | 'lint'

export interface SpecViewTab {
  kind: 'spec-view'
  view: SpecView
  /** Absolute on-disk path to the spec project root, resolved from the
   *  vault's auxiliary roots config (`<vault>/config/forge-spec.md`). */
  specsDir: string
}

export function isSpecViewTab(value: unknown): value is SpecViewTab {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'spec-view'
  )
}
