/**
 * SpecIdChip — monospace chip showing the spec ID with a hover-triggered
 * popover that reveals the full frontmatter as a key/value grid.
 *
 * The hover opens with a 250ms delay to avoid noise as the cursor passes
 * over the breadcrumb. Click is *not* a special action — the chip is a
 * pure information surface (no navigation yet).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover'
import { translate, type AppLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { SpecMeta } from '@/hooks/useSpecForActiveNote'

const HOVER_OPEN_DELAY_MS = 250

interface SpecIdChipProps {
  meta: SpecMeta
  locale?: AppLocale
}

interface FieldRow {
  labelKey: Parameters<typeof translate>[1]
  value: ReactNode
}

function buildFieldRows(meta: SpecMeta): FieldRow[] {
  const rows: FieldRow[] = [
    { labelKey: 'breadcrumb.spec.field.id', value: meta.id },
    { labelKey: 'breadcrumb.spec.field.type', value: meta.entityType },
  ]
  if (meta.status) rows.push({ labelKey: 'breadcrumb.spec.field.status', value: meta.status })
  if (meta.level) rows.push({ labelKey: 'breadcrumb.spec.field.level', value: meta.level })
  if (meta.progress) rows.push({ labelKey: 'breadcrumb.spec.field.progress', value: meta.progress })
  if (meta.owners.length > 0) {
    rows.push({ labelKey: 'breadcrumb.spec.field.owners', value: meta.owners.join(', ') })
  }
  if (meta.refines.length > 0) {
    rows.push({
      labelKey: 'breadcrumb.spec.field.refines',
      value: <MultilineValue items={meta.refines} />,
    })
  }
  if (meta.related.length > 0) {
    rows.push({
      labelKey: 'breadcrumb.spec.field.related',
      value: <MultilineValue items={meta.related} />,
    })
  }
  if (meta.categorizedUnder.length > 0) {
    rows.push({
      labelKey: 'breadcrumb.spec.field.categorizedUnder',
      value: <MultilineValue items={meta.categorizedUnder} />,
    })
  }
  return rows
}

function MultilineValue({ items }: { items: string[] }) {
  return (
    <span className="flex flex-col gap-0.5">
      {items.map((item) => (
        <span key={item} className="font-mono text-[11px]">{item}</span>
      ))}
    </span>
  )
}

function FrontmatterGrid({ meta, locale }: { meta: SpecMeta; locale: AppLocale }) {
  const rows = buildFieldRows(meta)
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-xs">
      {rows.map((row) => (
        <FrontmatterRow
          key={String(row.labelKey)}
          label={translate(locale, row.labelKey)}
          value={row.value}
        />
      ))}
    </dl>
  )
}

function FrontmatterRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-[11px] text-foreground">{value}</dd>
    </>
  )
}

function useDelayedHoverOpen(delay: number) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => clearTimer(), [clearTimer])

  const scheduleOpen = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(() => setOpen(true), delay)
  }, [clearTimer, delay])

  const cancelAndClose = useCallback(() => {
    clearTimer()
    setOpen(false)
  }, [clearTimer])

  return { open, setOpen, scheduleOpen, cancelAndClose }
}

export function SpecIdChip({ meta, locale = 'en' }: SpecIdChipProps) {
  const { open, setOpen, scheduleOpen, cancelAndClose } = useDelayedHoverOpen(HOVER_OPEN_DELAY_MS)
  const ariaLabel = translate(locale, 'breadcrumb.spec.idLabel')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onPointerEnter={scheduleOpen}
        onPointerLeave={cancelAndClose}
        onFocus={scheduleOpen}
        onBlur={cancelAndClose}
        aria-label={ariaLabel}
        data-testid="spec-id-chip"
        className={cn(
          'inline-flex items-center rounded border border-border bg-muted/40 px-1.5 py-0.5',
          'font-mono text-[11px] leading-none text-foreground hover:bg-muted',
        )}
      >
        {meta.id}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-80"
        onPointerEnter={scheduleOpen}
        onPointerLeave={cancelAndClose}
      >
        <PopoverHeader>
          <PopoverTitle>{translate(locale, 'breadcrumb.spec.popoverTitle')}</PopoverTitle>
        </PopoverHeader>
        <div className="mt-2">
          <FrontmatterGrid meta={meta} locale={locale} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
