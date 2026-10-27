import { describe, expect, it } from 'vitest'
import { addSavedTaskView, canonicalTaskViewQuery, parseSavedTaskViews, renameSavedTaskView, savedTaskViewsKey, serializeSavedTaskViews } from '@/features/tasks/savedViews'
import { createTaskDraft, retainTaskEditor, shouldInitializeTaskDraft, taskDraftConflict } from '@/features/tasks/taskDraft'
import type { Task } from '@/lib/data/types'

const task: Task = { id: 'task-1', title: '原始标题', description: '', status: 'todo', priority: 'medium', dueDate: null, completedAt: null, tags: ['工作'], subtasks: [{ id: 's1', title: '第一步', done: false }], deletedAt: null, recurrence: 'none', focusMinutes: 0, sortOrder: 0, createdAt: '2026-10-27T00:00:00Z', updatedAt: '2026-10-27T00:00:00Z' }

describe('named task views', () => {
  it('saves normalized filters and layout without entity or unrelated URL context', () => {
    expect(canonicalTaskViewQuery(new URLSearchParams('scope=today&priority=high&view=kanban&task=private-id&create=1&note=secret'))).toBe('scope=today&priority=high&view=kanban')
    expect(canonicalTaskViewQuery(new URLSearchParams('scope=bad&status=bad&sort=bad&view=bad'))).toBe('view=list')
  })
  it('round-trips a named view and rejects bad versions, duplicate IDs and unknown fields', () => {
    const views = addSavedTaskView([], ' 工作高优先级 ', new URLSearchParams('priority=high'), 'list', 'view-1')
    expect(parseSavedTaskViews(serializeSavedTaskViews(views))).toEqual([{ id: 'view-1', name: '工作高优先级', query: 'priority=high&view=list' }])
    expect(() => parseSavedTaskViews(JSON.stringify({ version: 2, views }))).toThrow()
    expect(() => parseSavedTaskViews(JSON.stringify({ version: 1, views: [views[0], views[0]] }))).toThrow()
    expect(() => parseSavedTaskViews(JSON.stringify({ version: 1, views: [{ ...views[0], extra: 'no' }] }))).toThrow()
    expect(() => parseSavedTaskViews(JSON.stringify({ version: 1, views: [{ ...views[0], query: 'view=list&task=hidden' }] }))).toThrow()
    expect(() => parseSavedTaskViews('{')).toThrow()
    expect(parseSavedTaskViews(null)).toEqual([])
  })
  it('bounds names and count, and renames without changing filters', () => {
    const one = addSavedTaskView([], '今日', new URLSearchParams('scope=today'), 'kanban', 'v1')
    expect(renameSavedTaskView(one, 'v1', '今日看板')[0]).toEqual({ ...one[0], name: '今日看板' })
    expect(() => renameSavedTaskView(one, 'v1', ' ')).toThrow()
    expect(() => addSavedTaskView(one, 'x'.repeat(41), new URLSearchParams(), 'list', 'v2')).toThrow()
    expect(() => addSavedTaskView(one, '另一项', new URLSearchParams(), 'list', 'v1')).toThrow()
    const twelve = Array.from({ length: 12 }, (_, i) => ({ id: `v${i}`, name: `视图${i}`, query: 'view=list' }))
    expect(() => addSavedTaskView(twelve, '第十三', new URLSearchParams(), 'list', 'v13')).toThrow()
  })
  it('isolates local data, cloud projects and users, normalizing equivalent project URLs', () => {
    const a = savedTaskViewsKey({ mode: 'cloud', url: 'https://one.supabase.co/', userId: 'alice' })
    expect(a).toBe(savedTaskViewsKey({ mode: 'cloud', url: 'https://one.supabase.co', userId: 'alice' }))
    expect(a).not.toBe(savedTaskViewsKey({ mode: 'cloud', url: 'https://one.supabase.co', userId: 'bob' }))
    expect(a).not.toBe(savedTaskViewsKey({ mode: 'cloud', url: 'https://two.supabase.co', userId: 'alice' }))
    expect(a).not.toBe(savedTaskViewsKey({ mode: 'local' }))
    expect(() => savedTaskViewsKey({ mode: 'cloud', url: 'https://one.supabase.co', userId: '' })).toThrow()
  })
})

describe('task editing session', () => {
  it('never retains an old account or cloud project draft for the same task ID', () => {
    expect(retainTaskEditor(task, task.id, undefined, { previous: 'project-a:alice', current: 'project-a:bob' })).toBe(null)
    expect(retainTaskEditor(task, task.id, undefined, { previous: 'project-a:alice', current: 'project-b:alice' })).toBe(null)
    expect(retainTaskEditor(task, task.id, undefined, { previous: 'project-a:alice', current: 'project-a:alice' })).toBe(task)
  })
  it('keeps an open exact-ID editor when a remote deletion removes its target', () => {
    expect(retainTaskEditor(task, task.id, undefined)).toBe(task)
    expect(retainTaskEditor(task, 'another-id', undefined)).toBe(null)
    expect(retainTaskEditor(task, null, undefined)).toBe(null)
    const refreshed = { ...task, title: '远端更新' }
    expect(retainTaskEditor(task, task.id, refreshed)).toBe(refreshed)
  })
  it('initializes only when opening or changing exact task ID, never on same-ID refresh', () => {
    expect(shouldInitializeTaskDraft({ open: false, taskId: 'task-1' }, { open: true, taskId: 'task-1' })).toBe(true)
    expect(shouldInitializeTaskDraft({ open: true, taskId: 'task-1' }, { open: true, taskId: 'task-1' })).toBe(false)
    expect(shouldInitializeTaskDraft({ open: true, taskId: 'task-1' }, { open: true, taskId: 'task-2' })).toBe(true)
    expect(shouldInitializeTaskDraft({ open: true, taskId: 'task-1' }, { open: false, taskId: null })).toBe(false)
  })
  it('ignores focus/order refreshes while detecting remote edits and deletion', () => {
    expect(taskDraftConflict(task, { ...task, focusMinutes: 25, sortOrder: 5, updatedAt: 'later' })).toBe(null)
    expect(taskDraftConflict(task, { ...task, title: '另一设备修改' })).toBe('changed')
    expect(taskDraftConflict(task, { ...task, deletedAt: '2026-10-27T01:00:00Z' })).toBe('deleted')
    expect(taskDraftConflict(task, undefined)).toBe('missing')
  })
  it('copies nested editable fields so typing cannot mutate store data', () => {
    const draft = createTaskDraft(task)
    draft.tags.push('新标签')
    draft.subtasks[0].done = true
    expect(task.tags).toEqual(['工作'])
    expect(task.subtasks[0].done).toBe(false)
  })
})
