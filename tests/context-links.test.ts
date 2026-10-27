import { expect, test } from 'vitest'
import { focusContextHref, noteContextHref, removeContextParam, resolveContextEntity, resolveFocusContext, taskContextHref } from '../src/lib/contextLinks'

const notes = [
  { id: 'note-first', title: '同名便签', deletedAt: null },
  { id: 'note-second', title: '同名便签', deletedAt: null },
  { id: 'note-deleted', title: '已删除便签', deletedAt: '2026-10-27T00:00:00Z' },
]
const tasks = [{ id: 'task-next', title: '写报告', status: 'todo', deletedAt: null }]
const idle = { sessionId: null, taskId: '', taskOwner: '', running: false }
const focusInput = { tasks, loaded: true, authReady: true, userId: 'user-a', taskId: 'task-next', timer: idle }

test('context URLs encode exact IDs instead of searching titles or altering the destination route', () => {
  expect(noteContextHref('a&note=other')).toBe('/notes?note=a%26note%3Dother')
  expect(taskContextHref('学习 / 1')).toBe('/tasks?task=%E5%AD%A6%E4%B9%A0+%2F+1')
  expect(focusContextHref('task-next')).toBe('/focus?task=task-next')
})

test('exact note lookup waits for data and distinguishes equal titles', () => {
  expect(resolveContextEntity(notes, false, 'note-second').kind).toBe('waiting')
  const result = resolveContextEntity(notes, true, 'note-second')
  expect(result.kind).toBe('found')
  if (result.kind === 'found') expect(result.entity.id).toBe('note-second')
  expect(resolveContextEntity(notes, true, '同名便签').kind).toBe('missing')
})

test('missing or soft-deleted IDs never resolve to a different active entity', () => {
  expect(resolveContextEntity(notes, true, 'not-existing').kind).toBe('missing')
  expect(resolveContextEntity(notes, true, 'note-deleted').kind).toBe('deleted')
  expect(resolveContextEntity(notes, true, '').kind).toBe('missing')
})

test('closing a context removes only its key and preserves every existing filter', () => {
  const original = new URLSearchParams('tag=react&note=note-first&color=cyan&tag=study')
  const remaining = removeContextParam(original, 'note')
  expect(remaining.toString()).toBe('tag=react&color=cyan&tag=study')
  expect(original.get('note')).toBe('note-first')
})

test('focus navigation waits for both task data and authenticated ownership', () => {
  expect(resolveFocusContext({ ...focusInput, loaded: false }).kind).toBe('waiting')
  expect(resolveFocusContext({ ...focusInput, authReady: false }).kind).toBe('waiting')
  expect(resolveFocusContext({ ...focusInput, userId: null }).kind).toBe('invalid')
  expect(resolveFocusContext(focusInput)).toEqual({ kind: 'select', taskId: 'task-next', taskOwner: 'user-a', title: '写报告' })
})

test.each([true, false])('running or paused session blocks navigation from replacing its task (running=%s)', (running) => {
  const result = resolveFocusContext({ ...focusInput, timer: { sessionId: 'existing-session', taskId: 'existing-task', taskOwner: 'user-a', running }, tasks: [...tasks, { id: 'existing-task', title: '当前任务', status: 'doing', deletedAt: null }] })
  expect(result.kind).toBe('blocked')
  if (result.kind === 'blocked') {
    expect(result.currentTaskId).toBe('existing-task')
    expect(result.message).toContain('当前任务')
  }
})

test('cross-account active session never offers a task link into the current account', () => {
  const result = resolveFocusContext({ ...focusInput, timer: { sessionId: 'existing-session', taskId: 'private-task', taskOwner: 'other-user', running: false } })
  expect(result.kind).toBe('blocked')
  if (result.kind === 'blocked') expect(result.currentTaskId).toBeNull()
})

test.each(['done', 'deleted'])('focus link cannot select a finished or removed task (%s)', (state) => {
  const result = resolveFocusContext({ ...focusInput, tasks: [{ ...tasks[0], status: state === 'done' ? 'done' : 'todo', deletedAt: state === 'deleted' ? '2026-10-27T00:00:00Z' : null }] })
  expect(result.kind).toBe('invalid')
})
