/**
 * forge-spec Tauri IPC client.
 * Wraps all spec_* commands into typed async functions.
 */
import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../../mock-tauri'
import type {
  SpecSummary,
  SpecFull,
  GraphData,
  CoverageEntry,
  LintDiagnostic,
  HistoryEvent,
  TaskEntry,
  SourceSymbol,
  ResolvedSource,
} from './types'

function tauriCall<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

export async function listSpecs(specsDir: string): Promise<SpecSummary[]> {
  return tauriCall<SpecSummary[]>('spec_list_specs', { specsDir })
}

export async function getSpec(specsDir: string, id: string): Promise<SpecFull> {
  return tauriCall<SpecFull>('spec_get_spec', { specsDir, id })
}

export async function getRefinementGraph(specsDir: string): Promise<GraphData> {
  return tauriCall<GraphData>('spec_get_refinement_graph', { specsDir })
}

export async function getCategorizationGraph(specsDir: string): Promise<GraphData> {
  return tauriCall<GraphData>('spec_get_categorization_graph', { specsDir })
}

export async function getCoverage(specsDir: string, id: string): Promise<CoverageEntry[]> {
  return tauriCall<CoverageEntry[]>('spec_get_coverage', { specsDir, id })
}

export async function getLintResults(specsDir: string): Promise<LintDiagnostic[]> {
  return tauriCall<LintDiagnostic[]>('spec_get_lint_results', { specsDir })
}

export async function getSpecHistory(specsDir: string, id: string): Promise<HistoryEvent[]> {
  return tauriCall<HistoryEvent[]>('spec_get_history', { specsDir, id })
}

export async function listTasks(
  specsDir: string,
  state?: string,
): Promise<TaskEntry[]> {
  return tauriCall<TaskEntry[]>('spec_list_tasks', { specsDir, state: state ?? null })
}

export async function listSourceSymbols(
  specsDir: string,
  path: string,
  query?: string,
): Promise<SourceSymbol[]> {
  return tauriCall<SourceSymbol[]>('spec_list_source_symbols', {
    specsDir,
    path,
    query: query || null,
  })
}

export async function resolveSourceReference(
  specsDir: string,
  reference: string,
): Promise<ResolvedSource> {
  return tauriCall<ResolvedSource>('spec_resolve_source_reference', {
    specsDir,
    reference,
  })
}

export interface AuxRootEntry {
  label: string
  path: string
}

/** Resolve the configured auxiliary roots (forge-spec projects) for a vault. */
export async function resolveAuxRoots(vaultPath: string): Promise<AuxRootEntry[]> {
  return tauriCall<AuxRootEntry[]>('spec_resolve_aux_roots', { vaultPath })
}
