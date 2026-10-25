import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useNavigate } from 'react-router'
import { recentSessions } from '@/lib/pomodoro'
import { useTaskStore } from '@/stores/taskStore'
import { useHabitStore } from '@/stores/habitStore'
import { useGoalStore } from '@/stores/goalStore'
import { useWorkStore } from '@/stores/workStore'
import { useMemoStore } from '@/stores/memoStore'
import { useExpenseStore } from '@/stores/expenseStore'
import type { Task } from '@/lib/data/types'

/**
 * 轻量成就系统:
 * - 定义一批成就,监听任务/习惯/目标/作品/番茄数据,越线即解锁
 * - 解锁弹徽章 toast;进度存 localStorage,不上云、不打扰
 */

const LS_KEY = 'nexus-achievements'

export interface Achievement {
  id: string
  icon: string
  name: string
  desc: string
}

interface Metrics {
  doneTasks: number
  focusTotal: number
  maxStreak: number
  goalDone: boolean
  works: number
  memos: number
  expenses: number
  konami: boolean
  night: boolean
}

export function loadUnlocked(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function habitStreak(dates: string[]): number {
  const set = new Set(dates)
  const day = 86_400_000
  const fmt = (t: number) => {
    const d = new Date(t)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let t0 = today.getTime()
  if (!set.has(fmt(t0))) {
    t0 -= day // 今天没打卡也能从昨天起算连续
    if (!set.has(fmt(t0))) return 0
  }
  let streak = 0
  while (set.has(fmt(t0))) {
    streak++
    t0 -= day
  }
  return streak
}

export function collectMetrics(): Metrics {
  const tasks = useTaskStore.getState().tasks
  const habits = useHabitStore.getState().habits
  const goals = useGoalStore.getState().goals
  const works = useWorkStore.getState().works
  const memos = useMemoStore.getState().memos.length
  const expenses = useExpenseStore.getState().expenses.length
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const focusTotal = recentSessions(90).reduce((sum, s) => sum + s.count, 0)
  const maxStreak = habits.reduce((m, h) => Math.max(m, habitStreak(h.dates ?? [])), 0)
  const goalDone = goals.some((g) => {
    if (g.mode === 'manual') return (g.manualProgress ?? 0) >= 100
    if (!g.tag) return false
    const tagged = tasks.filter((t) => (t.tags ?? []).includes(g.tag!) && !t.deletedAt)
    return tagged.length > 0 && tagged.every((t: Task) => t.status === 'done')
  })
  const hour = new Date().getHours()
  return { doneTasks, focusTotal, maxStreak, goalDone, works: works.length, memos, expenses, konami: localStorage.getItem('nexus-konami') === '1', night: hour >= 23 || hour < 5 }
}

export const ACHIEVEMENT_DEFS: (Achievement & { test: (m: Metrics) => boolean })[] = [
  { id: 'first-task', icon: '🌊', name: '初次下潜', desc: '完成第一件任务', test: (m) => m.doneTasks >= 1 },
  { id: 'tasks-10', icon: '🐟', name: '小有节奏', desc: '累计完成 10 件任务', test: (m) => m.doneTasks >= 10 },
  { id: 'tasks-100', icon: '🐋', name: '百件深潜', desc: '累计完成 100 件任务', test: (m) => m.doneTasks >= 100 },
  { id: 'focus-1', icon: '🍅', name: '第一个番茄', desc: '完成一次专注番茄', test: (m) => m.focusTotal >= 1 },
  { id: 'focus-50', icon: '⏳', name: '深海静默', desc: '累计完成 50 个番茄', test: (m) => m.focusTotal >= 50 },
  { id: 'streak-3', icon: '🔥', name: '三而不断', desc: '任一习惯连续打卡 3 天', test: (m) => m.maxStreak >= 3 },
  { id: 'streak-7', icon: '⚡', name: '七日不辍', desc: '任一习惯连续打卡 7 天', test: (m) => m.maxStreak >= 7 },
  { id: 'goal-100', icon: '🎯', name: '登顶', desc: '一个目标进度达到 100%', test: (m) => m.goalDone },
  { id: 'work-1', icon: '🎨', name: '第一次展出', desc: '作品集收录第一件作品', test: (m) => m.works >= 1 },
  { id: 'memo-1', icon: '💭', name: '第一句碎碎念', desc: '在碎碎念时间线记下第一条想法', test: (m) => m.memos >= 1 },
  { id: 'memo-30', icon: '🫧', name: '气泡三十枚', desc: '累计记下 30 条碎碎念', test: (m) => m.memos >= 30 },
  { id: 'expense-1', icon: '🪙', name: '第一笔账', desc: '记下第一笔收支', test: (m) => m.expenses >= 1 },
  { id: 'konami', icon: '🔑', name: '深海密码', desc: '输入了那串古老的秘籍(↑↑↓↓←→←→BA)', test: (m) => m.konami },
  { id: 'night', icon: '🌙', name: '深海访客', desc: '在 23:00-5:00 的深夜造访', test: (m) => m.night },
]

// ---------- toast 队列 ----------
interface ToastState {
  queue: Achievement[]
  push: (a: Achievement) => void
  shift: () => void
}

const useToast = create<ToastState>((set) => ({
  queue: [],
  push: (a) => set((s) => ({ queue: [...s.queue, a].slice(-3) })),
  shift: () => set((s) => ({ queue: s.queue.slice(1) })),
}))

let checking = false
export function checkAchievementsNow() {
  if (checking) return
  checking = true
  queueMicrotask(() => {
    checking = false
    try {
      const unlocked = loadUnlocked()
      const m = collectMetrics()
      for (const def of ACHIEVEMENT_DEFS) {
        if (!unlocked[def.id] && def.test(m)) {
          unlocked[def.id] = new Date().toISOString()
          useToast.getState().push(def)
        }
      }
      localStorage.setItem(LS_KEY, JSON.stringify(unlocked))
    } catch {
      // 数据未就绪时静默
    }
  })
}

/** 徽章 toast 宿主 + 数据监听;挂在 App 根部 */
const TOAST_CSS = '@keyframes nexus-toast-in { from { opacity: 0; transform: translateX(40px) } to { opacity: 1; transform: translateX(0) } }'

export function AchievementWatcher() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = TOAST_CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, [])
  const navigate = useNavigate()
  const queue = useToast((s) => s.queue)
  const shift = useToast((s) => s.shift)
  const [shown, setShown] = useState<Achievement[]>([])

  useEffect(() => {
    const unsubTask = useTaskStore.subscribe(checkAchievementsNow)
    const unsubHabit = useHabitStore.subscribe(checkAchievementsNow)
    const unsubGoal = useGoalStore.subscribe(checkAchievementsNow)
    const unsubWork = useWorkStore.subscribe(checkAchievementsNow)
    const unsubMemo = useMemoStore.subscribe(checkAchievementsNow)
    const unsubExpense = useExpenseStore.subscribe(checkAchievementsNow)
    const timer = window.setInterval(checkAchievementsNow, 60_000)
    checkAchievementsNow()
    return () => {
      unsubTask()
      unsubHabit()
      unsubGoal()
      unsubWork()
      unsubMemo()
      unsubExpense()
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    setShown(queue.slice(0, 3))
    if (queue.length) {
      const t = setTimeout(shift, 4200)
      return () => clearTimeout(t)
    }
  }, [queue, shift])

  if (!shown.length) return null

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-[9994] flex flex-col gap-2.5">
      {shown.map((a, i) => (
        <button
          key={a.id + i}
          onClick={() => { shift(); navigate('/achievements') }}
          className="glass-card pointer-events-auto flex cursor-pointer items-center gap-3.5 rounded-2xl border border-cyan-300/20 bg-[#0a1e33]/85 px-4 py-3 text-left shadow-[0_12px_40px_rgba(6,50,80,0.5)] backdrop-blur-xl transition-transform hover:scale-[1.03]"
          style={{ transform: `translateY(${(shown.length - 1 - i) * 4}px)`, animation: 'nexus-toast-in 380ms cubic-bezier(0.2,0.9,0.3,1.2)' }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/25 to-cyan-300/25 text-xl">
            {a.icon}
          </span>
          <div>
            <p className="text-[10px] tracking-[0.25em] text-cyan-200/80">成就解锁</p>
            <p className="text-sm font-bold text-white">{a.name}</p>
            <p className="text-[11px] text-white/60">{a.desc}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
