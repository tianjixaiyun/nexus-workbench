import { useTaskStore } from '@/stores/taskStore'
import { useDailyStore } from '@/stores/dailyStore'
import { useHabitStore } from '@/stores/habitStore'
import { useMemoStore } from '@/stores/memoStore'
import { loadHistory, loadFocusMinutes } from './pomodoro'
import { MOODS } from './data/types'
import { todayStr } from './utils'

/**
 * AI 自动日志(Dayflow/Meridian 式,本地模板引擎版):
 * 把当天的任务/专注/心情/习惯/碎碎念自动写成一段工作日志。
 * 路线图预告的「后接 LLM」可在 generatePrompt 的槽位上直接接入,无需改 UI。
 */

export interface JournalEntry {
  /** YYYY-MM-DD */
  date: string
  text: string
  generatedAt: string
  /** 用户手动编辑过 → 自动再生成时不覆盖 */
  edited: boolean
}

const KEY = 'nexus:journal'

export function loadJournal(): Record<string, JournalEntry> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveJournalEntry(entry: JournalEntry): void {
  const all = loadJournal()
  all[entry.date] = entry
  // 只保留最近 120 天,防止无限膨胀
  const dates = Object.keys(all).sort()
  while (dates.length > 120) {
    const oldest = dates.shift()!
    delete all[oldest]
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // localStorage 满时静默失败
  }
}

/** 给 LLM 的结构化事实(未来接真模型时直接作为 prompt 槽位) */
export function journalFacts(date: string) {
  const tasks = useTaskStore.getState().tasks
  const done = tasks.filter((t) => t.status === 'done' && t.completedAt?.startsWith(date) && !t.deletedAt)
  const created = tasks.filter((t) => t.createdAt.startsWith(date) && !t.deletedAt)
  const sessions = loadHistory()[date] ?? 0
  const habits = useHabitStore.getState().habits
  const activeHabits = habits.filter((h) => !h.archived)
  const habitsDone = activeHabits.filter((h) => h.dates.includes(date))
  const daily = useDailyStore.getState().dailies.find((d) => d.date === date)
  const memos = useMemoStore.getState().memos.filter((m) => m.createdAt.startsWith(date))
  return { date, done, created, sessions, focusMinutes: loadFocusMinutes()[date] ?? 0, activeHabits, habitsDone, daily, memos }
}

/** 本地模板引擎:把当天事实写成一段可读日志 */
export function generateJournal(date = todayStr()): string {
  const f = journalFacts(date)
  const lines: string[] = []
  lines.push(`## ${date} · 工作日志`)
  lines.push('')

  if (f.done.length) {
    lines.push(`✅ **完成 ${f.done.length} 件事**`)
    for (const t of f.done.slice(0, 5)) lines.push(`- ${t.title}${t.focusMinutes ? `(专注 ${t.focusMinutes} 分钟)` : ''}`)
    if (f.done.length > 5) lines.push(`- …以及另外 ${f.done.length - 5} 件`)
  } else {
    lines.push('✅ 今天没有标记完成的任务——也许在蓄力,也许该把任务拆小一点。')
  }
  lines.push('')

  if (f.created.length) lines.push(`🆕 新建了 ${f.created.length} 个任务,方向感还在。`)

  if (f.sessions > 0) {
    lines.push(`⏱ **专注 ${f.sessions} 个番茄(约 ${f.focusMinutes} 分钟)**——沉下去的时间不会辜负你。`)
  } else {
    lines.push('⏱ 今天没有专注记录。挑一件事,给自己 25 分钟。')
  }

  if (f.activeHabits.length) {
    const names = f.habitsDone.map((h) => h.name).join('、')
    lines.push(`🔥 习惯打卡 ${f.habitsDone.length}/${f.activeHabits.length}${names ? `:${names}` : ''}`)
  }

  if (f.daily) {
    const mood = MOODS.find((m) => m.value === f.daily!.mood)
    lines.push(`💭 心情:${mood ? `${mood.emoji} ${mood.label}` : f.daily.mood}${f.daily.note ? ` ——「${f.daily.note}」` : ''}`)
  }

  if (f.memos.length) {
    lines.push(`📝 碎碎念 ${f.memos.length} 条,灵感都存下来了。`)
  }

  // 一句自动评语(按数据拼装,本地规则引擎)
  lines.push('')
  const score = (f.done.length ? 2 : 0) + (f.sessions > 0 ? 2 : 0) + (f.habitsDone.length ? 1 : 0) + (f.daily?.mood ?? 0) / 5
  if (score >= 4.5) lines.push('> 今天是高产的一天:推进了任务,也照顾到了节奏。保持这个势头。🚀')
  else if (score >= 3) lines.push('> 稳定输出的一天。明天的自己会感谢今天没偷懒的你。🌱')
  else if (f.done.length === 0 && f.sessions === 0) lines.push('> 今天更像是休息日。休息也是计划的一部分,明天重新起航。⛵')
  else lines.push('> 有进展,但还有余地。明天从最要紧的那件事开始。☕')

  return lines.join('\n')
}
