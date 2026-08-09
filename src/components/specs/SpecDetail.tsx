import { useEffect, useState } from 'react'
import { MarkdownContent } from '@/components/MarkdownContent'
import { translate, type AppLocale } from '@/lib/i18n'
import { getSpec } from '@/utils/specs/api'
import type { SpecFull } from '@/utils/specs/types'
import { LevelBadge } from './LevelBadge'
import { SpecStatusBadge } from './SpecStatusBadge'
import { TaskProgressBadge } from './TaskProgressBadge'

interface SpecDetailProps {
  specsDir: string
  id: string
  locale: AppLocale
  onBack: () => void
  onSelectSpec: (id: string) => void
}

function ReferenceList({
  values,
  onSelectSpec,
}: {
  values: string[]
  onSelectSpec: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelectSpec(value.split('#')[0])}
          className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-foreground hover:bg-muted"
        >
          {value}
        </button>
      ))}
    </div>
  )
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-1.5 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  )
}

function SpecMetadata({ spec, locale, onSelectSpec }: {
  spec: SpecFull
  locale: AppLocale
  onSelectSpec: (id: string) => void
}) {
  return (
    <dl className="rounded-lg border border-border bg-muted/10 px-4 py-2">
      <DetailField label={translate(locale, 'sidebar.specs.field.type')}>
        {spec.entity_type}
      </DetailField>
      <DetailField label={translate(locale, 'spec.overview.revision')}>
        <span className="font-mono">{spec.revision}</span>
      </DetailField>
      <DetailField label={translate(locale, 'spec.overview.baseline')}>
        <span className="font-mono">{spec.spec_baseline}</span>
      </DetailField>
      {spec.owners.length > 0 && (
        <DetailField label={translate(locale, 'sidebar.specs.field.owners')}>
          {spec.owners.join(', ')}
        </DetailField>
      )}
      {spec.refines.length > 0 && (
        <DetailField label={translate(locale, 'sidebar.specs.field.refines')}>
          <ReferenceList values={spec.refines} onSelectSpec={onSelectSpec} />
        </DetailField>
      )}
      {spec.related.length > 0 && (
        <DetailField label={translate(locale, 'sidebar.specs.field.related')}>
          <ReferenceList values={spec.related} onSelectSpec={onSelectSpec} />
        </DetailField>
      )}
    </dl>
  )
}

export function SpecDetail({ specsDir, id, locale, onBack, onSelectSpec }: SpecDetailProps) {
  const [spec, setSpec] = useState<SpecFull | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getSpec(specsDir, id)
      .then((data) => {
        if (!cancelled) setSpec(data)
      })
      .catch((reason) => {
        if (!cancelled) setError(String(reason))
      })
    return () => {
      cancelled = true
    }
  }, [id, specsDir])

  if (error) {
    return (
      <div className="p-4">
        <button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          ← {translate(locale, 'sidebar.specs.overview')}
        </button>
        <div role="alert" className="mt-4 text-sm text-red-600">{error}</div>
      </div>
    )
  }

  if (!spec) {
    return <div className="p-4 text-sm text-muted-foreground">{translate(locale, 'inspector.spec.loading')}</div>
  }

  return (
    <div data-testid="spec-detail" className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-5">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <button type="button" onClick={onBack} className="mb-3 text-sm text-muted-foreground hover:text-foreground">
            ← {translate(locale, 'sidebar.specs.overview')}
          </button>
          <div className="font-mono text-sm font-medium text-foreground">{spec.id}</div>
          {spec.summary && <p className="mt-1 text-sm text-muted-foreground">{spec.summary}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SpecStatusBadge status={spec.status} />
            {spec.level && <LevelBadge level={spec.level} />}
            {spec.progress && <TaskProgressBadge progress={spec.progress} />}
          </div>
        </div>
        <div className="max-w-[40%] truncate font-mono text-[11px] text-muted-foreground" title={spec.source_path}>
          {spec.source_path}
        </div>
      </div>

      <SpecMetadata spec={spec} locale={locale} onSelectSpec={onSelectSpec} />

      <article className="spec-detail__body min-w-0 text-sm leading-7">
        <MarkdownContent content={spec.body} />
      </article>
    </div>
  )
}
