import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Maximize2, Minimize2, Pause, Play, RotateCcw, Settings2, SkipForward, Timer as TimerIcon, Volume2, VolumeX } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { removeContextParam, resolveFocusContext, taskContextHref } from '@/lib/contextLinks'
import { recentSessions, todayFocusMinutes, todaySessions } from '@/lib/pomodoro'
import { FOCUS_MODE_LABELS, formatFocusTime, remainingSeconds, type FocusConfig, type FocusMode } from '@/lib/focusTimer'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { useAuthStore } from '@/stores/authStore'
import { useFocusStore } from '@/stores/focusStore'
import { NoisePlayer, type NoiseKind } from '@/lib/noise'
import { useSettingsStore } from '@/stores/settingsStore'

const RADIUS = 130
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function FocusView() {
  const tasks = useTaskStore((s) => s.tasks)
  const tasksLoaded = useTaskStore((s) => s.loaded)
  const authReady = useAuthStore((s) => s.ready)
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTaskId = searchParams.get('task')
  const [contextNotice, setContextNotice] = useState<string | null>(null)
  const { timer, now, busy } = useFocusStore()
  const { mode, running, taskId, config: focusCfg } = timer
  const remaining = remainingSeconds(timer, now)
  const total = timer.totalSeconds
  const sessions = todaySessions()
  const [cfgOpen, setCfgOpen] = useState(false)
  const [cfgDraft, setCfgDraft] = useState<FocusConfig>(focusCfg)
  const MODES = useMemo(() => (['work', 'short', 'long'] as const).map((value) => ({ value, label: FOCUS_MODE_LABELS[value], minutes: focusCfg[value] })), [focusCfg])
  const light = useSettingsStore((s) => s.theme) === 'light'
  const focusableTasks = useMemo(() => activeTasks(tasks).filter((t) => t.status !== 'done'), [tasks])
  const selectedTask = timer.taskOwner === userId ? tasks.find((t) => t.id === taskId && !t.deletedAt) : undefined

  useEffect(() => {
    const result = resolveFocusContext({ tasks, loaded: tasksLoaded, authReady, userId, taskId: requestedTaskId, timer: useFocusStore.getState().timer })
    if (result.kind === 'none' || result.kind === 'waiting') return
    let cancelled = false
    const consumeRequest = () => setSearchParams((current) => removeContextParam(current, 'task'), { replace: true })
    if (result.kind === 'blocked' || result.kind === 'invalid') {
      setContextNotice(result.message)
      consumeRequest()
      return
    }
    void (async () => {
      const auth = useAuthStore.getState()
      if (!auth.ready || auth.user?.id !== result.taskOwner) return
      await useFocusStore.getState().selectTask(result.taskId, result.taskOwner)
      const current = useFocusStore.getState().timer
      const currentAuth = useAuthStore.getState()
      if (!currentAuth.ready || currentAuth.user?.id !== result.taskOwner) {
        if (!current.sessionId && current.taskId === result.taskId && current.taskOwner === result.taskOwner) {
          await useFocusStore.getState().selectTask('', currentAuth.user?.id ?? '')
        }
        return
      }
      if (cancelled) return
      if (current.taskId === result.taskId && current.taskOwner === result.taskOwner) {
        setContextNotice(`已选择「${result.title}」，点击开始后才会计时。`)
      } else {
        const refreshed = resolveFocusContext({ tasks: useTaskStore.getState().tasks, loaded: true, authReady: true, userId: result.taskOwner, taskId: result.taskId, timer: current })
        setContextNotice(refreshed.kind === 'blocked' ? refreshed.message : '目标任务未能选中，请检查页面提示后重新选择。')
      }
      consumeRequest()
    })()
    return () => { cancelled = true }
  }, [tasks, tasksLoaded, authReady, userId, requestedTaskId, setSearchParams])
  const switchMode = (next: FocusMode) => { setContextNotice(null); void useFocusStore.getState().switchMode(next) }
  const toggleRun = () => {
    if (busy || !authReady || !userId) return
    if (!timer.sessionId && taskId && timer.taskOwner !== userId) {
      setContextNotice('当前关联来自其他账号，请重新选择任务或纯专注后再开始。')
      return
    }
    setContextNotice(null)
    if (!running && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined)
    }
    void useFocusStore.getState().toggle()
  }
  const reset = () => { setContextNotice(null); void useFocusStore.getState().reset() }
  const skip = () => { setContextNotice(null); void useFocusStore.getState().skip() }
  // 专注白噪音(WebAudio 合成,Forest 氛围)
  const playerRef = useRef<NoisePlayer | null>(null)
  const [noiseOn, setNoiseOn] = useState(false)
  const [noiseKind, setNoiseKind] = useState<NoiseKind>('rain')
  const [noiseVol, setNoiseVol] = useState(0.4)
  useEffect(() => () => playerRef.current?.stop(), [])
  const toggleNoise = () => {
    playerRef.current ??= new NoisePlayer()
    if (noiseOn) {
      playerRef.current.stop()
      setNoiseOn(false)
    } else {
      playerRef.current.setKind(noiseKind)
      playerRef.current.setVolume(noiseVol)
      playerRef.current.start()
      setNoiseOn(true)
    }
  }
  const cycleNoiseKind = () => {
    const next: NoiseKind = noiseKind === 'rain' ? 'brown' : 'rain'
    setNoiseKind(next)
    playerRef.current?.setKind(next)
  }

  // 全屏专注
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement))
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
      else void document.documentElement.requestFullscreen().catch(() => undefined)
    } catch {
      // 浏览器不支持时忽略
    }
  }

  const progress = 1 - remaining / total
  const applyCfg = async () => {
    await useFocusStore.getState().configure(cfgDraft)
    setCfgOpen(false)
  }
  const ringColor = mode === 'work' ? (light ? '#0891b2' : '#22d3ee') : light ? '#059669' : '#34d399'
  const week = recentSessions(7)
  const weekMax = Math.max(1, ...week.map((d) => d.count))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-line-2 bg-surface-1 p-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => switchMode(m.value)}
              className={cn(
                'cursor-pointer rounded-lg px-4 py-1.5 text-xs transition-all',
                mode === m.value ? 'bg-surface-4 text-txt-primary' : 'text-txt-muted hover:text-txt-secondary',
              )}
            >
              {m.label} {m.minutes}′
            </button>
          ))}
        </div>
        {timer.sessionId && <p className="text-[11px] text-txt-muted">本次 {total / 60} 分钟，时长设置从下一次开始生效；重置或跳过会取消本次。</p>}
        {cfgOpen && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line-2 bg-surface-1 px-4 py-3 text-xs">
            {([['work', '专注'], ['short', '短休'], ['long', '长休']] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-1.5 text-txt-secondary">
                {label}
                <input
                  type="number" min={1} max={180}
                  value={cfgDraft[k]}
                  onChange={(e) => setCfgDraft((d) => ({ ...d, [k]: Number(e.target.value) }))}
                  className="w-14 rounded-md border border-line-2 bg-surface-2 px-2 py-1 font-mono outline-none focus:border-accent"
                /> 分钟
              </label>
            ))}
            <label className="flex items-center gap-1.5 text-txt-secondary">
              每日目标
              <input
                type="number" min={1} max={50}
                value={cfgDraft.dailyGoal}
                onChange={(e) => setCfgDraft((d) => ({ ...d, dailyGoal: Number(e.target.value) }))}
                className="w-14 rounded-md border border-line-2 bg-surface-2 px-2 py-1 font-mono outline-none focus:border-accent"
              /> 个
            </label>
            <button disabled={busy} onClick={() => void applyCfg()} className="cursor-pointer rounded-lg bg-accent px-3 py-1.5 font-medium text-white">保存</button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-txt-muted">
          <span className="flex items-center gap-1.5">
            <TimerIcon size={14} />
            今天已完成 <span className="font-mono font-bold text-accent">{sessions}</span>
            <span className="text-txt-muted/70">/ {focusCfg.dailyGoal} 个番茄 · {todayFocusMinutes()} 分钟</span>
          </span>
          <button
            onClick={() => { setCfgDraft(focusCfg); setCfgOpen((v) => !v) }}
            className={cn('cursor-pointer rounded-lg border px-2 py-1 transition-colors', cfgOpen ? 'border-accent bg-accent-soft text-accent' : 'border-line-2 hover:text-txt-secondary')}
            title="自定义时长与每日目标"
          >
            <Settings2 size={13} />
          </button>
          <span className="flex items-center gap-1.5">
            <button
              onClick={toggleNoise}
              className={cn(
                'flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 transition-colors',
                noiseOn ? 'border-accent bg-accent-soft text-accent' : 'border-line-2 hover:text-txt-secondary',
              )}
              title="专注白噪音(WebAudio 合成,无需网络)"
            >
              {noiseOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {noiseOn ? (noiseKind === 'rain' ? '雨声' : '棕噪音') : '白噪音'}
            </button>
            {noiseOn && (
              <>
                <button
                  onClick={cycleNoiseKind}
                  className="cursor-pointer rounded-lg border border-line-2 px-2 py-1 transition-colors hover:text-txt-secondary"
                  title="切换音色"
                >
                  换个声音
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={noiseVol * 100}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100
                    setNoiseVol(v)
                    playerRef.current?.setVolume(v)
                  }}
                  className="w-20 accent-cyan-400"
                  aria-label="音量"
                />
              </>
            )}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* 计时环 */}
        <Card className="flex flex-col items-center justify-center gap-6 py-10 lg:col-span-3">
          <div className="relative">
            <svg width="300" height="300" className="-rotate-90">
              <circle cx="150" cy="150" r={RADIUS} fill="none" stroke={light ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)'} strokeWidth="10" />
              <circle
                cx="150"
                cy="150"
                r={RADIUS}
                fill="none"
                stroke={ringColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                style={{ transition: 'stroke-dashoffset 0.3s linear', filter: `drop-shadow(0 0 8px ${ringColor}66)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-mono text-5xl font-bold tracking-tight tabular-nums">{formatFocusTime(remaining)}</p>
              <p className="mt-2 max-w-64 truncate text-xs tracking-widest text-txt-muted">
                {selectedTask ? `正在专注:${selectedTask.title}` : FOCUS_MODE_LABELS[mode]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleRun}
              disabled={busy}
              className="neon-gradient-bg flex h-14 w-14 cursor-pointer items-center justify-center rounded-full text-white transition-transform hover:scale-105"
              aria-label={running ? '暂停' : '开始'}
            >
              {running ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </button>
            <button
              onClick={reset}
              disabled={busy}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line-3 text-txt-muted transition-colors hover:border-line-strong hover:text-txt-secondary"
              aria-label="重置"
            >
              <RotateCcw size={17} />
            </button>
            <button
              onClick={skip}
              disabled={busy}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line-3 text-txt-muted transition-colors hover:border-line-strong hover:text-txt-secondary"
              aria-label="跳过"
            >
              <SkipForward size={17} />
            </button>
            <button
              onClick={toggleFullscreen}
              className={cn(
                'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition-colors',
                isFullscreen
                  ? 'border-accent text-accent'
                  : 'border-line-3 text-txt-muted hover:border-line-strong hover:text-txt-secondary',
              )}
              aria-label={isFullscreen ? '退出全屏' : '全屏专注'}
              title="全屏专注"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </Card>

        {/* 右侧:任务选择 + 本周统计 */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <p className="mb-3 text-sm font-semibold tracking-wide text-txt-secondary">这次专注做什么?</p>
            {contextNotice && (
              <div role="status" className="mb-3 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs leading-relaxed text-txt-secondary">
                <p>{contextNotice}</p>
                <button type="button" onClick={() => setContextNotice(null)} className="mt-1 cursor-pointer text-accent hover:underline">知道了</button>
              </div>
            )}
            {timer.sessionId && (
              <p className="mb-3 text-xs leading-relaxed text-txt-muted">
                本次关联：{!taskId ? '纯专注' : timer.taskOwner !== userId ? '其他账号的任务，请切回原账号查看' : selectedTask?.title ?? '任务已不可用'}（{running ? '计时中' : '已暂停'}）
              </p>
            )}
            {selectedTask && <Link to={taskContextHref(selectedTask.id)} className="mb-3 inline-flex text-xs text-accent hover:underline">查看关联任务 →</Link>}
            {focusableTasks.length === 0 ? (
              <p className="py-4 text-center text-xs text-txt-muted">没有进行中的任务,也可以不带任务纯专注</p>
            ) : (
              <Select value={selectedTask ? taskId : ''} disabled={Boolean(timer.sessionId) || busy || !authReady || !userId} onChange={(e) => { setContextNotice(null); void useFocusStore.getState().selectTask(e.target.value, userId ?? '') }}>
                <option value="">不关联任务(纯专注)</option>
                {selectedTask && !focusableTasks.some((t) => t.id === selectedTask.id) && <option value={selectedTask.id}>{selectedTask.title}（本次已关联）</option>}
                {focusableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                    {t.focusMinutes ? ` · 已专注 ${t.focusMinutes} 分钟` : ''}
                  </option>
                ))}
              </Select>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-txt-muted">
              已记录的专注按实际设置的分钟统计。切换页面或刷新会恢复计时；关闭浏览器后会在下次打开时核对到时状态。跳过不计完成，关联任务需在开始前选择。
            </p>
          </Card>

          <Card className="flex-1">
            <p className="mb-3 text-sm font-semibold tracking-wide text-txt-secondary">最近 7 天番茄</p>
            {week.every((d) => d.count === 0) ? (
              <EmptyState icon={TimerIcon} title="还没有记录" hint="点上面的播放键开始第一个番茄" />
            ) : (
              <div className="flex h-40 items-end gap-2">
                {week.map((d) => (
                  <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-mono text-[10px] text-txt-muted">{d.count || ''}</span>
                    <div
                      className="neon-gradient-bg w-full rounded-t-md transition-all"
                      style={{ height: `${Math.max(4, (d.count / weekMax) * 100)}%`, opacity: d.count ? 1 : 0.15 }}
                    />
                    <span className="text-[10px] text-txt-muted">{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
