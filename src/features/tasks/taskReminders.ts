import type { Task } from '@/lib/data/types'

/** 只提示最近半小时到期的任务；较早的仍可在逾期视图中查看。 */
export function dueTaskReminders(tasks: Task[], now: Date): Task[] {
  return tasks.flatMap(task => {
    if (task.deletedAt || task.status === 'done' || !task.dueDate || !task.dueTime || !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.dueTime)) return []
    const [year, month, day] = task.dueDate.split('-').map(Number)
    const [hours, minutes] = task.dueTime.split(':').map(Number)
    const due = new Date(year, month - 1, day, hours, minutes)
    if (due.getFullYear() !== year || due.getMonth() !== month - 1 || due.getDate() !== day || due.getHours() !== hours || due.getMinutes() !== minutes) return []
    const age = now.getTime() - due.getTime()
    return age >= 0 && age < 30 * 60_000 ? [{ task, time: due.getTime() }] : []
  }).sort((a, b) => a.time - b.time).map(item => item.task)
}
