import Papa from 'papaparse'
import type { NewTask, TaskPriority, TaskRecurrence, TaskStatus } from '@/lib/data/types'
import { uid } from '@/lib/utils'
import type { CaptureRow } from './taskCapture'

const names: Record<string, string> = { 标题: 'title', title: 'title', 描述: 'description', description: 'description', 状态: 'status', status: 'status', 优先级: 'priority', priority: 'priority', 截止日期: 'dueDate', dueDate: 'dueDate', 截止时间: 'dueTime', dueTime: 'dueTime', 重复: 'recurrence', recurrence: 'recurrence', 标签: 'tags', tags: 'tags', 子任务: 'subtasks', subtasks: 'subtasks', 完成时间: 'completedAt', completedAt: 'completedAt' }
const statuses: Record<string, TaskStatus> = { todo: 'todo', doing: 'doing', done: 'done', 待办: 'todo', 进行中: 'doing', 已完成: 'done' }
const priorities: Record<string, TaskPriority> = { high: 'high', medium: 'medium', low: 'low', 高: 'high', 中: 'medium', 低: 'low' }
const recurrences: Record<string, TaskRecurrence> = { none: 'none', daily: 'daily', weekly: 'weekly', monthly: 'monthly', 不重复: 'none', 每天: 'daily', 每周: 'weekly', 每月: 'monthly' }

/** 支持 NEXUS 导出列和 title 等英文列；全部校验通过后才提供预览。 */
export function parseTaskCsv(text: string): CaptureRow[] {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' })
  if (parsed.errors.length) throw new Error('CSV 格式有误，请检查引号和分隔符。')
  const [header, ...rows] = parsed.data
  if (!header || !rows.length) throw new Error('CSV 没有任务内容。')
  if (rows.length > 50) throw new Error('每次最多导入 50 项，请分批处理。')
  const columns = header.map(cell => Object.hasOwn(names, cell.trim()) ? names[cell.trim()] : '')
  if (!columns.includes('title')) throw new Error('缺少“标题”或 title 列。')
  const recognized = columns.filter(Boolean)
  if (new Set(recognized).size !== recognized.length) throw new Error('CSV 包含重复的任务字段列。')
  return rows.map((cells, index) => {
    const fail = (message: string): never => { throw new Error(`第 ${index + 1} 条任务：${message}`) }
    if (cells.length > header.length) fail('列数多于表头。')
    const row = Object.fromEntries(columns.map((key, i) => [key, cells[i] ?? '']))
    const title = (row.title ?? '').trim()
    if (!title || title.length > 500) fail('标题为空或超过 500 字。')
    const dueDate = row.dueDate?.trim() || null
    if (dueDate) {
      const date = new Date(`${dueDate}T12:00:00Z`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dueDate) fail('截止日期应为有效的 YYYY-MM-DD。')
    }
    const dueTime = row.dueTime?.trim() || null
    if (dueTime && (!dueDate || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(dueTime))) fail('截止时间需要有效日期和 HH:mm 格式。')
    const statusKey = row.status?.trim() || 'todo'
    const priorityKey = row.priority?.trim() || 'medium'
    const recurrenceKey = row.recurrence?.trim() || 'none'
    const status = Object.hasOwn(statuses, statusKey) ? statuses[statusKey] : undefined
    const priority = Object.hasOwn(priorities, priorityKey) ? priorities[priorityKey] : undefined
    const recurrence = Object.hasOwn(recurrences, recurrenceKey) ? recurrences[recurrenceKey] : undefined
    if (!status || !priority || !recurrence) fail('状态、优先级或重复规则不受支持。')
    const completedAt = row.completedAt?.trim() || null
    if (completedAt && !Number.isFinite(Date.parse(completedAt))) fail('完成时间无效。')
    const subtasks = row.subtasks ? row.subtasks.split('\n').filter(Boolean).map(value => {
      const match = /^\[([ xX])\] (.+)$/.exec(value)
      if (!match) return fail('子任务格式应为 [ ] 标题 或 [x] 标题。')
      return { id: uid(), title: match[2], done: match[1].toLowerCase() === 'x' }
    }) : []
    const input: NewTask = { title, description: row.description ?? '', status, priority, dueDate, ...(dueTime ? { dueTime } : {}), recurrence, tags: row.tags ? row.tags.split(' / ').map(value => value.trim()).filter(Boolean) : [], subtasks, ...(status === 'done' && completedAt ? { completedAt } : {}) }
    return { raw: title, line: index + 2, input }
  })
}
