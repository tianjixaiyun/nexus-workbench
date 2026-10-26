import { create } from 'zustand'
import { FOCUS_STATE_KEY, configureFocusTimer, finishFocusTimer, pauseFocusTimer, restoreFocusTimer, startFocusTimer, switchFocusMode, withFocusLock, type FocusCompletion, type FocusMode, type FocusTimer } from '@/lib/focusTimer'
import { recordSession } from '@/lib/pomodoro'
import { uid } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useTaskStore } from '@/stores/taskStore'

function readTimer(): FocusTimer {
  const parse = (key: string): unknown => {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') }
    catch { return null }
  }
  return restoreFocusTimer(parse(FOCUS_STATE_KEY), parse('nexus-focus-config'))
}
interface FocusState {
  timer: FocusTimer
  now: number
  busy: boolean
  error: string | null
  storageBlocked: boolean
  lastCompletion: FocusCompletion | null
  sync: () => void
  tick: () => Promise<void>
  toggle: () => Promise<void>
  reset: () => Promise<void>
  skip: () => Promise<void>
  switchMode: (mode: FocusMode) => Promise<void>
  configure: (config: unknown) => Promise<void>
  selectTask: (taskId: string, taskOwner: string) => Promise<void>
  clearError: () => void
}

export const useFocusStore = create<FocusState>((set, get) => {
  const report = (message: string) => set({ error: message })
  const creditTask = async (completed: FocusCompletion) => {
    if (completed.mode !== 'work' || !completed.taskId) return
    try {
      if (!useAuthStore.getState().ready) await useAuthStore.getState().init()
      if (useAuthStore.getState().user?.id !== completed.taskOwner) throw new Error('关联任务属于其他账号，请切回原账号后手动补记')
      if (!useTaskStore.getState().loaded) await useTaskStore.getState().fetch()
      if (useAuthStore.getState().user?.id !== completed.taskOwner) throw new Error('账号已切换')
      const task = useTaskStore.getState().tasks.find((t) => t.id === completed.taskId && !t.deletedAt)
      if (!task) throw new Error('关联任务已删除或未能加载')
      await useTaskStore.getState().addFocusMinutes(completed.taskId, completed.minutes)
    } catch (error) {
      // 任务接口不支持幂等凭据，失败不自动重试，避免网络不确定时重复累加。
      report(`专注已记录 ${completed.minutes} 分钟，但任务加时未确认：${error instanceof Error ? error.message : '请检查连接后核对任务时长'}。`)
    }
  }
  const mutate = async (update: (timer: FocusTimer, now: number) => FocusTimer, silent = false) => {
    if (!silent) set({ busy: true })
    try {
      const completion = await withFocusLock(() => {
        const current = readTimer()
        const now = Date.now()
        const finished = finishFocusTimer(current, now)
        const next = update(finished.timer, now)
        let completed = finished.completion
        if (completed?.mode === 'work' && !recordSession(completed.date, completed.minutes, completed.id)) completed = null
        if (next !== current) localStorage.setItem(FOCUS_STATE_KEY, JSON.stringify(next))
        set({ timer: next, now, storageBlocked: false, ...(completed ? { lastCompletion: completed } : {}) })
        return completed
      })
      // 云端任务写入不能占住本地心跳；失败由 creditTask 自行展示。
      if (completion) void creditTask(completion)
    } catch (error) {
      set({ storageBlocked: true })
      report(`专注操作未保存：${error instanceof Error ? error.message : '存储不可用，请重试'}。请保留当前页面并检查浏览器存储权限。`)
    } finally { if (!silent) set({ busy: false }) }
  }
  return {
    timer: readTimer(), now: Date.now(), busy: false, error: null, storageBlocked: false, lastCompletion: null,
    sync: () => set({ timer: readTimer(), now: Date.now() }),
    tick: () => get().timer.running ? mutate((timer) => timer, true) : Promise.resolve(),
    toggle: () => mutate((timer, now) => timer.running ? pauseFocusTimer(timer, now) : startFocusTimer(timer, now, uid())),
    reset: () => mutate((timer) => switchFocusMode(timer, timer.mode)),
    skip: () => mutate((timer) => switchFocusMode(timer, timer.mode === 'work' ? 'short' : 'work')),
    switchMode: (mode) => mutate((timer) => switchFocusMode(timer, mode)),
    configure: (config) => mutate((timer) => configureFocusTimer(timer, config)),
    selectTask: (taskId, taskOwner) => mutate((timer) => timer.sessionId ? timer : { ...timer, taskId, taskOwner }),
    clearError: () => set({ error: null, storageBlocked: false }),
  }
})
