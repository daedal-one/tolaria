import { useEffect, useState } from 'react'
import type { SpecSummary } from '@/utils/specs/types'
import { listSpecs } from '@/utils/specs/api'
import { SpecStatusBadge } from './SpecStatusBadge'
import { LevelBadge } from './LevelBadge'
import { TaskProgressBadge } from './TaskProgressBadge'
import { translate, type AppLocale } from '@/lib/i18n'

interface SpecOverviewProps {
  specsDir: string
  locale?: AppLocale
}

export function SpecOverview({ specsDir, locale = 'en' }: SpecOverviewProps) {
  const [specs, setSpecs] = useState<SpecSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    listSpecs(specsDir)
      .then((data) => {
        if (!cancelled) {
          setSpecs(data)
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

  const filtered = filter
    ? specs.filter(
        (s) =>
          s.id.toLowerCase().includes(filter.toLowerCase()) ||
          s.entity_type.toLowerCase().includes(filter.toLowerCase()) ||
          (s.summary?.toLowerCase().includes(filter.toLowerCase()) ?? false),
      )
    : specs

  if (error) {
    return <div className="p-4 text-sm text-red-600">Error loading specs: {error}</div>
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter specs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
        <span className="text-xs text-muted-foreground">{filtered.length} specs</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-4">ID</th>
            <th className="pb-2 pr-4">Type</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Level</th>
            <th className="pb-2 pr-4">{translate(locale, 'spec.overview.revision')}</th>
            <th className="pb-2 pr-4">{translate(locale, 'spec.overview.baseline')}</th>
            <th className="pb-2">Summary</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((spec) => (
            <tr key={spec.id} className="border-b border-border/50 hover:bg-muted/50">
              <td className="py-1.5 pr-4 font-mono text-xs">{spec.id}</td>
              <td className="py-1.5 pr-4 text-xs">{spec.entity_type}</td>
              <td className="py-1.5 pr-4">
                <SpecStatusBadge status={spec.status} />
              </td>
              <td className="py-1.5 pr-4">
                {spec.level && <LevelBadge level={spec.level} />}
                {spec.progress && <TaskProgressBadge progress={spec.progress} />}
              </td>
              <td className="py-1.5 pr-4 font-mono text-xs">{spec.revision}</td>
              <td className="py-1.5 pr-4 font-mono text-xs text-muted-foreground">
                {spec.spec_baseline}
              </td>
              <td className="py-1.5 text-xs text-muted-foreground">
                {spec.summary ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
