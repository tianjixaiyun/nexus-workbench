import { describe, expect, it } from 'vitest'
import type { Task } from '../src/lib/data/types'
import { dueTaskReminders } from '../src/features/tasks/taskReminders'

describe('打开工作台时的任务到期提醒', () => {
  const task = (id: string, dueTime: string, extra: Partial<Task> = {}) => ({ id, title: id, dueDate: '2026-10-28', dueTime, status: 'todo', deletedAt: null, ...extra }) as Task
  it('只返回最近半小时到期且未完成的任务，按时间排序', () => {
    const now = new Date(2026, 9, 28, 10, 15)
    const tasks = [task('未来', '10:16'), task('刚到', '10:15'), task('较早', '09:55'), task('太久', '09:44'), task('完成', '10:00', { status: 'done' }), task('删除', '10:00', { deletedAt: 'x' })]
    expect(dueTaskReminders(tasks, now).map(item => item.id)).toEqual(['较早', '刚到'])
  })
  it('忽略无日期、无时间和无效时间的任务', () => {
    expect(dueTaskReminders([task('无日期', '10:00', { dueDate: null }), task('无时间', '', {}), task('错误', '29:99')], new Date(2026, 9, 28, 10, 0))).toEqual([])
  })
})
