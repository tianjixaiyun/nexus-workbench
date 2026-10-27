import { beforeEach, expect, it, vi } from 'vitest'
import { collectDeviceBackup, restoreDeviceBackup, validateDeviceBackup } from '../src/lib/deviceBackup'
import { newFocusTimer } from '../src/lib/focusTimer'

beforeEach(() => {
  vi.restoreAllMocks()
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } })
})
const journal = { '2026-10-27': { date: '2026-10-27', text: '手动写下的收获', generatedAt: '2026-10-27T00:00:00Z', edited: true } }

it('roundtrips actual focus minutes, completion receipts and manually edited journal text', () => {
  const history = { '2026-10-27': 2, __minutes: { '2026-10-27': 73 }, __completed: { 'session-one': '2026-10-27' } }
  localStorage.setItem('nexus:pomodoro', JSON.stringify(history))
  localStorage.setItem('nexus:journal', JSON.stringify(journal))
  const snapshot = collectDeviceBackup()
  localStorage.removeItem('nexus:pomodoro')
  localStorage.removeItem('nexus:journal')
  restoreDeviceBackup(snapshot, ['nexus:pomodoro', 'nexus:journal'])
  expect(JSON.parse(localStorage.getItem('nexus:pomodoro')!)).toEqual(history)
  expect(JSON.parse(localStorage.getItem('nexus:journal')!)).toEqual(journal)
})

it('never exports auth tokens, PIN, activity state, reminder timestamps or unknown setting fields', () => {
  localStorage.setItem('sb-test-auth-token', 'secret')
  localStorage.setItem('nexus-pin', 'MTIzNA==')
  localStorage.setItem('nexus:settings', JSON.stringify({ theme: 'light', calmMode: true, lastExportAt: '2026-10-27', authToken: 'hidden' }))
  localStorage.setItem('nexus:focus-timer', JSON.stringify({ ...newFocusTimer(), sessionId: 'private-session', taskOwner: 'private-user', taskId: 'private-task', running: true }))
  const snapshot = collectDeviceBackup()
  const serialized = JSON.stringify(snapshot)
  expect(snapshot['nexus:settings']).toEqual({ theme: 'light', calmMode: true })
  expect(serialized).not.toMatch(/secret|MTIzNA|authToken|private-session|private-user|private-task|lastExportAt/)
  expect(snapshot['nexus-focus-config']).toMatchObject({ work: 25 })
})

it('rejects unapproved storage keys and damaged journal entries', () => {
  expect(() => validateDeviceBackup({ 'nexus-pin': '1234' })).toThrow(/不支持/)
  expect(() => validateDeviceBackup({ 'nexus:journal': { '2026-10-27': { date: '2026-10-27', text: 42, edited: true, generatedAt: '2026-10-27' } } })).toThrow()
})

it('only restores selected keys and preserves current non-selected content and reminder metadata', () => {
  localStorage.setItem('nexus:journal', JSON.stringify(journal))
  localStorage.setItem('nexus:settings', JSON.stringify({ theme: 'dark', lastExportAt: '2026-10-27T02:00:00Z' }))
  restoreDeviceBackup({ 'nexus:settings': { theme: 'light', calmMode: true }, 'nexus:journal': {} }, ['nexus:settings'])
  expect(JSON.parse(localStorage.getItem('nexus:settings')!)).toEqual({ theme: 'light', calmMode: true, lastExportAt: '2026-10-27T02:00:00Z' })
  expect(JSON.parse(localStorage.getItem('nexus:journal')!)).toEqual(journal)
})

it('restores previous localStorage values after a mid-step quota failure and reports that outcome', () => {
  const oldHistory = JSON.stringify({ '2026-10-26': 1 })
  localStorage.setItem('nexus:pomodoro', oldHistory)
  localStorage.setItem('nexus:journal', JSON.stringify(journal))
  const originalSet = localStorage.setItem.bind(localStorage)
  let failed = false
  vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (key === 'nexus:journal' && !failed) { failed = true; throw new Error('QuotaExceededError') }
    originalSet(key, value)
  })
  expect(() => restoreDeviceBackup({ 'nexus:pomodoro': {}, 'nexus:journal': {} }, ['nexus:pomodoro', 'nexus:journal'])).toThrow(/已还原/)
  expect(localStorage.getItem('nexus:pomodoro')).toBe(oldHistory)
  expect(JSON.parse(localStorage.getItem('nexus:journal')!)).toEqual(journal)
})

it('uses a valid new focus config even if the obsolete legacy config is corrupt', () => {
  localStorage.setItem('nexus-focus-config', '{')
  localStorage.setItem('nexus:focus-timer', JSON.stringify(newFocusTimer({ work: 40, short: 10, long: 15, dailyGoal: 6 })))
  expect(collectDeviceBackup()['nexus-focus-config']).toMatchObject({ work: 40, short: 10 })
})

it('preserves legitimate partial profile data while rejecting unsafe socials', () => {
  localStorage.setItem('nexus-profile-v1', JSON.stringify({ name: '小明' }))
  expect(collectDeviceBackup()['nexus-profile-v1']).toEqual({ name: '小明' })
  expect(() => validateDeviceBackup({ 'nexus-profile-v1': { socials: [{ label: '危险入口', url: 'javascript:alert(1)' }] } })).toThrow()
})

it.each([{ theme: ['light'] }, { theme: ['dark'] }, { theme: 1 }, { theme: true }, { theme: { toString: () => 'light' } }])('rejects a non-string theme instead of coercing it: %j', ({ theme }) => {
  expect(() => validateDeviceBackup({ 'nexus:settings': { theme } })).toThrow(/主题/)
})

it.each(['java\nscript:alert(1)', 'java\tscript:alert(1)', '\rjavascript:alert(1)'])('rejects hidden-protocol control characters in profile socials: %j', (url) => {
  expect(() => validateDeviceBackup({ 'nexus-profile-v1': { socials: [{ label: '链接', url }] } })).toThrow(/地址/)
})

it.each(['../profile', '/about', '#contact'])('preserves legitimate relative profile links: %j', (url) => {
  expect(validateDeviceBackup({ 'nexus-profile-v1': { socials: [{ label: '链接', url }] } })['nexus-profile-v1']).toEqual({ socials: [{ label: '链接', url }] })
})

