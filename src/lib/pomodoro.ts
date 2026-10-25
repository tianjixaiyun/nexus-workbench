/** 番茄钟会话记录(存 localStorage,按天计数) */

export interface PomodoroHistory {
  /** key: YYYY-MM-DD → 完成的专注次数 */
  [date: string]: number
}

const KEY = 'nexus:pomodoro'

export function loadHistory(): PomodoroHistory {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function recordSession(date: string): void {
  const history = loadHistory()
  history[date] = (history[date] ?? 0) + 1
  try {
    localStorage.setItem(KEY, JSON.stringify(history))
  } catch {
    // ignore
  }
}

/** 最近 n 天的会话数(从旧到新) */
export function recentSessions(n: number): { key: string; label: string; count: number }[] {
  const history = loadHistory()
  const result: { key: string; label: string; count: number }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    result.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: history[key] ?? 0 })
  }
  return result
}

export function todaySessions(): number {
  const d = new Date()
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return loadHistory()[key] ?? 0
}
