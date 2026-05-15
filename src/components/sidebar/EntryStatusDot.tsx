import type { VaultEntry } from '../../types'
import { getEntryStatusDotColor } from './entryStatusDotColor'

interface EntryStatusDotProps {
  entry: VaultEntry
}

/** A 6px coloured circle that signals the entry's spec status/progress.
 *  Renders nothing for non-spec entries. */
export function EntryStatusDot({ entry }: EntryStatusDotProps) {
  const color = getEntryStatusDotColor(entry)
  if (!color) return null

  return (
    <span
      data-testid="entry-status-dot"
      aria-hidden="true"
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '9999px',
        background: color,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  )
}
