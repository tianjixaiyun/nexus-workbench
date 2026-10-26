import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { Pause, Play, Timer, X } from 'lucide-react'
import { FOCUS_MODE_LABELS, FOCUS_STATE_KEY, formatFocusTime, remainingSeconds } from '@/lib/focusTimer'
import { useFocusStore } from '@/stores/focusStore'
import { APP_MODULES } from '@/lib/modules'
import { celebrate } from '@/components/fx/Burst'
import { checkAchievementsNow } from '@/components/fx/achievements'

/** 挂载一次即可；页面切换只影响界面，不改变活动会话。 */
export function FocusRuntime() {
  const { timer, now, error, busy, lastCompletion } = useFocusStore()
  const location = useLocation()
  const announced = useRef<string | null>(null)
  const ticking = useRef(false)
  const seconds = remainingSeconds(timer, now)
  useEffect(() => {
    const tick = async () => {
      if (ticking.current || useFocusStore.getState().storageBlocked) return
      ticking.current = true
      try { await useFocusStore.getState().tick() }
      finally { ticking.current = false }
    }
    const sync = () => { useFocusStore.getState().sync(); void tick() }
    const onStorage = (event: StorageEvent) => {
      if (event.key === FOCUS_STATE_KEY || event.key === 'nexus:pomodoro' || event.key === null) sync()
    }
    const onVisible = () => { if (document.visibilityState === 'visible') sync() }
    const handle = window.setInterval(() => { void tick() }, 500)
    window.addEventListener('storage', onStorage)
    window.addEventListener('nexus:focus-history', sync)
    document.addEventListener('visibilitychange', onVisible)
    void tick()
    return () => {
      clearInterval(handle)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('nexus:focus-history', sync)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  useEffect(() => {
    document.title = timer.running ? `${formatFocusTime(seconds)} · ${FOCUS_MODE_LABELS[timer.mode]} — NEXUS` : `${APP_MODULES.find(module => module.to === location.pathname)?.label ?? '工作台'} · NEXUS`
    return () => { document.title = 'NEXUS · 工作台' }
  }, [seconds, timer.running, timer.mode, location.pathname])
  useEffect(() => {
    if (!lastCompletion || announced.current === lastCompletion.id) return
    announced.current = lastCompletion.id
    if (lastCompletion.mode === 'work') {
      try { celebrate(); checkAchievementsNow() }
      catch { /* 装饰效果不可用时不影响计时与通知 */ }
    }
    try {
      if ('Notification' in window && Notification.permission === 'granted') new Notification(lastCompletion.mode === 'work' ? '专注完成，休息一下 🍅' : '休息结束，准备下一次专注')
    } catch { /* 通知不可用时不影响记账 */ }
  }, [lastCompletion])

  const showTimer = Boolean(timer.sessionId) && location.pathname !== '/focus'
  if (!error && !showTimer) return null
  return (
    <aside className="fixed bottom-24 left-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col gap-2 sm:bottom-5 md:left-[236px]" aria-label="全局专注计时">
      {error && (
        <div role="alert" className="flex max-w-sm items-start gap-2 rounded-xl border border-danger/40 bg-surface-1 p-3 text-xs leading-relaxed text-txt-primary shadow-xl">
          <p className="flex-1">{error}</p>
          <button onClick={() => useFocusStore.getState().clearError()} aria-label="关闭专注提示" className="shrink-0 cursor-pointer rounded p-1 hover:bg-surface-3"><X size={14} /></button>
        </div>
      )}
      {showTimer && (
        <div className="glass-card flex items-center gap-3 rounded-xl border border-line-2 px-3 py-2.5 shadow-xl">
          <Timer size={16} className="text-accent" />
          <Link to="/focus" className="min-w-0 text-xs hover:text-accent" aria-label="返回专注页面">
            <span className="block font-medium">{FOCUS_MODE_LABELS[timer.mode]} · {timer.running ? '计时中' : '已暂停'}</span>
            <span className="font-mono text-lg tabular-nums">{formatFocusTime(seconds)}</span>
          </Link>
          <button disabled={busy} onClick={() => void useFocusStore.getState().toggle()} aria-label={timer.running ? '暂停专注' : '继续专注'} className="cursor-pointer rounded-lg border border-line-2 p-2 text-accent hover:bg-surface-3 disabled:opacity-50">
            {timer.running ? <Pause size={15} /> : <Play size={15} />}
          </button>
        </div>
      )}
    </aside>
  )
}
