import { describe, it, expect } from 'vitest'
import { duplicateTaskDraft } from '@/features/tasks/taskDraft'

describe('duplicate task draft', () => {
  it('preserves details while making an independent unfinished draft', () => {
    const original = { title: '准备报告', description: '详细说明', status: 'done' as const, priority: 'high' as const, dueDate: '2026-11-01', dueTime: '09:30', recurrence: 'weekly' as const, tags: ['工作'], subtasks: [{ id: 'old', title: '列大纲', done: true }] }
    const copy = duplicateTaskDraft(original, () => 'new-id')
    expect(copy).toEqual({ ...original, status: 'todo', recurrence: 'none', subtasks: [{ id: 'new-id', title: '列大纲', done: false }] })
    copy.tags.push('新标签')
    copy.subtasks[0].title = '修改'
    expect(original.tags).toEqual(['工作'])
    expect(original.subtasks[0].title).toBe('列大纲')
  })
})
