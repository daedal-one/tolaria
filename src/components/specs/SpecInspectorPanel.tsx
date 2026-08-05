/**
 * Spec section for Tolaria's Inspector (right rail).
 *
 * Renders when the active entry is a forge-spec note. Shows:
 *  - Coverage table (requirements only)
 *  - Task progress + assignee/eta/blocked-by (spec-tasks only)
 *  - Lint diagnostics filtered to this file
 *  - Footer link to the spec overview / task board
 */
import { useEffect, useState } from 'react'
import type { VaultEntry } from '@/types'
import { translate, type AppLocale } from '@/lib/i18n'
import { useSpecForActiveNote, type SpecMeta } from '@/hooks/useSpecForActiveNote'
import { SourceSymbolPicker } from './SourceSymbolPicker'
import {
  getCoverage,
  getLintResults,
} from '@/utils/specs/api'
import type { CoverageEntry, LintDiagnostic } from '@/utils/specs/types'
import { TaskProgressBar } from './TaskProgressBadge'
import { cn } from '@/lib/utils'

interface SpecInspectorPanelProps {
  entry: VaultEntry
  specsDir: string | null
  locale?: AppLocale
  onLintFocus?: () => void
  onOpenSpecOverview?: () => void
}

const SEVERITY_STYLES: Record<string, string> = {
  error: 'text-red-600 bg-red-50',
  warning: 'text-amber-600 bg-amber-50',
  info: 'text-blue-600 bg-blue-50',
}

interface AsyncResult<T> {
  data: T | null
  loading: boolean
  error: string | null
}

type Settled<T> = { data: T | null; error: string | null }

function resolveAsync<T>(enabled: boolean, settled: Settled<T> | null): AsyncResult<T> {
  if (!enabled) return { data: null, loading: false, error: null }
  if (settled === null) return { data: null, loading: true, error: null }
  return { ...settled, loading: false }
}

function useCoverage(specsDir: string | null, id: string | null): AsyncResult<CoverageEntry[]> {
  const enabled = Boolean(specsDir && id)
  const [settled, setSettled] = useState<Settled<CoverageEntry[]> | null>(null)
  useEffect(() => {
    if (!specsDir || !id) return
    let cancelled = false
    getCoverage(specsDir, id)
      .then((data) => {
        if (!cancelled) setSettled({ data, error: null })
      })
      .catch((e: unknown) => {
        if (!cancelled) setSettled({ data: null, error: String(e) })
      })
    return () => {
      cancelled = true
    }
  }, [specsDir, id])
  return resolveAsync(enabled, settled)
}

function useFileLintResults(
  specsDir: string | null,
  filePath: string,
): AsyncResult<LintDiagnostic[]> {
  const enabled = Boolean(specsDir)
  const [settled, setSettled] = useState<Settled<LintDiagnostic[]> | null>(null)
  useEffect(() => {
    if (!specsDir) return
    let cancelled = false
    getLintResults(specsDir)
      .then((data) => {
        if (!cancelled) setSettled({ data, error: null })
      })
      .catch((e: unknown) => {
        if (!cancelled) setSettled({ data: null, error: String(e) })
      })
    return () => {
      cancelled = true
    }
  }, [specsDir])
  const result = resolveAsync(enabled, settled)
  if (!enabled || result.loading || result.error || !result.data) return result
  const filtered = result.data.filter(
    (d) => d.file === filePath || filePath.endsWith(d.file),
  )
  return { ...result, data: filtered }
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h4>
  )
}

function LoadingRow({ locale }: { locale: AppLocale }) {
  return (
    <p className="m-0 text-[12px] text-muted-foreground">
      {translate(locale, 'inspector.spec.loading')}
    </p>
  )
}

function ErrorRow({ message }: { message: string }) {
  return (
    <p className="m-0 text-[12px] text-red-600" role="alert">
      {message}
    </p>
  )
}

function CoverageTable({
  rows,
  locale,
}: {
  rows: CoverageEntry[]
  locale: AppLocale
}) {
  if (rows.length === 0) {
    return (
      <p className="m-0 text-[12px] text-muted-foreground">
        {translate(locale, 'inspector.spec.coverage.empty')}
      </p>
    )
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {rows.map((row) => {
        const uncovered = row.children.length === 0
        return (
          <li
            key={row.clause_id}
            className={cn(
              'flex items-baseline gap-2 rounded-sm px-1 py-0.5 text-[12px]',
              uncovered && 'bg-red-50 text-red-700',
            )}
            data-testid="spec-coverage-row"
            data-uncovered={uncovered ? 'true' : 'false'}
          >
            <span className="shrink-0 font-mono text-[11px]">{row.clause_id}</span>
            <span
              className={cn(
                'inline-flex shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium',
                uncovered ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground',
              )}
              aria-label={translate(locale, 'inspector.spec.coverage.refinedBy')}
            >
              {row.children.length}
            </span>
            <span className="truncate text-muted-foreground">{row.clause_text}</span>
          </li>
        )
      })}
    </ul>
  )
}

function CoverageSection({
  specsDir,
  meta,
  locale,
}: {
  specsDir: string | null
  meta: SpecMeta
  locale: AppLocale
}) {
  const { data, loading, error } = useCoverage(specsDir, meta.id)
  return (
    <section
      className="flex flex-col gap-1.5"
      data-testid="spec-inspector-coverage"
      aria-label={translate(locale, 'inspector.spec.coverage.title')}
    >
      <SectionHeading>
        {translate(locale, 'inspector.spec.coverage.title')}
      </SectionHeading>
      {loading && <LoadingRow locale={locale} />}
      {error && <ErrorRow message={error} />}
      {!loading && !error && data && <CoverageTable rows={data} locale={locale} />}
    </section>
  )
}

function entryProgressCounts(meta: SpecMeta): Record<string, number> {
  if (!meta.progress) return {}
  return { [meta.progress]: 1 }
}

function TaskMetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  )
}

function TaskProgressSection({
  entry,
  meta,
  locale,
}: {
  entry: VaultEntry
  meta: SpecMeta
  locale: AppLocale
}) {
  const assignee = typeof entry.properties?.assignee === 'string'
    ? entry.properties.assignee
    : null
  const eta = typeof entry.properties?.eta === 'string' ? entry.properties.eta : null
  const blockedBy = entry.relationships?.blocked_by
    ?? entry.relationships?.['Blocked by']
    ?? []

  const dash = translate(locale, 'inspector.spec.task.unset')

  return (
    <section
      className="flex flex-col gap-1.5"
      data-testid="spec-inspector-task"
      aria-label={translate(locale, 'inspector.spec.task.title')}
    >
      <SectionHeading>
        {translate(locale, 'inspector.spec.task.title')}
      </SectionHeading>
      <TaskProgressBar counts={entryProgressCounts(meta)} />
      <TaskMetaRow
        label={translate(locale, 'inspector.spec.task.progress')}
        value={meta.progress ?? dash}
      />
      <TaskMetaRow
        label={translate(locale, 'inspector.spec.task.assignee')}
        value={assignee ?? dash}
      />
      <TaskMetaRow
        label={translate(locale, 'inspector.spec.task.eta')}
        value={eta ?? dash}
      />
      <TaskMetaRow
        label={translate(locale, 'inspector.spec.task.blockedBy')}
        value={
          blockedBy.length === 0
            ? dash
            : blockedBy.join(', ')
        }
      />
    </section>
  )
}

function LintRow({ diagnostic }: { diagnostic: LintDiagnostic }) {
  const tone = SEVERITY_STYLES[diagnostic.severity] ?? ''
  return (
    <li
      className="flex items-baseline gap-2 text-[12px]"
      data-testid="spec-lint-row"
    >
      <span
        className={cn(
          'inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
          tone,
        )}
      >
        {diagnostic.code}
      </span>
      <span className="flex-1 truncate">{diagnostic.message}</span>
      {diagnostic.line != null && (
        <span className="shrink-0 text-[10px] text-muted-foreground">
          :{diagnostic.line}
        </span>
      )}
    </li>
  )
}

function LintSectionHeading({
  locale,
  onLintFocus,
}: {
  locale: AppLocale
  onLintFocus?: () => void
}) {
  const label = translate(locale, 'inspector.spec.lint.title')
  if (!onLintFocus) {
    return <SectionHeading>{label}</SectionHeading>
  }
  return (
    <button
      type="button"
      onClick={onLintFocus}
      className="m-0 cursor-pointer self-start bg-transparent p-0 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      data-testid="spec-inspector-lint-focus"
    >
      {label}
    </button>
  )
}

function LintSection({
  specsDir,
  filePath,
  locale,
  onLintFocus,
}: {
  specsDir: string | null
  filePath: string
  locale: AppLocale
  onLintFocus?: () => void
}) {
  const { data, loading, error } = useFileLintResults(specsDir, filePath)
  return (
    <section
      className="flex flex-col gap-1.5"
      data-testid="spec-inspector-lint"
      aria-label={translate(locale, 'inspector.spec.lint.title')}
    >
      <LintSectionHeading locale={locale} onLintFocus={onLintFocus} />
      {loading && <LoadingRow locale={locale} />}
      {error && <ErrorRow message={error} />}
      {!loading && !error && data && data.length === 0 && (
        <p className="m-0 text-[12px] text-muted-foreground">
          {translate(locale, 'inspector.spec.lint.empty')}
        </p>
      )}
      {!loading && !error && data && data.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {data.map((d, i) => (
            <LintRow key={`${d.code}-${d.line ?? 'na'}-${i}`} diagnostic={d} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FooterLink({
  meta,
  locale,
  onOpenSpecOverview,
}: {
  meta: SpecMeta
  locale: AppLocale
  onOpenSpecOverview?: () => void
}) {
  if (!onOpenSpecOverview) return null
  const labelKey: 'inspector.spec.footer.openTaskBoard' | 'inspector.spec.footer.openOverview' =
    meta.entityType === 'spec-task'
      ? 'inspector.spec.footer.openTaskBoard'
      : 'inspector.spec.footer.openOverview'
  return (
    <button
      type="button"
      onClick={onOpenSpecOverview}
      className="self-start text-[12px] text-primary hover:underline"
      data-testid="spec-inspector-footer-link"
    >
      {translate(locale, labelKey)}
    </button>
  )
}

export function SpecInspectorPanel({
  entry,
  specsDir,
  locale = 'en',
  onLintFocus,
  onOpenSpecOverview,
}: SpecInspectorPanelProps) {
  const meta = useSpecForActiveNote(entry)
  if (!meta) return null

  return (
    <section
      className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3"
      data-testid="spec-inspector-panel"
      aria-label={translate(locale, 'inspector.spec.title')}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="m-0 text-[13px] font-semibold">
          {translate(locale, 'inspector.spec.title')}
        </h3>
        <span className="font-mono text-[11px] text-muted-foreground">{meta.id}</span>
      </header>
      {meta.entityType === 'requirement' && (
        <CoverageSection specsDir={specsDir} meta={meta} locale={locale} />
      )}
      {meta.entityType === 'spec-task' && (
        <TaskProgressSection entry={entry} meta={meta} locale={locale} />
      )}
      <LintSection
        specsDir={specsDir}
        filePath={entry.path}
        locale={locale}
        onLintFocus={onLintFocus}
      />
      {specsDir && <SourceSymbolPicker specsDir={specsDir} locale={locale} />}
      <FooterLink meta={meta} locale={locale} onOpenSpecOverview={onOpenSpecOverview} />
    </section>
  )
}
