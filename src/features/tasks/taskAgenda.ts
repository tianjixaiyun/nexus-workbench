import type { Task } from '@/lib/data/types'

export function groupAgendaTasks(tasks: Task[]): { date: string | null; tasks: Task[] }[] {
  const groups = new Map<string | null, Task[]>()
  for (const task of tasks) {
    if (task.deletedAt) continue
    const date = task.dueDate || null
    const group = groups.get(date) ?? []
    group.push(task)
    groups.set(date, group)
  }
  return [...groups].sort(([a], [b]) => {
    if (a === null) return b === null ? 0 : 1
    if (b === null) return -1
    return a.localeCompare(b)
  }).map(([date, rows]) => ({ date, tasks: rows }))
}
