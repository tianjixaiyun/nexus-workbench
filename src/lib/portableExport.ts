import type { Note, Task } from '@/lib/data/types'

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
