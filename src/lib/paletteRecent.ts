/**
 * 命令面板「最近使用」:
 * 只记录稳定入口(page:* / action:*)的 key,localStorage 按时间戳去重,最多 10 条。
 * 存储损坏、超界或不可用时静默回退,面板本身不受影响。
 */

const KEY = 'nexus:palette-recent-v1'
export const RECENT_COMMAND_LIMIT = 10

type MiniStorage = Pick<Storage, 'getItem' | 'setItem'>

export function loadRecentCommandKeys(storage?: MiniStorage): string[] {
  try {
    const raw: unknown = JSON.parse((storage ?? localStorage).getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return [...new Set(raw.filter((item): item is string => typeof item === 'string' && item.length > 0))]
      .slice(0, RECENT_COMMAND_LIMIT)
  } catch {
    return []
  }
}

/** 最近使用置顶:新的放最前,重复的只留一份,超出上限的淘汰 */
export function recordRecentCommand(key: string, storage?: MiniStorage): void {
  try {
    const store = storage ?? localStorage
    const next = [key, ...loadRecentCommandKeys(store).filter((item) => item !== key)]
      .slice(0, RECENT_COMMAND_LIMIT)
    store.setItem(KEY, JSON.stringify(next))
  } catch {
    /* localStorage 满或不可用时静默跳过。 */
  }
}
