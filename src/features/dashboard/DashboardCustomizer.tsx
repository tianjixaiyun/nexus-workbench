import { ArrowDown, ArrowUp, LayoutGrid, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSettingsStore } from '@/stores/settingsStore'
import { DASHBOARD_WIDGETS, dashboardPreset, moveWidget } from './dashboardLayout'

export function DashboardCustomizer() {
  const layout = useSettingsStore(s => s.dashboardLayout)
  const update = useSettingsStore(s => s.setDashboardLayout)
  return (
    <details className="rounded-2xl border border-line-2 bg-surface-1 p-4">
      <summary className="cursor-pointer text-sm font-medium text-txt-secondary">自定义首页 · {layout.filter(w => w.visible).length} 个组件</summary>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => update(dashboardPreset('focus'))}><LayoutGrid size={14} />专注预设</Button>
        <Button size="sm" variant="outline" onClick={() => update(dashboardPreset('overview'))}><RotateCcw size={14} />恢复总览</Button>
        <p className="text-xs text-txt-muted">勾选显隐，箭头调整顺序。布局只保存在当前浏览器，不影响你的记录。</p>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {layout.map((widget, index) => {
          const meta = DASHBOARD_WIDGETS.find(w => w.id === widget.id)!
          return (
            <li key={widget.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-line-1 px-3 py-2">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={widget.visible} onChange={event => update(layout.map(w => w.id === widget.id ? { ...w, visible: event.target.checked } : w))} style={{ accentColor: 'var(--color-accent)' }} />
                <span className="min-w-0"><span className="block text-txt-secondary">{meta.title}</span><span className="block truncate text-[11px] text-txt-muted">{meta.hint}</span></span>
              </label>
              <Button size="icon" disabled={index === 0} aria-label={`上移${meta.title}`} title={`上移${meta.title}`} onClick={() => update(moveWidget(layout, widget.id, -1))}><ArrowUp size={15} /></Button>
              <Button size="icon" disabled={index === layout.length - 1} aria-label={`下移${meta.title}`} title={`下移${meta.title}`} onClick={() => update(moveWidget(layout, widget.id, 1))}><ArrowDown size={15} /></Button>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
