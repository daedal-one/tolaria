import type { ReactNode } from 'react'
import { ListBullets, Kanban, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { translate, type AppLocale } from '../../lib/i18n'
import { SidebarGroupHeader } from './SidebarGroupHeader'
import { SIDEBAR_SECTION_CONTENT_PADDING_BOTTOM } from './sidebarStyles'

export type SpecView = 'overview' | 'tasks' | 'lint'

export interface SpecsSectionProps {
  collapsed: boolean
  onToggle: () => void
  onOpenSpecView: (view: SpecView) => void
  activeView?: SpecView | null
  locale?: AppLocale
}

interface SpecsActionButtonProps {
  active: boolean
  ariaLabel: string
  icon: ReactNode
  label: string
  onClick: () => void
  title: string
}

function SpecsActionButton({ active, ariaLabel, icon, label, onClick, title }: SpecsActionButtonProps) {
  const stateClass = active
    ? 'bg-accent text-accent-foreground'
    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={ariaLabel}
      title={title}
      data-active={active || undefined}
      className={`h-7 w-full justify-start gap-2 rounded-sm px-2 py-1 text-left text-[13px] font-normal ${stateClass}`}
      onClick={(event) => { event.stopPropagation(); onClick() }}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Button>
  )
}

export function SpecsSection({
  collapsed,
  onToggle,
  onOpenSpecView,
  activeView,
  locale = 'en',
}: SpecsSectionProps) {
  const groupLabel = translate(locale, 'sidebar.specs.group')

  return (
    <div className="border-b border-border" style={{ padding: '0 6px' }}>
      <SidebarGroupHeader label={groupLabel} collapsed={collapsed} onToggle={onToggle} />
      {!collapsed && (
        <div className="flex flex-col gap-0.5" style={{ paddingBottom: SIDEBAR_SECTION_CONTENT_PADDING_BOTTOM }}>
          <SpecsActionButton
            active={activeView === 'overview'}
            ariaLabel={translate(locale, 'sidebar.specs.overview')}
            icon={<ListBullets size={14} />}
            label={translate(locale, 'sidebar.specs.overview')}
            onClick={() => onOpenSpecView('overview')}
            title={translate(locale, 'sidebar.specs.overviewTitle')}
          />
          <SpecsActionButton
            active={activeView === 'tasks'}
            ariaLabel={translate(locale, 'sidebar.specs.tasks')}
            icon={<Kanban size={14} />}
            label={translate(locale, 'sidebar.specs.tasks')}
            onClick={() => onOpenSpecView('tasks')}
            title={translate(locale, 'sidebar.specs.tasksTitle')}
          />
          <SpecsActionButton
            active={activeView === 'lint'}
            ariaLabel={translate(locale, 'sidebar.specs.lint')}
            icon={<WarningCircle size={14} />}
            label={translate(locale, 'sidebar.specs.lint')}
            onClick={() => onOpenSpecView('lint')}
            title={translate(locale, 'sidebar.specs.lintTitle')}
          />
        </div>
      )}
    </div>
  )
}
