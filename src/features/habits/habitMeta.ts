import type { HabitColor } from '@/lib/data/types'

/** 习惯 5 色的展示样式映射 */
export const HABIT_COLOR_META: Record<HabitColor, { dot: string; tint: string; text: string }> = {
  cyan: { dot: 'bg-accent-solid', tint: 'bg-accent-soft', text: 'text-accent' },
  violet: { dot: 'bg-violet-400', tint: 'bg-violet-400/10', text: 'text-accent-2' },
  emerald: { dot: 'bg-emerald-400', tint: 'bg-emerald-400/10', text: 'text-success' },
  amber: { dot: 'bg-amber-400', tint: 'bg-amber-400/10', text: 'text-warn' },
  rose: { dot: 'bg-rose-400', tint: 'bg-rose-400/10', text: 'text-danger' },
}

/** 习惯可选 emoji */
export const HABIT_EMOJIS = ['💪', '📚', '🧘', '🏃', '💧', '🌙', '✍️', '🧹', '🎯', '☀️', '🥗', '💰', '🎸', '🧠', '📞', '🚭']

/** 最近 N 天的日期键(从旧到新) */
export function recentDayKeys(n: number): string[] {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return keys
}
