import { cn } from '@/lib/utils'
import { PROGRESS_COLORS } from '@/utils/specs/types'

interface TaskProgressBadgeProps {
  progress: string
  className?: string
}

export function TaskProgressBadge({ progress, className }: TaskProgressBadgeProps) {
  const colors = PROGRESS_COLORS[progress] ?? 'bg-gray-100 text-gray-600'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        colors,
        className,
      )}
    >
      {progress}
    </span>
  )
}

interface TaskProgressBarProps {
  counts: Record<string, number>
  className?: string
}

export function TaskProgressBar({ counts, className }: TaskProgressBarProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (total === 0) return null

  const order = ['done', 'in-progress', 'pending', 'blocked', 'deferred', 'wontdo']
  const barColors: Record<string, string> = {
    done: 'bg-green-500',
    'in-progress': 'bg-blue-500',
    pending: 'bg-gray-300',
    blocked: 'bg-red-500',
    deferred: 'bg-amber-400',
    wontdo: 'bg-gray-400',
  }

  return (
    <div className={cn('flex h-2 w-full overflow-hidden rounded-full', className)}>
      {order.map((state) => {
        const count = counts[state] ?? 0
        if (count === 0) return null
        const pct = (count / total) * 100
        return (
          <div
            key={state}
            className={barColors[state] ?? 'bg-gray-200'}
            style={{ width: `${pct}%` }}
            title={`${state}: ${count}`}
          />
        )
      })}
    </div>
  )
}
