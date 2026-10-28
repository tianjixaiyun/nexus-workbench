import { describe, expect, it } from 'vitest'
import type { Task } from '../src/lib/data/types'
import { tasksToCsv } from '../src/lib/portableExport'
import { parseTaskCsv } from '../src/features/tasks/taskCsvImport'

describe('任务 CSV 导入预览', () => {
  it('解析导出的引号、换行、标签和截止时间', () => {
    const task = { title: '整理,"材料"', description: '第一行\n第二行', status: 'todo', priority: 'high', dueDate: '2027-01-02', dueTime: '09:30', tags: ['学习/React', '工作'], subtasks: [], recurrence: 'weekly', createdAt: '2026-10-28', completedAt: null, deletedAt: null } as Task
    const [row] = parseTaskCsv(tasksToCsv([task]))
    expect(row.input).toMatchObject({ title: task.title, description: task.description, dueDate: task.dueDate, dueTime: task.dueTime, tags: task.tags, recurrence: 'weekly', priority: 'high' })
  })
  it('拒绝错误日期、无日期的时间、未知状态与重复列', () => {
    expect(() => parseTaskCsv('标题,截止日期\n任务,2026-02-30')).toThrow()
    expect(() => parseTaskCsv('标题,截止时间\n任务,09:30')).toThrow()
    expect(() => parseTaskCsv('标题,状态\n任务,unknown')).toThrow()
    expect(() => parseTaskCsv('标题,标题\nA,B')).toThrow()
  })
  it('拒绝空标题或超过50项，防止批量意外导入', () => {
    expect(() => parseTaskCsv('标题\n""')).toThrow()
    expect(() => parseTaskCsv('标题\n' + Array(51).fill('任务').join('\n'))).toThrow()
  })
})
