import { afterEach, beforeEach, expect, test, vi } from 'vitest'

let data: Map<string, string>
let classes: Set<string>
beforeEach(() => {
  vi.resetModules()
  data = new Map()
  classes = new Set()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) })
  vi.stubGlobal('document', { documentElement: { classList: { toggle: (name: string, enabled: boolean) => enabled ? classes.add(name) : classes.delete(name) }, style: {} } })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
})
afterEach(() => vi.unstubAllGlobals())

test('stored calm appearance applies on boot without losing the dashboard or weather', async () => {
  data.set('nexus:settings', JSON.stringify({ calmMode: true, theme: 'light', weatherCity: { name: '上海', lat: 31.2, lon: 121.5 }, dashboardLayout: [{ id: 'notes', visible: false }], firstOpenedAt: '2026-10-26T00:00:00Z' }))
  const { useSettingsStore } = await import('../src/stores/settingsStore')
  expect(useSettingsStore.getState().calmMode).toBe(true)
  expect(classes.has('nexus-calm')).toBe(true)
  useSettingsStore.getState().setCalmMode(false)
  const saved = JSON.parse(data.get('nexus:settings')!)
  expect(saved.calmMode).toBe(false)
  expect(saved.theme).toBe('light')
  expect(saved.weatherCity.name).toBe('上海')
  expect(saved.dashboardLayout[0]).toEqual({ id: 'notes', visible: false })
})

test('system motion reduction remains respected when the manual option is off', async () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
  const { prefersReducedMotion } = await import('../src/lib/useReducedMotion')
  const { useSettingsStore } = await import('../src/stores/settingsStore')
  useSettingsStore.getState().setCalmMode(false)
  expect(prefersReducedMotion()).toBe(true)
})

test('a failed preference write is reported while the current page still becomes calm', async () => {
  const { useSettingsStore } = await import('../src/stores/settingsStore')
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: () => { throw new Error('quota') } })
  expect(useSettingsStore.getState().setCalmMode(true)).toBe(false)
  expect(classes.has('nexus-calm')).toBe(true)
})
