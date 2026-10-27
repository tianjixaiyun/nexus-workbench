import { Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'

export function CalmModeToggle() {
  const enabled = useSettingsStore(state => state.calmMode)
  return (
    <button type="button" aria-pressed={enabled} aria-label={enabled ? '关闭低干扰模式' : '开启低干扰模式'}
      title={enabled ? '低干扰模式已开启：减少粒子、拖尾与过场' : '开启低干扰模式，专心处理眼前的事'}
      className={cn('flex cursor-pointer items-center gap-1.5 rounded-xl border p-2 text-xs focus-visible:outline-2 focus-visible:outline-accent', enabled ? 'border-accent bg-accent-soft text-accent' : 'border-line-2 bg-surface-1 text-txt-muted hover:text-accent')}
      onClick={() => {
        if (!useSettingsStore.getState().setCalmMode(!enabled)) toast.error('外观偏好未能保存', '当前页面已切换，刷新后可能恢复。')
      }}>
      <Leaf size={16} /><span className="hidden xl:inline">低干扰</span>
    </button>
  )
}
