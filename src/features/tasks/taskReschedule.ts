import { shiftDay } from './taskFilters'

/** 下一周的周一，按本地日历计算。 */
export function nextMonday(today: string): string {
  const [year, month, day] = today.split('-').map(Number)
  const weekday = new Date(year, month - 1, day).getDay()
  return shiftDay(today, weekday === 0 ? 1 : 8 - weekday)
}

/** 顺序保存，遇到错误立即停止，避免把部分成功误报成全部成功。 */
export async function rescheduleSequentially(ids: string[], save: (id: string) => Promise<void>): Promise<{ completed: string[]; remaining: string[] }> {
  const completed: string[] = []
  for (const [index, id] of ids.entries()) {
    try { await save(id); completed.push(id) }
    catch { return { completed, remaining: ids.slice(index) } }
  }
  return { completed, remaining: [] }
}
