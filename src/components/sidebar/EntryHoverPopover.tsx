import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import type { VaultEntry } from '../../types'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'

/** Delay before the hover popover opens, in milliseconds. Mirrors the
 *  industry-standard tooltip dwell time so quick mouse moves don't flash
 *  the popover open. */
export const HOVER_OPEN_DELAY_MS = 250

interface EntryHoverPopoverProps {
  entry: VaultEntry
  children: ReactNode
  locale?: AppLocale
}

interface FrontmatterField {
  labelKey: TranslationKey
  value: string
}

function stringValue(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number') return String(value)
  return null
}

function arrayValue(value: unknown): string | null {
  if (!Array.isArray(value)) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    return null
  }
  const items = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
  return items.length ? items.join(', ') : null
}

function pickRelationship(entry: VaultEntry, keys: readonly string[]): string | null {
  const relationships = entry.relationships ?? {}
  for (const key of keys) {
    const value = Reflect.get(relationships, key) as unknown
    const text = arrayValue(value)
    if (text) return text
  }
  const props = entry.properties ?? {}
  for (const key of keys) {
    const value = Reflect.get(props, key) as unknown
    const text = arrayValue(value)
    if (text) return text
  }
  return null
}

function pushField(
  fields: FrontmatterField[],
  labelKey: TranslationKey,
  value: string | null,
): void {
  if (value) fields.push({ labelKey, value })
}

function collectScalarFields(entry: VaultEntry, fields: FrontmatterField[]): void {
  const props = entry.properties ?? {}
  pushField(fields, 'sidebar.specs.field.type', entry.isA)
  pushField(fields, 'sidebar.specs.field.status', stringValue(props.status) ?? entry.status)
  pushField(fields, 'sidebar.specs.field.level', stringValue(props.level))
  pushField(fields, 'sidebar.specs.field.progress', stringValue(props.progress))
  pushField(fields, 'sidebar.specs.field.version', stringValue(props.version))
}

function collectRelationshipFields(entry: VaultEntry, fields: FrontmatterField[]): void {
  pushField(fields, 'sidebar.specs.field.owners', pickRelationship(entry, ['owners', 'Owners']))
  pushField(fields, 'sidebar.specs.field.refines', pickRelationship(entry, ['refines', 'Refines']))
  pushField(fields, 'sidebar.specs.field.related', pickRelationship(entry, ['related', 'Related']))
  pushField(
    fields,
    'sidebar.specs.field.categorizedUnder',
    pickRelationship(entry, ['categorized_under', 'Categorized under', 'categorizedUnder']),
  )
  pushField(fields, 'sidebar.specs.field.tags', pickRelationship(entry, ['tags', 'Tags']))
}

function buildFrontmatterFields(entry: VaultEntry): FrontmatterField[] {
  const fields: FrontmatterField[] = []
  collectScalarFields(entry, fields)
  collectRelationshipFields(entry, fields)
  return fields
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="contents">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="text-[12px] text-foreground break-words">{value}</div>
    </div>
  )
}

function FrontmatterGrid({ fields, locale }: { fields: FrontmatterField[]; locale: AppLocale }) {
  if (fields.length === 0) return null
  return (
    <div
      data-testid="entry-hover-content"
      className="grid grid-cols-[max-content_1fr]"
      style={{ gap: '4px 12px' }}
    >
      {fields.map((field) => (
        <FieldRow
          key={field.labelKey}
          label={translate(locale, field.labelKey)}
          value={field.value}
        />
      ))}
    </div>
  )
}

/**
 * Wraps an arbitrary trigger (sidebar entry title) with a Radix popover that
 * opens after `HOVER_OPEN_DELAY_MS` on `pointerEnter` and closes on
 * `pointerLeave`. Content is a compact key/value grid of the entry's
 * frontmatter; empty fields are omitted.
 *
 * Composition only — does not modify or replace the trigger structure.
 */
export function EntryHoverPopover({ entry, children, locale = 'en' }: EntryHoverPopoverProps) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fields = useMemo(() => buildFrontmatterFields(entry), [entry])

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handlePointerEnter = useCallback(() => {
    if (fields.length === 0) return
    clearTimer()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setOpen(true)
    }, HOVER_OPEN_DELAY_MS)
  }, [clearTimer, fields.length])

  const handlePointerLeave = useCallback(() => {
    clearTimer()
    setOpen(false)
  }, [clearTimer])

  if (fields.length === 0) {
    return (
      <span
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className="contents"
      >
        {children}
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          className="contents"
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-80 p-3"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <FrontmatterGrid fields={fields} locale={locale} />
      </PopoverContent>
    </Popover>
  )
}
