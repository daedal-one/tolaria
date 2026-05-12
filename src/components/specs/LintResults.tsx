import { useEffect, useState } from 'react'
import type { LintDiagnostic } from '@/utils/specs/types'
import { getLintResults } from '@/utils/specs/api'

interface LintResultsProps {
  specsDir: string
}

const SEVERITY_STYLES: Record<string, string> = {
  error: 'text-red-600 bg-red-50',
  warning: 'text-amber-600 bg-amber-50',
  info: 'text-blue-600 bg-blue-50',
}

export function LintResults({ specsDir }: LintResultsProps) {
  const [diagnostics, setDiagnostics] = useState<LintDiagnostic[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getLintResults(specsDir)
      .then((data) => {
        if (!cancelled) {
          setDiagnostics(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [specsDir])

  if (error) {
    return <div className="p-4 text-sm text-red-600">Error running lint: {error}</div>
  }

  if (diagnostics.length === 0) {
    return (
      <div className="p-4 text-sm text-green-600">
        No lint findings. All specs valid.
      </div>
    )
  }

  // Group by file
  const byFile = new Map<string, LintDiagnostic[]>()
  for (const d of diagnostics) {
    const list = byFile.get(d.file) ?? []
    list.push(d)
    byFile.set(d.file, list)
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="text-xs text-muted-foreground">
        {diagnostics.length} finding{diagnostics.length !== 1 ? 's' : ''}
      </div>
      {Array.from(byFile.entries()).map(([file, diags]) => (
        <div key={file} className="rounded-md border border-border">
          <div className="border-b border-border bg-muted/50 px-3 py-1.5 font-mono text-xs">
            {file}
          </div>
          {diags.map((d, i) => (
            <div key={i} className="flex items-start gap-2 border-b border-border/30 px-3 py-1.5 last:border-0">
              <span
                className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_STYLES[d.severity] ?? ''}`}
              >
                {d.code}
              </span>
              <span className="text-xs">{d.message}</span>
              {d.line != null && (
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  :{d.line}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
