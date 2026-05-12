import { useEffect, useState } from 'react'
import type { TaskEntry } from '@/utils/specs/types'
import { listTasks } from '@/utils/specs/api'
import { TaskProgressBadge } from './TaskProgressBadge'

interface TaskBoardProps {
  specsDir: string
}

const COLUMNS = [
  { key: 'pending', label: 'Pending' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'done', label: 'Done' },
  { key: 'deferred', label: 'Deferred' },
  { key: 'wontdo', label: 'Won\'t Do' },
] as const

export function TaskBoard({ specsDir }: TaskBoardProps) {
  const [tasks, setTasks] = useState<TaskEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listTasks(specsDir, 'all')
      .then((data) => {
        if (!cancelled) {
          setTasks(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [specsDir])

  if (error) {
    return <div className="p-4 text-sm text-red-600">Error loading tasks: {error}</div>
  }

  const grouped = new Map<string, TaskEntry[]>()
  for (const col of COLUMNS) {
    grouped.set(col.key, [])
  }
  for (const task of tasks) {
    const list = grouped.get(task.progress)
    if (list) list.push(task)
  }

  return (
    <div className="flex gap-3 overflow-x-auto p-4">
      {COLUMNS.map((col) => {
        const columnTasks = grouped.get(col.key) ?? []
        return (
          <div
            key={col.key}
            className="flex min-w-[220px] flex-col gap-2 rounded-lg bg-muted/30 p-3"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              {col.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                {columnTasks.length}
              </span>
            </div>
            {columnTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-md border border-border bg-background p-2.5"
              >
                <div className="mb-1 font-mono text-[11px] text-muted-foreground">
                  {task.id}
                </div>
                <div className="text-xs">
                  {task.summary ?? task.id}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <TaskProgressBadge progress={task.progress} />
                  {task.assignee && (
                    <span className="text-[10px] text-muted-foreground">
                      {task.assignee}
                    </span>
                  )}
                </div>
                {task.blocked_by.length > 0 && (
                  <div className="mt-1 text-[10px] text-red-500">
                    Blocked by: {task.blocked_by.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
