import type { Task, TaskPriority, TaskStatus } from '@/lib/data/types'
import { toDateStr } from '@/lib/utils'
import { PRIORITY_ORDER } from './taskMeta'

export type TaskScope = 'all' | 'inbox' | 'today' | 'upcoming' | 'overdue' | 'done'
export type TaskSort = 'smart' | 'due' | 'newest' | 'title'
export interface TaskFilters {
  scope: TaskScope
  search: string
  status: 'all' | TaskStatus
  priority: 'all' | TaskPriority
  tag: string
  sort: TaskSort
}
export const TASK_SCOPES: { value: TaskScope; label: string; hint: string }[] = [
  { value: 'all', label: '全部', hint: '所有未删除任务' },
  { value: 'inbox', label: '未排期', hint: '尚未安排截止日期的未完成任务' },
  { value: 'today', label: '今日行动', hint: '截至今天到期的未完成任务，包含逾期' },
  { value: 'upcoming', label: '未来 7 天', hint: '从今天起的七个自然日，尚未完成' },
  { value: 'overdue', label: '已逾期', hint: '今天以前到期且尚未完成' },
  { value: 'done', label: '已完成', hint: '已经完成的任务' },
]
export const DEFAULT_FILTERS: TaskFilters = { scope: 'all', search: '', status: 'all', priority: 'all', tag: '', sort: 'smart' }

export function readFilters(params: URLSearchParams): TaskFilters {
  const scope = params.get('scope')
  const status = params.get('status')
  const priority = params.get('priority')
  const sort = params.get('sort')
  return {
    scope: TASK_SCOPES.some(s => s.value === scope) ? scope as TaskScope : 'all',
    search: params.get('q') ?? '',
    status: status === 'todo' || status === 'doing' || status === 'done' ? status : 'all',
    priority: priority === 'high' || priority === 'medium' || priority === 'low' ? priority : 'all',
    tag: params.get('tag') ?? '',
    sort: sort === 'due' || sort === 'newest' || sort === 'title' ? sort : 'smart',
  }
}

export function shiftDay(day: string, amount: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return toDateStr(new Date(y, m - 1, d + amount))
}

function matchesScope(task: Task, scope: TaskScope, today: string): boolean {
  if (task.deletedAt) return false
  if (scope === 'all') return true
  if (scope === 'done') return task.status === 'done'
  if (task.status === 'done') return false
  if (scope === 'inbox') return !task.dueDate
  if (scope === 'today') return Boolean(task.dueDate && task.dueDate <= today)
  if (scope === 'overdue') return Boolean(task.dueDate && task.dueDate < today)
  return Boolean(task.dueDate && task.dueDate >= today && task.dueDate <= shiftDay(today, 6))
}

export function taskScopeCounts(tasks: Task[], today: string): Record<TaskScope, number> {
  return Object.fromEntries(TASK_SCOPES.map(({ value }) => [value, tasks.filter(t => matchesScope(t, value, today)).length])) as Record<TaskScope, number>
}

export function filterTasks(tasks: Task[], filters: TaskFilters, today: string): Task[] {
  const kw = filters.search.trim().toLocaleLowerCase()
  return tasks.filter(task => {
    if (!matchesScope(task, filters.scope, today)) return false
    if (filters.status !== 'all' && task.status !== filters.status) return false
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    const tags = Array.isArray(task.tags) ? task.tags : []
    if (filters.tag && !tags.includes(filters.tag)) return false
    return !kw || [task.title, task.description, ...tags].join(' ').toLocaleLowerCase().includes(kw)
  }).sort((a, b) => {
    const done = Number(a.status === 'done') - Number(b.status === 'done')
    if (done) return done
    if (filters.sort === 'title') return a.title.localeCompare(b.title, 'zh-CN')
    if (filters.sort === 'newest') return b.createdAt.localeCompare(a.createdAt)
    if (filters.sort === 'smart') {
      const priority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (priority) return priority
    }
    const date = (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
    return date || b.createdAt.localeCompare(a.createdAt)
  })
}

export function readTaskView(params: URLSearchParams, saved: string | null): 'list' | 'kanban' | 'calendar' | 'agenda' {
  const requested = params.get('view')
  if (requested === 'list' || requested === 'kanban' || requested === 'calendar' || requested === 'agenda') return requested
  if (['scope', 'q', 'tag', 'status', 'priority', 'sort', 'task'].some(key => params.has(key))) return 'list'
  return saved === 'kanban' || saved === 'calendar' || saved === 'agenda' ? saved : 'list'
}

const FILTER_PARAMS: Record<keyof TaskFilters, string> = { scope: 'scope', search: 'q', status: 'status', priority: 'priority', tag: 'tag', sort: 'sort' }

export function patchTaskFilters(params: URLSearchParams, patch: Partial<TaskFilters>): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const key of Object.keys(patch) as (keyof TaskFilters)[]) {
    const value = patch[key]
    if (value === undefined) continue
    if (value === DEFAULT_FILTERS[key]) next.delete(FILTER_PARAMS[key])
    else next.set(FILTER_PARAMS[key], value)
  }
  return next
}

export type TaskTarget = { kind: 'none' | 'loading' | 'missing' } | { kind: 'edit'; task: Task }

export function resolveTaskTarget(id: string | null, tasks: Task[], loaded: boolean): TaskTarget {
  if (id === null) return { kind: 'none' }
  if (!loaded) return { kind: 'loading' }
  const task = tasks.find(item => item.id === id && !item.deletedAt)
  return task ? { kind: 'edit', task } : { kind: 'missing' }
}

export function taskInitialTags(task?: Pick<Task, 'tags'> | null, defaultTag?: string): string[] {
  if (task) return Array.isArray(task.tags) ? [...task.tags] : []
  return defaultTag ? [defaultTag] : []
}

export function kanbanTargetIndex(tasks: Task[], activeId: string, status: TaskStatus, overId: string | null): number {
  const column = tasks.filter(task => !task.deletedAt && task.status === status).sort((a, b) => a.sortOrder - b.sortOrder)
  const index = overId === null ? -1 : column.findIndex(task => task.id === overId)
  return index >= 0 ? index : column.filter(task => task.id !== activeId).length
}
