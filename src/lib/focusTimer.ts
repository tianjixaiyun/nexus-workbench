export type FocusMode = 'work' | 'short' | 'long'
export interface FocusConfig { work: number; short: number; long: number; dailyGoal: number }
export const DEFAULT_FOCUS_CONFIG: FocusConfig = { work: 25, short: 5, long: 15, dailyGoal: 8 }
export interface FocusTimer {
  version: 1
  config: FocusConfig
  mode: FocusMode
  totalSeconds: number
  remainingMs: number
  running: boolean
  endAt: number | null
  sessionId: string | null
  taskId: string
  taskOwner: string
}
export const FOCUS_STATE_KEY = 'nexus:focus-timer'
export const FOCUS_MODE_LABELS: Record<FocusMode, string> = { work: '专注', short: '短休', long: '长休' }
const object = (raw: unknown): Record<string, unknown> => raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
const bounded = (raw: unknown, fallback: number, max: number) => typeof raw === 'number' && Number.isFinite(raw) ? Math.max(1, Math.min(max, Math.round(raw))) : fallback
export function normalizeFocusConfig(raw: unknown): FocusConfig {
  const value = object(raw)
  return {
    work: bounded(value.work, 25, 180), short: bounded(value.short, 5, 180),
    long: bounded(value.long, 15, 180), dailyGoal: bounded(value.dailyGoal, 8, 50),
  }
}
export function newFocusTimer(config: unknown = DEFAULT_FOCUS_CONFIG, mode: FocusMode = 'work'): FocusTimer {
  const normalized = normalizeFocusConfig(config)
  return { version: 1, config: normalized, mode, totalSeconds: normalized[mode] * 60, remainingMs: normalized[mode] * 60000, running: false, endAt: null, sessionId: null, taskId: '', taskOwner: '' }
}
export function restoreFocusTimer(raw: unknown, legacyConfig?: unknown, now = Date.now()): FocusTimer {
  const value = object(raw)
  const fallback = newFocusTimer(legacyConfig)
  if (value.version !== 1 || !['work', 'short', 'long'].includes(String(value.mode))) return fallback
  const timer = newFocusTimer(value.config, value.mode as FocusMode)
  const total = value.totalSeconds
  if (typeof total !== 'number' || !Number.isInteger(total) || total < 60 || total > 10800) return timer
  const remaining = value.remainingMs
  if (typeof remaining !== 'number' || !Number.isFinite(remaining) || remaining < 0 || remaining > total * 1000) return timer
  const sessionId = typeof value.sessionId === 'string' && value.sessionId.length > 0 && value.sessionId.length <= 120 ? value.sessionId : null
  const endAt = typeof value.endAt === 'number' && Number.isFinite(value.endAt) && value.endAt > 0 && value.endAt <= now + total * 1000 + 1000 ? value.endAt : null
  if (value.running && (!sessionId || !endAt)) return timer
  return { ...timer, totalSeconds: total, remainingMs: remaining, sessionId, running: value.running === true, endAt: value.running ? endAt : null, taskId: typeof value.taskId === 'string' ? value.taskId.slice(0, 120) : '', taskOwner: typeof value.taskOwner === 'string' ? value.taskOwner.slice(0, 120) : '' }
}
export function remainingSeconds(timer: FocusTimer, now = Date.now()): number {
  return Math.max(0, Math.min(timer.totalSeconds, Math.ceil((timer.running && timer.endAt !== null ? timer.endAt - now : timer.remainingMs) / 1000)))
}
export function startFocusTimer(timer: FocusTimer, now: number, id: string): FocusTimer {
  if (timer.running) return timer
  const remainingMs = timer.remainingMs > 0 ? timer.remainingMs : timer.totalSeconds * 1000
  return { ...timer, running: true, endAt: now + remainingMs, remainingMs, sessionId: timer.sessionId ?? id }
}
export function pauseFocusTimer(timer: FocusTimer, now: number): FocusTimer {
  return timer.running ? { ...timer, running: false, endAt: null, remainingMs: Math.max(0, (timer.endAt ?? now) - now) } : timer
}
export function switchFocusMode(timer: FocusTimer, mode: FocusMode): FocusTimer {
  return { ...newFocusTimer(timer.config, mode), taskId: timer.taskId, taskOwner: timer.taskOwner }
}
export function configureFocusTimer(timer: FocusTimer, config: unknown): FocusTimer {
  const normalized = normalizeFocusConfig(config)
  return timer.sessionId ? { ...timer, config: normalized } : { ...switchFocusMode({ ...timer, config: normalized }, timer.mode) }
}
export interface FocusCompletion { id: string; mode: FocusMode; minutes: number; date: string; taskId: string; taskOwner: string }
export function finishFocusTimer(timer: FocusTimer, now = Date.now()): { timer: FocusTimer; completion: FocusCompletion | null } {
  if (!timer.running || !timer.sessionId || timer.endAt === null || now < timer.endAt) return { timer, completion: null }
  const d = new Date(timer.endAt)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { timer: switchFocusMode(timer, timer.mode === 'work' ? 'short' : 'work'), completion: { id: timer.sessionId, mode: timer.mode, minutes: timer.totalSeconds / 60, date, taskId: timer.taskId, taskOwner: timer.taskOwner } }
}
export function formatFocusTime(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

let database: Promise<IDBDatabase> | null = null
/** 同步临界区；IndexedDB 的 readwrite 事务在不同标签页之间也串行执行。 */
export async function withFocusLock<T>(action: () => T): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request('nexus:focus-timer', action)
  if (typeof indexedDB === 'undefined') throw new Error('浏览器无法提供可靠的计时存储，请使用支持 IndexedDB 的浏览器')
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('nexus-focus-coordination', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('mutex')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { database = null; reject(request.error) }
    request.onblocked = () => { database = null; reject(new Error('计时存储被旧页面占用，请关闭旧页面后重试')) }
  })
  const db = await database
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('mutex', 'readwrite')
    let result: T
    let failure: unknown
    const request = tx.objectStore('mutex').get('timer')
    request.onsuccess = () => {
      try { result = action(); tx.objectStore('mutex').put(Date.now(), 'timer') }
      catch (error) { failure = error; tx.abort() }
    }
    tx.oncomplete = () => resolve(result)
    tx.onabort = tx.onerror = () => reject(failure ?? tx.error ?? new Error('无法锁定计时存储'))
  })
}
