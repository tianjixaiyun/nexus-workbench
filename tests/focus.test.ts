import { beforeEach, expect, test, vi } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import { useFocusStore } from '../src/stores/focusStore'
import { loadHistory, loadFocusMinutes, recordSession, recentSessions } from '../src/lib/pomodoro'
import { configureFocusTimer, finishFocusTimer, newFocusTimer, normalizeFocusConfig, pauseFocusTimer, remainingSeconds, restoreFocusTimer, startFocusTimer, switchFocusMode, withFocusLock } from '../src/lib/focusTimer'

beforeEach(() => {
  vi.restoreAllMocks()
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
  vi.stubGlobal('indexedDB', indexedDB)
  vi.stubGlobal('navigator', {})
  useFocusStore.setState({ timer: newFocusTimer(), now: 1000000, error: null, busy: false, storageBlocked: false, lastCompletion: null })
})

test('a restored or second-tab completion cannot count the same session twice', () => {
  recordSession('2026-10-26', 40, 'focus-session-1')
  recordSession('2026-10-26', 40, 'focus-session-1')
  expect(loadHistory()['2026-10-26']).toBe(1)
  expect(loadFocusMinutes()['2026-10-26']).toBe(40)
})

test('legacy counts retain 25-minute estimates while new custom sessions add real minutes', () => {
  localStorage.setItem('nexus:pomodoro', JSON.stringify({ '2026-10-26': 2 }))
  recordSession('2026-10-26', 40, 'custom-40')
  expect(loadHistory()['2026-10-26']).toBe(3)
  expect(loadFocusMinutes()['2026-10-26']).toBe(90)
})

test('malformed history cannot leak invalid counts into reports', () => {
  localStorage.setItem('nexus:pomodoro', JSON.stringify({ '2026-10-26': -1, broken: 3, '2026-10-25': '4' }))
  expect(loadHistory()).toEqual({})
  localStorage.setItem('nexus:pomodoro', 'null')
  expect(recentSessions(1)[0].minutes).toBe(0)
})

test('refresh restores the same deadline rather than starting a new duration', () => {
  const started = startFocusTimer(newFocusTimer(), 1000000, 'session-restore')
  const restored = restoreFocusTimer(JSON.parse(JSON.stringify(started)), undefined, 1065000)
  expect(remainingSeconds(restored, 1065000)).toBe(1435)
  expect(restored.endAt).toBe(2500000)
})

test('pause freezes precise remaining time and resume keeps the original session identity', () => {
  const started = startFocusTimer(newFocusTimer(), 1000000, 'same-session')
  const paused = pauseFocusTimer(started, 1065500)
  expect(remainingSeconds(paused, 9000000)).toBe(1435)
  const resumed = startFocusTimer(paused, 2000000, 'unused-new-id')
  expect(resumed.sessionId).toBe('same-session')
  expect(resumed.endAt).toBe(3434500)
})

test('changing config during an active or paused session applies to the next session only', () => {
  const started = startFocusTimer(newFocusTimer(), 1000000, 'active-25')
  const changed = configureFocusTimer(pauseFocusTimer(started, 1060000), { work: 40, short: 10, long: 15, dailyGoal: 6 })
  expect(changed.totalSeconds).toBe(1500)
  expect(changed.remainingMs).toBe(1440000)
  expect(switchFocusMode(changed, 'work').totalSeconds).toBe(2400)
})

test('only a naturally elapsed session completes and credits its custom duration', () => {
  const started = startFocusTimer(newFocusTimer({ work: 40, short: 5, long: 15, dailyGoal: 8 }), 1000000, 'custom-session')
  expect(finishFocusTimer(started, 3399999).completion).toBeNull()
  const finished = finishFocusTimer(started, 3400000)
  expect(finished.completion?.minutes).toBe(40)
  expect(finished.timer.mode).toBe('short')
  expect(finishFocusTimer(finished.timer, 5000000).completion).toBeNull()
})

test('skip and reset cancel an unfinished session without creating a completion', () => {
  const started = startFocusTimer(newFocusTimer(), 1000000, 'not-finished')
  const skipped = switchFocusMode(started, 'short')
  const reset = switchFocusMode(started, 'work')
  expect(finishFocusTimer(skipped, 5000000).completion).toBeNull()
  expect(finishFocusTimer(reset, 5000000).completion).toBeNull()
  expect(reset.remainingMs).toBe(1500000)
  expect(reset.sessionId).toBeNull()
})

test('corrupt snapshots and unsafe durations restore to bounded defaults', () => {
  expect(restoreFocusTimer(null).running).toBe(false)
  expect(restoreFocusTimer({ version: 1, mode: 'work', totalSeconds: -30 }).remainingMs).toBe(1500000)
  expect(normalizeFocusConfig({ work: Infinity, short: -4, long: 999, dailyGoal: 'all' })).toEqual({ work: 25, short: 1, long: 180, dailyGoal: 8 })
})

test('IndexedDB fallback serializes simultaneous tab completions with one ledger credit', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => withFocusLock(() => recordSession('2026-10-26', 50, 'cross-tab'))))
  expect(results.filter(Boolean)).toHaveLength(1)
  expect(loadHistory()['2026-10-26']).toBe(1)
  expect(loadFocusMinutes()['2026-10-26']).toBe(50)
})


test('store restores an elapsed session and concurrent heartbeats record it only once', async () => {
  let clock = 1000000
  vi.spyOn(Date, 'now').mockImplementation(() => clock)
  await useFocusStore.getState().configure({ work: 40, short: 5, long: 15, dailyGoal: 8 })
  await useFocusStore.getState().toggle()
  const persisted = localStorage.getItem('nexus:focus-timer')!
  useFocusStore.setState({ timer: newFocusTimer() })
  localStorage.setItem('nexus:focus-timer', persisted)
  clock = 3400000
  useFocusStore.getState().sync()
  await Promise.all(Array.from({ length: 5 }, () => useFocusStore.getState().tick()))
  expect(useFocusStore.getState().timer.mode).toBe('short')
  expect(useFocusStore.getState().timer.running).toBe(false)
  expect(Object.values(loadHistory())).toEqual([1])
  expect(Object.values(loadFocusMinutes())).toEqual([40])
})

test('store skip cancels a partial work session without recording a full pomodoro', async () => {
  let clock = 1000000
  vi.spyOn(Date, 'now').mockImplementation(() => clock)
  await useFocusStore.getState().toggle()
  clock = 1005000
  await useFocusStore.getState().skip()
  clock = 4000000
  await useFocusStore.getState().tick()
  expect(useFocusStore.getState().timer.mode).toBe('short')
  expect(loadHistory()).toEqual({})
})

test('store reports unavailable persistence instead of starting a session that cannot recover', async () => {
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
  await useFocusStore.getState().toggle()
  expect(useFocusStore.getState().timer.running).toBe(false)
  expect(useFocusStore.getState().error).toContain('未保存')
  expect(useFocusStore.getState().storageBlocked).toBe(true)
  useFocusStore.getState().clearError()
  expect(useFocusStore.getState().storageBlocked).toBe(false)
})

test('task association stays frozen after a session starts, including while paused', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(1000000)
  await useFocusStore.getState().selectTask('first-task', 'first-user')
  await useFocusStore.getState().toggle()
  await useFocusStore.getState().toggle()
  await useFocusStore.getState().selectTask('other-task', 'other-user')
  expect(useFocusStore.getState().timer.taskId).toBe('first-task')
  expect(useFocusStore.getState().timer.taskOwner).toBe('first-user')
})

test('a corrupt legacy config cannot discard a valid running snapshot on the next heartbeat', async () => {
  let clock = 1000000
  vi.spyOn(Date, 'now').mockImplementation(() => clock)
  await useFocusStore.getState().toggle()
  localStorage.setItem('nexus-focus-config', '{')
  clock = 1060000
  await useFocusStore.getState().tick()
  expect(useFocusStore.getState().timer.running).toBe(true)
  expect(remainingSeconds(useFocusStore.getState().timer, clock)).toBe(1440)
})

test('a slow task credit cannot block the local heartbeat or the next break', async () => {
  const [{ useTaskStore }, { useAuthStore }] = await Promise.all([import('../src/stores/taskStore'), import('../src/stores/authStore')])
  const originalTasks = useTaskStore.getState()
  const originalAuth = useAuthStore.getState()
  let clock = 1000000
  vi.spyOn(Date, 'now').mockImplementation(() => clock)
  useAuthStore.setState({ ready: true, user: { id: 'focus-user' } })
  useTaskStore.setState({ loaded: true, tasks: [{ id: 'focus-task', title: '写作', description: '', status: 'doing', priority: 'medium', dueDate: null, completedAt: null, subtasks: [], tags: [], deletedAt: null, recurrence: 'none', focusMinutes: 0, sortOrder: 1, createdAt: '2026-10-26T00:00:00Z', updatedAt: '2026-10-26T00:00:00Z' }] })
  let release!: () => void
  let entered!: () => void
  const creditStarted = new Promise<void>((resolve) => { entered = resolve })
  const delayedCredit = new Promise<void>((resolve) => { release = resolve })
  const credit = vi.spyOn(useTaskStore.getState(), 'addFocusMinutes').mockImplementation(async () => { entered(); await delayedCredit })
  let heartbeat: Promise<void> | undefined
  try {
    await useFocusStore.getState().configure({ work: 1, short: 5, long: 15, dailyGoal: 8 })
    await useFocusStore.getState().selectTask('focus-task', 'focus-user')
    await useFocusStore.getState().toggle()
    clock = 1060000
    let returned = false
    heartbeat = useFocusStore.getState().tick().then(() => { returned = true })
    await creditStarted
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(returned).toBe(true)
    await useFocusStore.getState().toggle()
    clock = 1070000
    await useFocusStore.getState().tick()
    expect(remainingSeconds(useFocusStore.getState().timer, clock)).toBe(290)
    expect(Object.values(loadHistory())).toEqual([1])
    expect(credit).toHaveBeenCalledTimes(1)
  } finally {
    release()
    await heartbeat
    useTaskStore.setState(originalTasks)
    useAuthStore.setState(originalAuth)
  }
})

test('a rejected task credit stays visible but does not block the next break heartbeat', async () => {
  const [{ useTaskStore }, { useAuthStore }] = await Promise.all([import('../src/stores/taskStore'), import('../src/stores/authStore')])
  const originalTasks = useTaskStore.getState()
  const originalAuth = useAuthStore.getState()
  let clock = 1000000
  vi.spyOn(Date, 'now').mockImplementation(() => clock)
  useAuthStore.setState({ ready: true, user: { id: 'focus-user' } })
  useTaskStore.setState({ loaded: true, tasks: [{ id: 'focus-task', title: '写作', description: '', status: 'doing', priority: 'medium', dueDate: null, completedAt: null, subtasks: [], tags: [], deletedAt: null, recurrence: 'none', focusMinutes: 0, sortOrder: 1, createdAt: '2026-10-26T00:00:00Z', updatedAt: '2026-10-26T00:00:00Z' }] })
  vi.spyOn(useTaskStore.getState(), 'addFocusMinutes').mockRejectedValue(new Error('网络离线'))
  try {
    await useFocusStore.getState().configure({ work: 1, short: 5, long: 15, dailyGoal: 8 })
    await useFocusStore.getState().selectTask('focus-task', 'focus-user')
    await useFocusStore.getState().toggle()
    clock = 1060000
    await useFocusStore.getState().tick()
    await vi.waitFor(() => expect(useFocusStore.getState().error).toContain('任务加时未确认'))
    expect(useFocusStore.getState().storageBlocked).toBe(false)
    await useFocusStore.getState().toggle()
    clock = 1070000
    await useFocusStore.getState().tick()
    expect(remainingSeconds(useFocusStore.getState().timer, clock)).toBe(290)
    expect(useFocusStore.getState().error).toContain('任务加时未确认')
  } finally {
    useTaskStore.setState(originalTasks)
    useAuthStore.setState(originalAuth)
  }
})
