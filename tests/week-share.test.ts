import { describe, expect, it } from 'vitest'
import { buildWeekShareModel } from '../src/lib/weekShare'
import type { WeekStats } from '../src/lib/reflection'

const week: WeekStats = { tasksDone: 7, habitCheckins: 5, focusMinutes: 120, moodAvg: 3.75, days: 5 }

describe('周复盘分享图', () => {
  it('统计值转字符串,整数心情不带多余小数', () => {
    const model = buildWeekShareModel(week, '节奏很好')
    expect(model.stats.map(s => s.value)).toEqual(['7', '5', '120', '3.8'])
    expect(model.stats.every(s => s.label && typeof s.value === 'string')).toBe(true)
  })
  it('心情未记录时显示占位而不是 NaN', () => {
    const model = buildWeekShareModel({ ...week, moodAvg: null }, '')
    expect(model.stats[3]).toEqual({ label: '平均心情', value: '—', unit: '未记录' })
  })
  it('统计窗口为本周一至今天,文件名带日期', () => {
    const now = new Date(2026, 10, 27) // 2026-11-27 周五
    const model = buildWeekShareModel(week, '评论', now)
    expect(model.period).toContain('11.23(周一)')
    expect(model.period).toContain('11.27(周五)')
    expect(model.filename).toBe('周复盘-20261127')
  })
  it('标题、一句话与品牌位齐备', () => {
    const model = buildWeekShareModel(week, '细水长流')
    expect(model.title).toBe('本周回顾')
    expect(model.comment).toBe('细水长流')
    expect(model.brand).toContain('Nexus Workbench')
  })
})
