/**
 * SpecChipStrip — horizontal strip of forge-spec metadata chips, rendered
 * below the breadcrumb title when the active entry is a spec.
 *
 * Returns null for non-spec entries so the breadcrumb stays clean for
 * regular notes.
 */
import { useSpecForActiveNote, type SpecMeta } from '@/hooks/useSpecForActiveNote'
import type { VaultEntry } from '@/types'
import { translate, type AppLocale } from '@/lib/i18n'
import { SpecIdChip } from './SpecIdChip'
import { SpecStatusBadge } from './SpecStatusBadge'
import { LevelBadge } from './LevelBadge'
import { TaskProgressBadge } from './TaskProgressBadge'

interface SpecChipStripProps {
  entry: VaultEntry | null | undefined
  locale?: AppLocale
}

function OwnersLabel({ owners, locale }: { owners: string[]; locale: AppLocale }) {
  if (owners.length === 0) return null
  return (
    <span
      data-testid="spec-owners-label"
      className="truncate text-[11px] text-muted-foreground"
    >
      {translate(locale, 'breadcrumb.spec.ownersLabel', { owners: owners.join(', ') })}
    </span>
  )
}

function StatusOrProgress({ meta }: { meta: SpecMeta }) {
  if (meta.entityType === 'spec-task' && meta.progress) {
    return <TaskProgressBadge progress={meta.progress} />
  }
  if (meta.status) return <SpecStatusBadge status={meta.status} />
  return null
}

function LevelOrNull({ meta }: { meta: SpecMeta }) {
  if (meta.entityType !== 'requirement' || !meta.level) return null
  return <LevelBadge level={meta.level} />
}

export function SpecChipStrip({ entry, locale = 'en' }: SpecChipStripProps) {
  const meta = useSpecForActiveNote(entry)
  if (!meta) return null

  return (
    <div
      data-testid="spec-chip-strip"
      className="breadcrumb-bar__spec-strip flex min-w-0 flex-wrap items-center gap-1.5"
    >
      <SpecIdChip meta={meta} locale={locale} />
      <StatusOrProgress meta={meta} />
      <LevelOrNull meta={meta} />
      <OwnersLabel owners={meta.owners} locale={locale} />
    </div>
  )
}
