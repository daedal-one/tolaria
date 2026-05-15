import { FolderOpen } from '@phosphor-icons/react'
import type { VaultEntry, SidebarSelection } from '../../types'
import type { AuxRootSection, AuxRootSubGroup } from '../../utils/sidebarSections'
import { isSelectionActive } from '../SidebarParts'
import { SidebarGroupHeader } from './SidebarGroupHeader'
import { SIDEBAR_ITEM_PADDING, SIDEBAR_SECTION_CONTENT_PADDING_BOTTOM } from './sidebarStyles'
import { EntryStatusDot } from './EntryStatusDot'
import { EntryHoverPopover } from './EntryHoverPopover'
import { translate, type AppLocale } from '../../lib/i18n'
import { cn } from '@/lib/utils'

interface AuxRootSectionsProps {
  sections: AuxRootSection[]
  selection: SidebarSelection
  onSelectEntry?: (entry: VaultEntry) => void
  collapsed?: boolean
  onToggle?: () => void
  locale?: AppLocale
}

function AuxEntryRow({
  entry,
  isActive,
  onSelect,
  locale,
}: {
  entry: VaultEntry
  isActive: boolean
  onSelect: () => void
  locale: AppLocale
}) {
  return (
    <div
      className={cn(
        'group/aux-entry flex cursor-pointer select-none items-center rounded transition-colors',
        isActive ? 'bg-accent' : 'hover:bg-accent',
      )}
      style={{ padding: SIDEBAR_ITEM_PADDING.regular, borderRadius: 4, gap: 6 }}
      onClick={onSelect}
    >
      <EntryStatusDot entry={entry} />
      <EntryHoverPopover entry={entry} locale={locale}>
        <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
          {entry.title}
        </span>
      </EntryHoverPopover>
    </div>
  )
}

function AuxSubGroup({
  subGroup,
  selection,
  onSelectEntry,
  locale,
}: {
  subGroup: AuxRootSubGroup
  selection: SidebarSelection
  onSelectEntry?: (entry: VaultEntry) => void
  locale: AppLocale
}) {
  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      <div
        className="text-[10px] font-semibold uppercase text-muted-foreground"
        style={{ padding: '4px 8px 2px', letterSpacing: 0.5 }}
      >
        {subGroup.label}
      </div>
      {subGroup.entries.map((entry) => (
        <AuxEntryRow
          key={entry.path}
          entry={entry}
          isActive={isSelectionActive(selection, { kind: 'entity', entry })}
          onSelect={() => onSelectEntry?.(entry)}
          locale={locale}
        />
      ))}
    </div>
  )
}

function AuxRootSectionView({
  section,
  selection,
  onSelectEntry,
  locale,
}: {
  section: AuxRootSection
  selection: SidebarSelection
  onSelectEntry?: (entry: VaultEntry) => void
  locale: AppLocale
}) {
  const totalEntries = section.subGroups.reduce((acc, group) => acc + group.entries.length, 0)

  return (
    <div className="border-b border-border" style={{ padding: '0 6px' }} data-testid={`aux-root-section-${section.rootLabel}`}>
      <div
        className="flex items-center text-muted-foreground"
        style={{ padding: '6px 8px', gap: 6 }}
      >
        <FolderOpen size={14} weight="regular" />
        <span className="flex-1 text-[10px] font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
          {section.label}
        </span>
        <span className="text-[10px] tabular-nums">{totalEntries}</span>
      </div>
      <div
        className="flex flex-col"
        style={{ gap: 4, paddingBottom: SIDEBAR_SECTION_CONTENT_PADDING_BOTTOM }}
      >
        {section.subGroups.map((subGroup) => (
          <AuxSubGroup
            key={subGroup.type}
            subGroup={subGroup}
            selection={selection}
            onSelectEntry={onSelectEntry}
            locale={locale}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Render one sidebar section per auxiliary vault root (forge-spec `.specs/`).
 * Each section lists its entries sub-grouped by `isA` and wires every title
 * to {@link EntryHoverPopover}. Returns null when there are no sections.
 */
export function AuxRootSections({
  sections,
  selection,
  onSelectEntry,
  collapsed = false,
  onToggle,
  locale = 'en',
}: AuxRootSectionsProps) {
  if (sections.length === 0) return null

  if (onToggle) {
    return (
      <div className="border-b border-border" style={{ padding: '0 6px' }}>
        <SidebarGroupHeader
          label={translate(locale, 'sidebar.specs.section.label').toUpperCase()}
          collapsed={collapsed}
          onToggle={onToggle}
          count={sections.length}
        />
        {!collapsed && sections.map((section) => (
          <AuxRootSectionView
            key={section.rootLabel}
            section={section}
            selection={selection}
            onSelectEntry={onSelectEntry}
            locale={locale}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      {sections.map((section) => (
        <AuxRootSectionView
          key={section.rootLabel}
          section={section}
          selection={selection}
          onSelectEntry={onSelectEntry}
          locale={locale}
        />
      ))}
    </>
  )
}
