import { expect, it } from 'vitest'
import { APP_MODULES, NAV_GROUPS, modulesForGroup, shortcutDestination } from '../src/lib/modules'
import { defaultNavigationPreferences, loadNavigationPreferences, saveNavigationPreferences } from '../src/lib/navigationPreferences'
it('places every route in exactly one group or the fixed system footer while retaining shortcuts', () => {
  const routes = NAV_GROUPS.flatMap(group => modulesForGroup(group.id).map(item => item.to))
  const system = APP_MODULES.filter(item => item.group === 'system').map(item => item.to)
  expect([...routes, ...system].sort()).toEqual(APP_MODULES.map(item => item.to).sort())
  expect(new Set(routes).size).toBe(routes.length)
  expect(system.sort()).toEqual(['/settings', '/trash'])
  expect(shortcutDestination('3')).toBe('/tasks')
  expect(shortcutDestination('0')).toBe('/sanctuary')
})
it('defaults to expanded daily groups and a closed showcase', () => {
  expect(defaultNavigationPreferences()).toEqual({ collapsed: false, groups: { action: true, record: true, life: true, showcase: false } })
  expect(loadNavigationPreferences({ getItem: () => '{bad' } as Storage)).toEqual(defaultNavigationPreferences())
})
it('preserves valid choices, ignores unknown fields and reports failed persistence', () => {
  const value = loadNavigationPreferences({ getItem: () => JSON.stringify({ collapsed: true, groups: { action: false, record: 'bad', fake: true } }) } as Storage)
  expect(value.collapsed).toBe(true); expect(value.groups.action).toBe(false); expect(value.groups.record).toBe(true)
  expect(Object.keys(value.groups)).toHaveLength(4)
  expect(saveNavigationPreferences(value, { setItem: () => { throw new Error('quota') } } as unknown as Storage)).toBe(false)
})
