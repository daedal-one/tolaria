import { cn } from '@/lib/utils'
import { STATUS_COLORS } from '@/utils/specs/types'

interface SpecStatusBadgeProps {
  status: string
  className?: string
}

export function SpecStatusBadge({ status, className }: SpecStatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        colors,
        className,
      )}
    >
      {status}
    </span>
  )
}
