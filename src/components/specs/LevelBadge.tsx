import { cn } from '@/lib/utils'
import { LEVEL_COLORS } from '@/utils/specs/types'

interface LevelBadgeProps {
  level: string
  className?: string
}

export function LevelBadge({ level, className }: LevelBadgeProps) {
  const colors = LEVEL_COLORS[level] ?? 'bg-gray-100 text-gray-600'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        colors,
        className,
      )}
    >
      {level}
    </span>
  )
}
