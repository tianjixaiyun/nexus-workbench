export const DASHBOARD_WIDGETS = [
  { id: 'today', title: '今日行动', hint: '今天到期与逾期任务', span: 'lg:col-span-6' },
  { id: 'trend', title: '完成趋势', hint: '最近七天的任务节奏', span: 'lg:col-span-6' },
  { id: 'reflection', title: '每日复盘', hint: '把今天的收获留下来', span: 'lg:col-span-12' },
  { id: 'goals', title: '目标进展', hint: '长期目标与任务闭环', span: 'lg:col-span-12' },
  { id: 'habits', title: '习惯打卡', hint: '习惯、连续天数与心情', span: 'lg:col-span-4' },
  { id: 'weather', title: '天气', hint: '城市天气与三日预报', span: 'lg:col-span-4' },
  { id: 'milestones', title: '倒数日', hint: '重要日期与纪念日', span: 'lg:col-span-4' },
  { id: 'links', title: '快捷入口', hint: '常用网站一键抵达', span: 'lg:col-span-4' },
  { id: 'notes', title: '最近便签', hint: '重新遇见最近的想法', span: 'lg:col-span-4' },
  { id: 'calendar', title: '迷你月历', hint: '查看日历与任务日期', span: 'lg:col-span-4' },
] as const

export type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number]['id']
export interface DashboardWidget { id: DashboardWidgetId; visible: boolean }
export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidget[] = DASHBOARD_WIDGETS.map(({ id }) => ({ id, visible: true }))

export function normalizeDashboardLayout(raw: unknown): DashboardWidget[] {
  const layout: DashboardWidget[] = []
  const known = new Set<string>(DASHBOARD_WIDGETS.map(w => w.id))
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object' || !known.has(item.id) || layout.some(w => w.id === item.id)) continue
      layout.push({ id: item.id, visible: item.visible !== false })
    }
  }
  for (const widget of DEFAULT_DASHBOARD_LAYOUT) {
    if (!layout.some(w => w.id === widget.id)) layout.push({ ...widget })
  }
  return layout
}

export function dashboardPreset(preset: 'overview' | 'focus'): DashboardWidget[] {
  if (preset === 'overview') return normalizeDashboardLayout(null)
  const order: DashboardWidgetId[] = ['today', 'reflection', 'goals', 'habits', 'links', 'notes', 'trend', 'weather', 'calendar', 'milestones']
  return order.map((id, index) => ({ id, visible: index < 6 }))
}

export function moveWidget(layout: DashboardWidget[], id: DashboardWidgetId, direction: -1 | 1): DashboardWidget[] {
  const next = layout.map(w => ({ ...w }))
  const index = next.findIndex(w => w.id === id)
  const target = index + direction
  if (index >= 0 && target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]]
  return next
}
