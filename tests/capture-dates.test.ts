import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/data', () => ({ dataAdapter: { tasks: {} } }))
import { parseNaturalLanguage } from '../src/lib/nlp'
import { nextDueDate } from '../src/stores/taskStore'
import { readTaskView } from '../src/features/tasks/taskFilters'

describe('录入日期边界', () => {
  const monday = new Date(2026, 9, 26, 13)
  it('下周同一星期只前进一周，下周较晚星期也属于下一个自然周', () => {
    expect(parseNaturalLanguage('下周一交报告', monday).dueDate).toBe('2026-11-02')
    expect(parseNaturalLanguage('下周五交报告', monday).dueDate).toBe('2026-11-06')
    expect(parseNaturalLanguage('下下周一交报告', monday).dueDate).toBe('2026-11-09')
  })
  it('无效月份日期和过大的相对天数不应悄悄移除', () => {
    expect(parseNaturalLanguage('2月30日复查', monday)).toMatchObject({ dueDate: null, cleaned: '2月30日复查', matched: [] })
    expect(parseNaturalLanguage('999天后复查', monday)).toMatchObject({ dueDate: null, cleaned: '999天后复查', matched: [] })
  })
  it('显式ISO日期支持跨年与闰日，无效日期保留原文', () => {
    expect(parseNaturalLanguage('2028-02-29 复查 p1', monday)).toMatchObject({ dueDate: '2028-02-29', cleaned: '复查', priority: 'high' })
    expect(parseNaturalLanguage('2027-02-29 复查', monday)).toMatchObject({ dueDate: null, cleaned: '2027-02-29 复查' })
  })
  it('每月中文十一日至二十日可识别，月末重复停在真实月末', () => {
    expect(parseNaturalLanguage('每月十五号还款', monday)).toMatchObject({ dueDate: '2026-11-15', recurrence: 'monthly', cleaned: '还款' })
    expect(nextDueDate('2027-01-31', 'monthly')).toBe('2027-02-28')
    expect(nextDueDate('2028-01-31', 'monthly')).toBe('2028-02-29')
  })
  it('日程视图可被URL指定和记住', () => {
    expect(readTaskView(new URLSearchParams('view=agenda&scope=today'), 'list')).toBe('agenda')
    expect(readTaskView(new URLSearchParams(), 'agenda')).toBe('agenda')
  })
})
