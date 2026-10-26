/** 番茄历史保留旧版按天次数，元数据保存真实分钟和完成凭据。 */
export interface PomodoroHistory { [date: string]: number }
const KEY = 'nexus:pomodoro'
const DATE = /^\d{4}-\d{2}-\d{2}$/
interface Ledger { history: PomodoroHistory; minutes: PomodoroHistory; completed: Record<string, string> }
const validNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0

function loadLedger(): Ledger {
  let raw: Record<string, unknown> = {}
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (value && typeof value === 'object' && !Array.isArray(value)) raw = value as Record<string, unknown>
  } catch { /* 损坏存储按空历史处理 */ }
  const history: PomodoroHistory = {}
  for (const [date, count] of Object.entries(raw)) {
    if (DATE.test(date) && validNumber(count)) history[date] = Math.floor(count)
  }
  const storedMinutes = raw.__minutes && typeof raw.__minutes === 'object' ? raw.__minutes as Record<string, unknown> : {}
  const minutes: PomodoroHistory = {}
  for (const [date, count] of Object.entries(history)) {
    const value = storedMinutes[date]
    minutes[date] = validNumber(value) ? value : count * 25
  }
  const completed: Record<string, string> = {}
  if (raw.__completed && typeof raw.__completed === 'object') {
    for (const [id, date] of Object.entries(raw.__completed)) {
      if (typeof date === 'string' && DATE.test(date)) completed[id] = date
    }
  }
  return { history, minutes, completed }
}

export function loadHistory(): PomodoroHistory { return loadLedger().history }
export function loadFocusMinutes(): PomodoroHistory { return loadLedger().minutes }

/** 调用方须在跨标签页互斥锁内记账；次数、分钟、凭据在同一次写入中保存。 */
export function recordSession(date: string, minutes = 25, sessionId?: string): boolean {
  if (!DATE.test(date) || !Number.isFinite(minutes) || minutes < 1 || minutes > 180) throw new Error('专注记录的日期或时长无效')
  const ledger = loadLedger()
  if (sessionId && Object.hasOwn(ledger.completed, sessionId)) return false
  ledger.history[date] = (ledger.history[date] ?? 0) + 1
  ledger.minutes[date] = (ledger.minutes[date] ?? 0) + minutes
  if (sessionId) ledger.completed[sessionId] = date
  localStorage.setItem(KEY, JSON.stringify({ ...ledger.history, __minutes: ledger.minutes, __completed: ledger.completed }))
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('nexus:focus-history'))
  return true
}

export function recentSessions(n: number): { key: string; label: string; count: number; minutes: number }[] {
  const { history, minutes } = loadLedger()
  const result = []
  for (let i = Math.max(0, Math.min(3660, Math.floor(n))) - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    result.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: history[key] ?? 0, minutes: minutes[key] ?? 0 })
  }
  return result
}
export function todaySessions(): number { return recentSessions(1)[0]?.count ?? 0 }
export function todayFocusMinutes(): number { return recentSessions(1)[0]?.minutes ?? 0 }
