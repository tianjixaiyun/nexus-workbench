import { describe, expect, it } from 'vitest'
import type { Task } from '../src/lib/data/types'
import { tasksToCalendar } from '../src/lib/portableExport'

const task = (patch: Partial<Task>): Task => ({ id: 'a', title: '测试', description: '', status: 'todo', priority: 'medium', dueDate: '2027-01-08', dueTime: null, completedAt: null, subtasks: [], tags: [], deletedAt: null, recurrence: 'none', focusMinutes: 0, sortOrder: 0, createdAt: '2026-10-28', updatedAt: '2026-10-28', ...patch })
describe('日历文件导出', () => {
  it('区分全天日期和设备本地具体时间，只包含未完成有效任务', () => {
    const result = tasksToCalendar([task({ id: 'date', title: '全天' }), task({ id: 'timed', dueTime: '09:30', title: '约定时间' }), task({ id: 'done', status: 'done', title: '已完成' }), task({ id: 'trash', deletedAt: 'x', title: '已删除' }), task({ id: 'none', dueDate: null, title: '无日期' })])
    const utc = new Date(2027, 0, 8, 9, 30).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    expect(result).toContain('DTSTART;VALUE=DATE:20270108')
    expect(result).toContain(`DTSTART:${utc}`)
    expect(result).not.toContain('已完成')
    expect(result).not.toContain('已删除')
    expect(result).not.toContain('无日期')
    expect(result).not.toContain('RRULE:')
  })
  it('正文换行不会插入日历属性，无效日期被拒绝', () => {
    expect(tasksToCalendar([task({ title: '第一行\nBEGIN:VEVENT' })])).toContain('SUMMARY:第一行\\nBEGIN:VEVENT')
    expect(() => tasksToCalendar([task({ dueDate: '2027-02-30' })])).toThrow()
  })
})
