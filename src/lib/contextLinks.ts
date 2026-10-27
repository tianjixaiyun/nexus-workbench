import type { FocusTimer } from './focusTimer'

type ContextKey = 'note' | 'task'
interface ContextEntity { id: string; deletedAt?: string | null }
type ContextResult<T> = { kind: 'none' | 'waiting' | 'missing' | 'deleted' } | { kind: 'found'; entity: T }
const href = (path: string, key: ContextKey, id: string) => `${path}?${new URLSearchParams({ [key]: id }).toString()}`
export const noteContextHref = (id: string): string => href('/notes', 'note', id)
export const taskContextHref = (id: string): string => href('/tasks', 'task', id)
export const focusContextHref = (id: string): string => href('/focus', 'task', id)

export function removeContextParam(params: URLSearchParams, key: ContextKey): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete(key)
  return next
}
export function resolveContextEntity<T extends ContextEntity>(items: readonly T[], loaded: boolean, id: string | null): ContextResult<T> {
  if (id === null) return { kind: 'none' }
  if (!loaded) return { kind: 'waiting' }
  const entity = items.find((item) => item.id === id)
  if (!entity) return { kind: 'missing' }
  return entity.deletedAt ? { kind: 'deleted' } : { kind: 'found', entity }
}
interface FocusContextInput {
  tasks: readonly (ContextEntity & { title: string; status: string })[]
  loaded: boolean
  authReady: boolean
  userId: string | null
  taskId: string | null
  timer: Pick<FocusTimer, 'sessionId' | 'taskId' | 'taskOwner' | 'running'>
}
type FocusContextResult =
  | { kind: 'none' }
  | { kind: 'waiting' }
  | { kind: 'invalid'; message: string }
  | { kind: 'blocked'; message: string; currentTaskId: string | null }
  | { kind: 'select'; taskId: string; taskOwner: string; title: string }

export function resolveFocusContext(input: FocusContextInput): FocusContextResult {
  const { tasks, loaded, authReady, userId, taskId, timer } = input
  if (taskId === null) return { kind: 'none' }
  if (!authReady) return { kind: 'waiting' }
  if (!userId) return { kind: 'invalid', message: '请先登录，再从任务进入专注。' }
  if (!loaded) return { kind: 'waiting' }
  if (timer.sessionId) {
    const sameOwner = timer.taskOwner === userId
    const current = sameOwner ? tasks.find((task) => task.id === timer.taskId && !task.deletedAt) : undefined
    const label = !timer.taskId ? '纯专注' : !sameOwner ? '其他账号关联的任务，请切回原账号查看' : current ? `「${current.title}」` : '已不可用的任务'
    return { kind: 'blocked', currentTaskId: current?.id ?? null, message: `已有${timer.running ? '进行中' : '暂停中'}的专注，当前关联：${label}。本次关联不会被导航替换；如需换任务，请先重置本次。` }
  }
  const resolved = resolveContextEntity(tasks, loaded, taskId)
  if (resolved.kind === 'deleted') return { kind: 'invalid', message: '目标任务已在回收站中，请恢复后再开始专注。' }
  if (resolved.kind !== 'found') return { kind: 'invalid', message: '未找到目标任务，可能已删除或当前账号没有这条任务。' }
  if (resolved.entity.status === 'done') return { kind: 'invalid', message: '目标任务已经完成，请先在任务中心重新开启，再关联专注。' }
  return { kind: 'select', taskId: resolved.entity.id, taskOwner: userId, title: resolved.entity.title }
}

