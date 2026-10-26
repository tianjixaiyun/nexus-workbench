import { describe, expect, it } from 'vitest'
import { DEFAULT_DASHBOARD_LAYOUT, dashboardPreset, moveWidget, normalizeDashboardLayout } from '../src/features/dashboard/dashboardLayout'

describe('个人首页布局', () => {
  it('损坏、空值或旧设置回到完整默认布局', () => {
    for (const raw of [null, {}, 'bad']) expect(normalizeDashboardLayout(raw)).toEqual(DEFAULT_DASHBOARD_LAYOUT)
  })
  it('保留用户顺序和隐藏状态，去掉未知与重复项，并补齐新增组件', () => {
    const result = normalizeDashboardLayout([{ id: 'notes', visible: false }, { id: 'notes', visible: true }, { id: 'unknown' }, { id: 'today', visible: true }])
    expect(result.slice(0, 2)).toEqual([{ id: 'notes', visible: false }, { id: 'today', visible: true }])
    expect(new Set(result.map(w => w.id)).size).toBe(DEFAULT_DASHBOARD_LAYOUT.length)
    expect(result.some(w => w.id === 'reflection')).toBe(true)
  })
  it('专注预设将今日行动与复盘放前面，隐藏次要信息', () => {
    const layout = dashboardPreset('focus')
    expect(layout.slice(0, 2).map(w => w.id)).toEqual(['today', 'reflection'])
    expect(layout.find(w => w.id === 'weather')?.visible).toBe(false)
    expect(dashboardPreset('overview')).toEqual(DEFAULT_DASHBOARD_LAYOUT)
  })
  it('上下移动实际数组顺序，边界不丢项目也不修改原数组', () => {
    const initial = normalizeDashboardLayout(null)
    const ids = initial.map(w => w.id)
    expect(moveWidget(initial, ids[0], -1)).toEqual(initial)
    expect(moveWidget(initial, ids[0], 1).slice(0, 2).map(w => w.id)).toEqual([ids[1], ids[0]])
    expect(initial.map(w => w.id)).toEqual(ids)
    expect(moveWidget(initial, ids.at(-1)!, 1)).toEqual(initial)
  })
  it('允许全部隐藏并保留用户选择', () => {
    const hidden = DEFAULT_DASHBOARD_LAYOUT.map(w => ({ ...w, visible: false }))
    expect(normalizeDashboardLayout(hidden).every(w => !w.visible)).toBe(true)
  })
})
