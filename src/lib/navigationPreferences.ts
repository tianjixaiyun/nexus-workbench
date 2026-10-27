import { NAV_GROUPS, type NavigationGroup } from './modules'
export interface NavigationPreferences { collapsed: boolean; groups: Record<NavigationGroup, boolean> }
const KEY = 'nexus:navigation-v1'
export const defaultNavigationPreferences = (): NavigationPreferences => ({ collapsed: false, groups: { action: true, record: true, life: true, showcase: false } })
export function loadNavigationPreferences(storage?: Pick<Storage, 'getItem'>): NavigationPreferences {
  const result = defaultNavigationPreferences()
  try {
    const raw: unknown = JSON.parse((storage ?? localStorage).getItem(KEY) ?? '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result
    const value = raw as Partial<NavigationPreferences>
    result.collapsed = value.collapsed === true
    for (const group of NAV_GROUPS) if (typeof value.groups?.[group.id] === 'boolean') result.groups[group.id] = value.groups[group.id]
  } catch { /* 当前页面可继续使用默认导航。 */ }
  return result
}
export function saveNavigationPreferences(value: NavigationPreferences, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? localStorage).setItem(KEY, JSON.stringify(value)); return true } catch { return false }
}
