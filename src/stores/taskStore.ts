import { createStoreFetchGuard, insertCreatedById, reportStoreReadError } from './storeConcurrency'
import { create } from 'zustand'
import { dataAdapter } from '@/lib/data'
import type { NewTask, Task, TaskRecurrence, TaskStatus } from '@/lib/data/types'
import { nowIso, todayStr } from '@/lib/utils'

/** 回收站保留天数,超过后永久清除 */
export const TRASH_RETENTION_DAYS = 30

/** 未删除的任务(所有页面展示都用这个) */
export function activeTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.deletedAt)
}

/** 回收站里的任务 */
export function trashedTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.deletedAt)
}

/** 按重复规则推算下一次截止日期 */
export function nextDueDate(due: string | null, rule: TaskRecurrence): string {
  const base = due ?? todayStr()
  const [y, m, d] = base.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  if (rule === 'daily') date.setDate(date.getDate() + 1)
  if (rule === 'weekly') date.setDate(date.getDate() + 7)
  if (rule === 'monthly') {
    const day = date.getDate()
    date.setDate(1)
    date.setMonth(date.getMonth() + 1)
    date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()))
  }
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

interface TaskState {
  tasks: Task[]
  loaded: boolean
  fetch: () => Promise<void>
  add: (input: NewTask) => Promise<void>
  update: (id: string, patch: Partial<Task>) => Promise<void>
  /** 移入回收站 */
  softDelete: (id: string) => Promise<void>
  /** 从回收站恢复 */
  restore: (id: string) => Promise<void>
  /** 彻底删除 */
  remove: (id: string) => Promise<void>
  /** 清空回收站 */
  emptyTrash: () => Promise<void>
  /** 清理超过保留期的回收站数据 */
  purgeExpired: () => Promise<void>
  /** 勾选/取消完成,自动维护 completedAt */
  toggleDone: (id: string) => Promise<void>
  /** 切换某个子任务的完成状态 */
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>
  /** 番茄钟完成时给任务累加专注分钟 */
  addFocusMinutes: (taskId: string, minutes: number) => Promise<void>
  /** 看板拖拽:移动到某状态列的指定位置,并重排该列 sortOrder */
  move: (id: string, status: TaskStatus, targetIndex: number) => Promise<void>
  reset: () => void
}

const fetchGuard = createStoreFetchGuard()

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loaded: false,

  async fetch() {
    const request = fetchGuard.begin(get().tasks, () => get().tasks)
    try {
      request.assertReady()
      const rows = await dataAdapter.tasks.list()
      if (!request.isCurrent()) return
      // 并发更新或受控云端刷新已换过数组时，保留较新的界面记录。
      set(request.canReplaceRows() ? { tasks: rows, loaded: true } : { loaded: true })
    } catch (error) {
      if (!request.isCurrent()) return
      set({ loaded: true })
      reportStoreReadError('任务', error)
    }
  },

  async add(input) {
    // 直接以"已完成"状态创建时,同样记录完成时间
    const payload: NewTask =
      input.status === 'done' && input.completedAt === undefined
        ? { ...input, completedAt: nowIso() }
        : input
    const task = await dataAdapter.tasks.create(payload)
    set({ tasks: insertCreatedById(get().tasks, task) })
  },

  async update(id, patch) {
    // 状态切换时自动维护 completedAt(显式传入的除外)
    const task = get().tasks.find((t) => t.id === id)
    const finalPatch = { ...patch }
    if (task && patch.status && patch.status !== task.status && !('completedAt' in patch)) {
      finalPatch.completedAt = patch.status === 'done' ? nowIso() : null
    }
    const updated = await dataAdapter.tasks.update(id, finalPatch)
    set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) })

    // 重复任务:第一次完成时自动生成下一次(按标题+日期去重,防止反复勾选产生重复)
    if (
      task &&
      task.status !== 'done' &&
      updated.status === 'done' &&
      updated.recurrence &&
      updated.recurrence !== 'none'
    ) {
      const nextDate = nextDueDate(updated.dueDate, updated.recurrence)
      const duplicated = get().tasks.some(
        (t) =>
          t.id !== updated.id &&
          !t.deletedAt &&
          t.status !== 'done' &&
          t.title === updated.title &&
          t.recurrence === updated.recurrence &&
          t.dueDate === nextDate,
      )
      if (!duplicated) {
        const spawn = await dataAdapter.tasks.create({
          title: updated.title,
          description: updated.description,
          status: 'todo',
          priority: updated.priority,
          dueDate: nextDate,
          recurrence: updated.recurrence,
          tags: [...updated.tags],
          subtasks: updated.subtasks.map((s) => ({ ...s, done: false })),
        })
        set({ tasks: insertCreatedById(get().tasks, spawn) })
      }
    }
  },

  async remove(id) {
    await dataAdapter.tasks.remove(id)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
  },

  async softDelete(id) {
    await get().update(id, { deletedAt: nowIso() })
  },

  async restore(id) {
    await get().update(id, { deletedAt: null })
  },

  async emptyTrash() {
    const trashed = get().tasks.filter((t) => t.deletedAt)
    await Promise.all(trashed.map((t) => dataAdapter.tasks.remove(t.id)))
    set({ tasks: get().tasks.filter((t) => !t.deletedAt) })
  },

  async purgeExpired() {
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
    const expired = get().tasks.filter((t) => t.deletedAt && new Date(t.deletedAt).getTime() < cutoff)
    if (expired.length === 0) return
    await Promise.all(expired.map((t) => dataAdapter.tasks.remove(t.id)))
    const expiredIds = new Set(expired.map((t) => t.id))
    set({ tasks: get().tasks.filter((t) => !expiredIds.has(t.id)) })
  },

  async toggleDone(id) {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const done = task.status !== 'done'
    await get().update(id, {
      status: done ? 'done' : 'todo',
      completedAt: done ? nowIso() : null,
    })
  },

  async toggleSubtask(taskId, subtaskId) {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return
    const subtasks = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s))
    await get().update(taskId, { subtasks })
  },

  async addFocusMinutes(taskId, minutes) {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task || minutes <= 0) return
    await get().update(taskId, { focusMinutes: (task.focusMinutes ?? 0) + minutes })
  },

  async move(id, status, targetIndex) {
    const task = get().tasks.find(item => item.id === id && !item.deletedAt)
    if (!task) return
    // 复用已有状态更新，完成时间、重复任务和持久化失败都保持一致语义。
    if (task.status !== status) await get().update(id, { status })
    const current = get().tasks.find(item => item.id === id && !item.deletedAt)
    if (!current) return
    const column = get().tasks
      .filter(item => !item.deletedAt && item.status === status && item.id !== id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    column.splice(Math.max(0, Math.min(targetIndex, column.length)), 0, current)
    for (const [index, item] of column.entries()) {
      const sortOrder = (index + 1) * 100
      if (item.sortOrder !== sortOrder) await get().update(item.id, { sortOrder })
    }
  },

  reset() {
    fetchGuard.reset()
    set({ tasks: [], loaded: false })
  },
}))
