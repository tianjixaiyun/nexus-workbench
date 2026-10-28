import type { Task } from '@/lib/data/types'
import { shiftDay } from './taskFilters'

export function mondayOf(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = new Date(year, month - 1, day).getDay()
  return shiftDay(date, -((weekday + 6) % 7))
}

export function weekGroups(tasks: Task[], monday: string): { date: string; tasks: Task[] }[] {
  const groups = Array.from({ length: 7 }, (_, index) => ({ date: shiftDay(monday, index), tasks: [] as Task[] }))
  const byDate = new Map(groups.map(group => [group.date, group.tasks]))
  for (const task of tasks) if (!task.deletedAt && task.dueDate) byDate.get(task.dueDate)?.push(task)
  for (const group of groups) group.tasks.sort((a, b) => (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99'))
  return groups
}
