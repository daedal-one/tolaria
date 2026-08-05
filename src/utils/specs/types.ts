/** forge-spec integration types — mirrors the Tauri IPC command DTOs. */

export interface SpecSummary {
  id: string
  entity_type: string
  status: string
  level: string | null
  summary: string | null
  revision: string
  spec_baseline: string
  owners: string[]
  progress: string | null
}

export interface SpecFull extends SpecSummary {
  body: string
  source_path: string
  refines: string[]
  related: string[]
}

export interface GraphNode {
  id: string
  entity_type: string
  summary: string | null
  status: string
  level: string | null
  progress: string | null
}

export interface GraphEdge {
  from: string
  to: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface CoverageEntry {
  clause_id: string
  clause_text: string
  children: string[]
}

export interface LintDiagnostic {
  code: string
  severity: string
  message: string
  file: string
  line: number | null
}

export interface HistoryEvent {
  sha: string
  kind: string
  date: string
  author: string
}

export interface TaskEntry {
  id: string
  summary: string | null
  progress: string
  assignee: string | null
  eta: string | null
  blocked_by: string[]
}

export interface SourcePosition {
  line: number
  character: number
}

export interface SourceRange {
  start: SourcePosition
  end: SourcePosition
}

export interface SourceSymbol {
  name: string
  qualified_name: string
  kind: string
  detail: string | null
  path: string
  reference: string
  range: SourceRange
  selection_range: SourceRange
  language: string
  server: string
}

export interface ResolvedSource {
  reference: string
  path: string
  symbol: string | null
  language: string | null
  server: string | null
  locations: SourceRange[]
  snippet: string
  status: 'verified' | 'unverified'
  message: string | null
}

/** Entity type prefixes used in spec IDs. */
export const SPEC_ENTITY_TYPES = [
  'REQ',
  'INV',
  'IFC',
  'ADR',
  'GLO',
  'TOPIC',
  'SCN',
  'TASK',
] as const

export type SpecEntityType = (typeof SPEC_ENTITY_TYPES)[number]

/** Status colors for badges. */
export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  accepted: 'bg-green-100 text-green-700',
  deprecated: 'bg-amber-100 text-amber-700',
  superseded: 'bg-red-100 text-red-700',
}

/** RFC 2119 level colors. */
export const LEVEL_COLORS: Record<string, string> = {
  MUST: 'bg-red-100 text-red-800',
  SHOULD: 'bg-amber-100 text-amber-800',
  MAY: 'bg-blue-100 text-blue-800',
  INFO: 'bg-gray-100 text-gray-600',
}

/** Task progress colors. */
export const PROGRESS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  deferred: 'bg-amber-100 text-amber-600',
  wontdo: 'bg-gray-200 text-gray-500',
}
