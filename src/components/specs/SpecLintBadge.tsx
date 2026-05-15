/**
 * SpecLintBadge — small warning chip showing the count of lint diagnostics
 * for the active spec file. Clicking it dispatches `onClick`, which the
 * App.tsx wiring forwards to the Inspector (Phase 4 handles the listener).
 */
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { translate, type AppLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { getLintResults } from '@/utils/specs/api'
import type { LintDiagnostic } from '@/utils/specs/types'
import type { VaultEntry } from '@/types'

type Severity = 'error' | 'warning' | 'info'

interface SpecLintBadgeProps {
  entry: VaultEntry | null | undefined
  specsDir: string | null
  locale?: AppLocale
  onClick?: () => void
}

const SEVERITY_CLASSES: Record<Severity, string> = {
  error: 'bg-red-50 text-red-700 hover:bg-red-100',
  warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  info: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
}

const SEVERITY_ORDER: Record<Severity, number> = {
  error: 3,
  warning: 2,
  info: 1,
}

function isSeverity(value: string): value is Severity {
  return value === 'error' || value === 'warning' || value === 'info'
}

function maxSeverity(diags: LintDiagnostic[]): Severity {
  let best: Severity = 'info'
  for (const d of diags) {
    if (!isSeverity(d.severity)) continue
    if (SEVERITY_ORDER[d.severity] > SEVERITY_ORDER[best]) best = d.severity
  }
  return best
}

function matchesEntry(file: string, entryPath: string): boolean {
  if (file === entryPath) return true
  // Lint emits forge-spec-relative paths; tolerate suffix match so we don't
  // care whether `file` is absolute or rooted in `.specs/`.
  return entryPath.endsWith(file) || file.endsWith(entryPath)
}

export function SpecLintBadge({
  entry,
  specsDir,
  locale = 'en',
  onClick,
}: SpecLintBadgeProps) {
  const [allDiagnostics, setAllDiagnostics] = useState<LintDiagnostic[]>([])
  const entryPath = entry?.path ?? null

  useEffect(() => {
    if (!specsDir) return undefined
    let cancelled = false
    getLintResults(specsDir)
      .then((all) => {
        if (!cancelled) setAllDiagnostics(all)
      })
      .catch(() => {
        if (!cancelled) setAllDiagnostics([])
      })
    return () => {
      cancelled = true
    }
  }, [specsDir])

  const diagnostics = useMemo(() => {
    if (!entryPath) return []
    return allDiagnostics.filter((d) => matchesEntry(d.file, entryPath))
  }, [allDiagnostics, entryPath])

  const count = diagnostics.length
  const severity = useMemo(() => maxSeverity(diagnostics), [diagnostics])

  if (!specsDir || count === 0) return null

  const labelKey = count === 1
    ? 'breadcrumb.spec.lint.label'
    : 'breadcrumb.spec.lint.labelPlural'
  const label = translate(locale, labelKey, { count })

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={onClick}
      aria-label={translate(locale, 'breadcrumb.spec.lint.openInspector')}
      title={label}
      data-testid="spec-lint-badge"
      data-severity={severity}
      className={cn(
        'h-6 gap-1 rounded-full px-2 py-0 text-[11px] font-medium',
        SEVERITY_CLASSES[severity],
      )}
    >
      <span aria-hidden="true">⚠</span>
      <span>{count}</span>
    </Button>
  )
}
