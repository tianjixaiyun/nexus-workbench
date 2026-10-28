import type { Note, Task } from '@/lib/data/types'
import ical from 'ical-generator'

/** 引号与换行符合 CSV，类公式文本加前缀，避免表格软件自动执行。 */
function csvCell(value: unknown): string {
  let text = String(value ?? '')
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function tasksToCsv(tasks: Task[]): string {
  const headers = ['标题', '描述', '状态', '优先级', '截止日期', '截止时间', '重复', '标签', '子任务', '创建时间', '完成时间']
  const rows = tasks.filter(task => !task.deletedAt).map(task => [task.title, task.description, task.status, task.priority, task.dueDate, task.dueTime, task.recurrence, (task.tags ?? []).join(' / '), (task.subtasks ?? []).map(item => `${item.done ? '[x]' : '[ ]'} ${item.title}`).join('\n'), task.createdAt, task.completedAt])
  return '\ufeff' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export function notesToMarkdown(notes: Note[]): string {
  const active = notes.filter(note => !note.deletedAt)
  return '# NEXUS 笔记导出\n\n' + active.map(note => `## ${note.title.replace(/[\r\n]+/g, ' ').trim() || '未命名'}\n\n${note.content}\n`).join('\n---\n\n')
}

/** 使用设备本地时区生成独立截止标记；不生成自动重复或提醒。 */
export function tasksToCalendar(tasks: Task[]): string {
  const eligible = tasks.filter(task => !task.deletedAt && task.status !== 'done' && task.dueDate)
  if (!eligible.length) throw new Error('没有带截止日期的未完成任务可导出。')
  const calendar = ical({ name: 'NEXUS 截止任务' })
  for (const task of eligible) {
    const due = task.dueDate!
    const parsed = new Date(`${due}T12:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== due) throw new Error('有任务的截止日期无效，请先检查任务后重试。')
    let start: Date | string = due
    if (task.dueTime) {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.dueTime)) throw new Error('有任务的截止时间无效，请先检查任务后重试。')
      const [year, month, day] = due.split('-').map(Number)
      const [hours, minutes] = task.dueTime.split(':').map(Number)
      const local = new Date(year, month - 1, day, hours, minutes)
      if (local.getFullYear() !== year || local.getMonth() !== month - 1 || local.getDate() !== day || local.getHours() !== hours || local.getMinutes() !== minutes) throw new Error('有任务的时间在当前时区不存在，请先调整后重试。')
      start = local
    }
    calendar.createEvent({ id: `${encodeURIComponent(task.id)}@nexus-workbench`, start, allDay: !task.dueTime, summary: task.title, description: `NEXUS 任务截止标记（非自动同步）${task.description ? `\n\n${task.description}` : ''}` })
  }
  return calendar.toString()
}
