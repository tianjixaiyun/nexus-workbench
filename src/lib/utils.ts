export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * URL 协议白名单:仅放行 http/https/mailto/tel 与无协议的相对路径。
 * 防 javascript:/data:/vbscript: 等危险协议进入 markdown 渲染与链接中心。
 */
export function isSafeUrl(url: string): boolean {
  const m = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.exec(url.trim())
  if (!m) return true
  return ['http:', 'https:', 'mailto:', 'tel:'].includes(m[0].toLowerCase())
}

/** 生成 UUID(本地与云端模式共用同一套 ID 方案) */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const nowIso = (): string => new Date().toISOString()

/** Date → 本地时区 YYYY-MM-DD */
export function toDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** 本地时区的 YYYY-MM-DD */
export function todayStr(): string {
  return toDateStr(new Date())
}

/** YYYY-MM-DD → 「10月24日」(跨年时带年份) */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const now = new Date()
  return y === now.getFullYear() ? `${m}月${d}日` : `${y}年${m}月${d}日`
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  return dueDate < todayStr()
}

/** ISO 时间戳 → 本地时区 YYYY-MM-DD(用于按天统计) */
export function isoToLocalDateStr(iso: string): string {
  return toDateStr(new Date(iso))
}

/** ISO 时间 → 「10月24日」 */
export function formatIsoDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return d.getFullYear() === now.getFullYear() ? `${m}月${day}日` : `${d.getFullYear()}年${m}月${day}日`
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function weekDay(): string {
  return '日一二三四五六'[new Date().getDay()]
}
