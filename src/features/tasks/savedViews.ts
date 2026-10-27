import { patchTaskFilters, readFilters, readTaskView } from '@/features/tasks/taskFilters'

export type TaskViewMode = 'list' | 'kanban' | 'calendar'
export type SavedViewOwner = { mode: 'local' } | { mode: 'cloud'; url: string; userId: string }
export interface SavedTaskView { id: string; name: string; query: string }
export const SAVED_TASK_VIEWS_LIMIT = 12
export const TASK_VIEW_QUERY_KEYS = ['scope', 'q', 'status', 'priority', 'tag', 'sort', 'view'] as const

function fail(message = '保存视图的数据已损坏或版本不兼容，当前筛选未改变。'): never { throw new Error(message) }
function validName(value: unknown): string {
  if (typeof value !== 'string') fail('视图名称必须是文字。')
  const name = value.trim()
  if (!name || name.length > 40 || /[\u0000-\u001f\u007f]/.test(name)) fail('视图名称请输入 1–40 个字符。')
  return name
}

/** Only filter/layout preferences belong in a saved view; entity deep links never do. */
export function canonicalTaskViewQuery(params: URLSearchParams, view?: TaskViewMode): string {
  const filters = readFilters(params)
  if (filters.search.length > 200 || filters.tag.length > 200) fail('搜索词或标签太长，暂不能保存为视图。')
  const result = patchTaskFilters(new URLSearchParams(), filters)
  result.set('view', view ?? readTaskView(params, null))
  return result.toString()
}

export function savedTaskViewsKey(owner: SavedViewOwner): string {
  if (owner.mode === 'local') return 'nexus:task-saved-views:v1:local'
  if (!owner.userId.trim()) fail('请登录后再管理保存视图。')
  const url = new URL(owner.url)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail('云项目地址无效。')
  const project = `${url.origin}${url.pathname.replace(/\/+$/, '')}`
  return `nexus:task-saved-views:v1:${encodeURIComponent(JSON.stringify([project, owner.userId]))}`
}

function validateViews(value: unknown): SavedTaskView[] {
  if (!Array.isArray(value) || value.length > SAVED_TASK_VIEWS_LIMIT) fail()
  const ids = new Set<string>()
  const names = new Set<string>()
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).sort().join(',') !== 'id,name,query') fail()
    const { id, name, query } = item as Record<string, unknown>
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(id) || ids.has(id)) fail()
    if (typeof query !== 'string' || query.length > 4000) fail()
    const cleanName = validName(name)
    if (name !== cleanName || names.has(cleanName.toLocaleLowerCase())) fail()
    const params = new URLSearchParams(query)
    for (const key of params.keys()) if (!TASK_VIEW_QUERY_KEYS.some(known => known === key) || params.getAll(key).length !== 1) fail()
    if (canonicalTaskViewQuery(params) !== query) fail()
    ids.add(id)
    names.add(cleanName.toLocaleLowerCase())
    return { id, name: cleanName, query }
  })
}

export function parseSavedTaskViews(raw: string | null): SavedTaskView[] {
  if (raw === null) return []
  if (raw.length > 65_536) fail()
  let data: unknown
  try { data = JSON.parse(raw) } catch { fail() }
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'version,views') fail()
  const record = data as Record<string, unknown>
  if (record.version !== 1) fail()
  return validateViews(record.views)
}

export function serializeSavedTaskViews(views: SavedTaskView[]): string {
  return JSON.stringify({ version: 1, views: validateViews(views) })
}

export function addSavedTaskView(views: SavedTaskView[], name: string, params: URLSearchParams, view: TaskViewMode, id: string): SavedTaskView[] {
  if (views.length >= SAVED_TASK_VIEWS_LIMIT) fail('最多保存 12 个视图，请先删除不再使用的视图。')
  const cleanName = validName(name)
  if (views.some(item => item.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) fail('已有同名视图，请换一个名称。')
  return validateViews([...views, { id, name: cleanName, query: canonicalTaskViewQuery(params, view) }])
}

export function renameSavedTaskView(views: SavedTaskView[], id: string, name: string): SavedTaskView[] {
  if (!views.some(item => item.id === id)) fail('视图已在其他标签页删除，请重新选择。')
  const cleanName = validName(name)
  if (views.some(item => item.id !== id && item.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) fail('已有同名视图，请换一个名称。')
  return validateViews(views.map(item => item.id === id ? { ...item, name: cleanName } : item))
}
