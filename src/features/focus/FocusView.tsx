import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2, Pause, Play, RotateCcw, SkipForward, Timer as TimerIcon, Volume2, VolumeX } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Input'
import { cn, todayStr } from '@/lib/utils'
import { recordSession, recentSessions, todaySessions } from '@/lib/pomodoro'
import { celebrate } from '@/components/fx/Burst'
import { checkAchievementsNow } from '@/components/fx/achievements'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { NoisePlayer, type NoiseKind } from '@/lib/noise'
import { useSettingsStore } from '@/stores/settingsStore'

type Mode = 'work' | 'short' | 'long'

const MODES: { value: Mode; label: string; minutes: number }[] = [
  { value: 'work', label: '专注', minutes: 25 },
  { value: 'short', label: '短休', minutes: 5 },
  { value: 'long', label: '长休', minutes: 15 },
]

const RADIUS = 130
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function FocusView() {
  const tasks = useTaskStore((s) => s.tasks)
  const [mode, setMode] = useState<Mode>('work')
  const [remaining, setRemaining] = useState(MODES[0].minutes * 60)
  const [running, setRunning] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [sessions, setSessions] = useState(() => todaySessions())
  const endAtRef = useRef<number | null>(null)

  const light = useSettingsStore((s) => s.theme) === 'light'
  const total = MODES.find((m) => m.value === mode)!.minutes * 60
  const focusableTasks = useMemo(() => activeTasks(tasks).filter((t) => t.status !== 'done'), [tasks])
  const selectedTask = focusableTasks.find((t) => t.id === taskId)

  const switchMode = useCallback((next: Mode) => {
    setMode(next)
    setRemaining(MODES.find((m) => m.value === next)!.minutes * 60)
    setRunning(false)
    endAtRef.current = null
  }, [])

  const complete = useCallback(() => {
    setRunning(false)
    endAtRef.current = null
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const label = MODES.find((m) => m.value === mode)!.label
        new Notification(mode === 'work' ? '专注完成,休息一下 🍅' : `休息结束,继续${label}!`)
      }
    } catch {
      // 通知不可用时忽略
    }
    if (mode === 'work') {
      recordSession(todayStr())
      setSessions(todaySessions())
      celebrate()
      checkAchievementsNow()
      // 关联了任务:给该任务累加一个番茄的专注时长(Toggl 式统计)
      if (taskId) void useTaskStore.getState().addFocusMinutes(taskId, 25)
      switchMode('short')
    } else {
      switchMode('work')
    }
  }, [mode, switchMode, taskId])

  // 计时心跳:用真实时间戳计算剩余,后台标签页也不会漂移
  useEffect(() => {
    if (!running) return
    if (endAtRef.current === null) endAtRef.current = Date.now() + remaining * 1000
    const tick = () => {
      const left = Math.max(0, Math.round(((endAtRef.current ?? 0) - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) complete()
    }
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
    // remaining 变化不重启 interval,只在 running/mode 变化时重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, complete])

  // 计时时把剩余时间写进标签页标题
  useEffect(() => {
    if (running) {
      document.title = `${fmt(remaining)} · ${MODES.find((m) => m.value === mode)!.label} — NEXUS`
    } else {
      document.title = 'NEXUS · 工作台'
    }
    return () => {
      document.title = 'NEXUS · 工作台'
    }
  }, [running, remaining, mode])

  const toggleRun = () => {
    if (running) {
      // 暂停:记录当前剩余
      endAtRef.current = null
      setRunning(false)
    } else {
      if ('Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission().catch(() => undefined)
      }
      endAtRef.current = Date.now() + remaining * 1000
      setRunning(true)
    }
  }

  const reset = () => {
    endAtRef.current = null
    setRunning(false)
    setRemaining(total)
  }

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
      if (document.fullscreenElement) void document.exitFullscreen()
      else void document.documentElement.requestFullscreen()
    } catch {
      // 浏览器不支持时忽略
    }
  }

  const progress = 1 - remaining / total
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
        <div className="flex items-center gap-3 text-xs text-txt-muted">
          <span className="flex items-center gap-1.5">
            <TimerIcon size={14} />
            今天已完成 <span className="font-mono font-bold text-accent">{sessions}</span> 个番茄
          </span>
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
              <p className="font-mono text-5xl font-bold tracking-tight tabular-nums">{fmt(remaining)}</p>
              <p className="mt-2 text-xs tracking-widest text-txt-muted">
                {selectedTask ? `正在专注:${selectedTask.title}` : MODES.find((m) => m.value === mode)!.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleRun}
              className="neon-gradient-bg flex h-14 w-14 cursor-pointer items-center justify-center rounded-full text-white transition-transform hover:scale-105"
              aria-label={running ? '暂停' : '开始'}
            >
              {running ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </button>
            <button
              onClick={reset}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line-3 text-txt-muted transition-colors hover:border-line-strong hover:text-txt-secondary"
              aria-label="重置"
            >
              <RotateCcw size={17} />
            </button>
            <button
              onClick={complete}
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
            {focusableTasks.length === 0 ? (
              <p className="py-4 text-center text-xs text-txt-muted">没有进行中的任务,也可以不带任务纯专注</p>
            ) : (
              <Select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">不关联任务(纯专注)</option>
                {focusableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                    {t.focusMinutes ? ` · 已专注 ${t.focusMinutes} 分钟` : ''}
                  </option>
                ))}
              </Select>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-txt-muted">
              25 分钟专注 + 5 分钟短休,每完成一个番茄自动切换;计时中切走也没关系,标题栏会一直显示倒计时。
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
