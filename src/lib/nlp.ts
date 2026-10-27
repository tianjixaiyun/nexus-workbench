import type { TaskPriority, TaskRecurrence } from './data/types'
import { toDateStr } from './utils'

/**
 * 中文自然语言任务解析(Todoist 式):
 * "明天下午给客户发方案 #工作 p1 每周" →
 *   { cleaned: '给客户发方案', dueDate: 明天, recurrence: 'weekly', priority: 'high' }
 *
 * 支持:今天/明天/后天/大后天、N天后、周X/礼拜X、下周X、
 *      X月X日(号)、每天/每日、每周(可带星期)、每月X号、p1/p2/p3、!1/!2/!3
 */

export interface ParsedInput {
  /** 去掉已识别片段后的正文 */
  cleaned: string
  dueDate: string | null
  recurrence: TaskRecurrence | null
  priority: TaskPriority | null
  /** 命中的原文片段(用于展示识别 chips) */
  matched: string[]
}

const WEEKDAYS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 }

const CN_NUM: Record<string, number> = {
  一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  二十一: 21, 二十二: 22, 二十三: 23, 二十四: 24, 二十五: 25, 二十六: 26,
  二十七: 27, 二十八: 28, 二十九: 29, 三十: 30, 三十一: 31,
}

function cnNumToNumber(text: string): number | null {
  if (/^\d+$/.test(text)) return Number(text)
  if (text.includes('十')) {
    const [tens, ones] = text.split('十')
    return (tens ? CN_NUM[tens] ?? 0 : 1) * 10 + (ones ? CN_NUM[ones] ?? 0 : 0)
  }
  return CN_NUM[text] ?? null
}

/** 从基准日推算"下一个周X"(含今天:今天正好是周X则返回今天) */
function nextWeekday(base: Date, weekday: number, weeksAhead = 0): Date {
  const d = new Date(base)
  const diff = (weekday - d.getDay() + 7) % 7
  d.setDate(d.getDate() + (weeksAhead ? -((d.getDay() + 6) % 7) + weeksAhead * 7 + (weekday + 6) % 7 : diff))
  return d
}

function validDate(year: number, month: number, day: number): Date | null {
  const value = new Date(year, month - 1, day)
  return value.getFullYear() === year && value.getMonth() === month - 1 && value.getDate() === day ? value : null
}

function fmt(d: Date): string {
  return toDateStr(d)
}

export function parseNaturalLanguage(raw: string, today = new Date()): ParsedInput {
  let text = raw
  const matched: string[] = []
  let dueDate: string | null = null
  let recurrence: TaskRecurrence | null = null
  let priority: TaskPriority | null = null

  const take = (pattern: RegExp, handler: (m: RegExpMatchArray) => void | boolean) => {
    const m = text.match(pattern)
    if (!m) return
    if (handler(m) === false) return
    matched.push(m[0].trim())
    text = text.replace(m[0], ' ')
  }

  // —— 重复规则 ——
  take(/每天|每日/, () => {
    recurrence = 'daily'
  })
  take(/每月([0-9一二两三四五六七八九十]+)[号日]/, (m) => {
    const day = cnNumToNumber(m[1])
    if (!day || day > 31) return false
    recurrence = 'monthly'
    if (day && !dueDate) {
      const d = new Date(today.getFullYear(), today.getMonth(), Math.min(day, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()))
      if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        d.setDate(1)
        d.setMonth(d.getMonth() + 1)
        d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
      }
      dueDate = fmt(d)
    }
  })
  // 光写「每月」也算每月重复(不带具体日期)
  take(/每月(?![0-9一二两三四五六七八九十])/, () => {
    recurrence = recurrence ?? 'monthly'
  })
  take(/每周([一二三四五六日天])?/, (m) => {
    recurrence = 'weekly'
    const wd = m[1] ? WEEKDAYS[m[1]] : 1
    if (!dueDate) dueDate = fmt(nextWeekday(today, wd))
  })

  // —— 相对日期(大后天要先于后天匹配) ——
  take(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/, (m) => {
    const date = validDate(Number(m[1]), Number(m[2]), Number(m[3]))
    if (!date) return false
    dueDate = fmt(date)
  })
  take(/大后天/, () => {
    const d = new Date(today)
    d.setDate(d.getDate() + 3)
    dueDate = fmt(d)
  })
  take(/后天/, () => {
    const d = new Date(today)
    d.setDate(d.getDate() + 2)
    dueDate = fmt(d)
  })
  take(/今天|今日/, () => {
    dueDate = fmt(today)
  })
  take(/明天/, () => {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    dueDate = fmt(d)
  })
  take(/([0-9]+)\s*天[后後]/, (m) => {
    const n = Number(m[1])
    if (n <= 0 || n >= 366) return false
    if (n > 0 && n < 366) {
      const d = new Date(today)
      d.setDate(d.getDate() + n)
      dueDate = fmt(d)
    }
  })
  take(/下+周([一二三四五六日天])?/, (m) => {
    const wd = m[1] ? WEEKDAYS[m[1]] : 1
    if (!dueDate) dueDate = fmt(nextWeekday(today, wd, m[0].match(/^下+/)![0].length))
  })
  take(/(?:周|礼拜|星期)([一二三四五六日天])/, (m) => {
    if (!dueDate) dueDate = fmt(nextWeekday(today, WEEKDAYS[m[1]]))
  })
  take(/(?<!\d)([12]?[0-9])月([1-3]?[0-9])[号日]/, (m) => {
    const month = Number(m[1])
    const day = Number(m[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let d = validDate(today.getFullYear(), month, day)
      if (!d) return false
      if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        const next = validDate(today.getFullYear() + 1, month, day)
        if (!next) return false
        d = next
      }
      if (!dueDate) dueDate = fmt(d)
    } else return false
  })

  // —— 优先级(Todoist 式 p1 最高) ——
  take(/\bp1\b/i, () => {
    priority = 'high'
  })
  take(/\bp2\b/i, () => {
    priority = 'medium'
  })
  take(/\bp3\b|![123]/, (m) => {
    priority = m[0].includes('1') ? 'high' : m[0].includes('2') ? 'medium' : 'low'
  })

  // 清理残留的多余空格与孤立标点
  const cleaned = text
    .replace(/[ \t]+/g, ' ')
    .replace(/^[\s,，。.]+|[\s,，]+$/g, '')
    .trim()

  return { cleaned, dueDate, recurrence, priority, matched }
}
