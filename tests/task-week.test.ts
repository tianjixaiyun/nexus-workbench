import { describe, expect, it } from 'vitest'
import type { Task } from '../src/lib/data/types'
import { mondayOf, weekGroups } from '../src/features/tasks/taskWeek'
import { readTaskView } from '../src/features/tasks/taskFilters'
import { addSavedTaskView, parseSavedTaskViews, serializeSavedTaskViews } from '../src/features/tasks/savedViews'

describe('周计划', () => {
  it('周一为一周开始，正确跨年和跨月', () => {
    expect(mondayOf('2027-01-01')).toBe('2026-12-28')
    expect(mondayOf('2026-11-01')).toBe('2026-10-26')
    expect(mondayOf('2026-10-26')).toBe('2026-10-26')
  })
  it('按周分组，同一天有时间的任务按时间排列，未排期和回收站不进入日程', () => {
    const tasks = [{ id: 'late', dueDate: '2026-12-28', dueTime: '19:00' }, { id: 'all-day', dueDate: '2026-12-28' }, { id: 'early', dueDate: '2026-12-28', dueTime: '09:00' }, { id: 'other', dueDate: '2027-01-04' }, { id: 'trash', dueDate: '2026-12-28', deletedAt: 'yes' }, { id: 'none', dueDate: null }] as Task[]
    const groups = weekGroups(tasks, '2026-12-28')
    expect(groups.map(group => group.date)).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'])
    expect(groups[0].tasks.map(task => task.id)).toEqual(['early', 'late', 'all-day'])
  })
  it('周视图能通过 URL 和保存视图恢复', () => {
    expect(readTaskView(new URLSearchParams('view=week'), null)).toBe('week')
    const views = addSavedTaskView([], '每周', new URLSearchParams('scope=all'), 'week', 'week-test')
    expect(parseSavedTaskViews(serializeSavedTaskViews(views))[0].query).toContain('view=week')
  })
})
