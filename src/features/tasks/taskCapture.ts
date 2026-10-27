import type { NewTask } from '@/lib/data/types'
import { parseNaturalLanguage } from '@/lib/nlp'

export interface CaptureRow { raw: string; line: number; input: NewTask }
export const CAPTURE_LIMIT = 50
const tagPattern = /(^|\s)#([^\s#]+)/g

export function parseTaskCapture(raw: string, batch: boolean, recognize: boolean, today = new Date()): CaptureRow[] {
  const source = raw.replace(/\r\n?/g, '\n').trim()
  if (!source) return []
  const entries = batch ? source.split('\n').map((text, index) => ({ text, line: index + 1 })).filter(row => row.text.trim()) : [{ text: source, line: 1 }]
  return entries.map(({ text, line }) => {
    const clean = batch ? text.replace(/^\s*(?:[-*+]\s+(?:\[[ xX]\]\s*)?|\d+[.)、]\s+)/, '').trim() : text
    const [header, ...body] = clean.split('\n')
    const tags = [...new Set([...clean.matchAll(tagPattern)].map(match => match[2]))]
    const title = header.replace(tagPattern, '$1').trim()
    const parsed = recognize ? parseNaturalLanguage(title, today) : null
    return { raw: text, line, input: { title: parsed?.cleaned ?? title, description: body.join('\n').trim(), tags, dueDate: parsed?.dueDate ?? null, priority: parsed?.priority ?? 'medium', recurrence: parsed?.recurrence ?? 'none' } }
  })
}

export function captureIssue(rows: CaptureRow[]): string {
  if (!rows.length) return '先写下一条任务。'
  if (rows.length > CAPTURE_LIMIT) return `每次最多添加 ${CAPTURE_LIMIT} 条，请分批处理。`
  const empty = rows.find(row => !row.input.title.trim())
  if (empty) return `第 ${empty.line} 行缺少任务标题，请补充内容或关闭日期识别。`
  if (rows.some(row => row.input.title.length > 500)) return '任务标题最多 500 字，详细内容可放到描述中。'
  return ''
}

/** Stop on the first uncertain write; never retry a batch behind the user's back. */
export async function saveCaptureRows(rows: CaptureRow[], create: (input: NewTask) => Promise<void>, isCurrent: () => boolean, onProgress?: (completed: number) => void) {
  let completed = 0
  for (const row of rows) {
    if (!isCurrent()) return { completed, remaining: rows.slice(completed), interrupted: true }
    try { await create(row.input) }
    catch (cause) { return { completed, remaining: rows.slice(completed), error: cause instanceof Error ? cause.message : '保存失败，请检查连接后重试。' } }
    completed++
    if (!isCurrent()) return { completed, remaining: rows.slice(completed), interrupted: true }
    onProgress?.(completed)
  }
  return { completed, remaining: [], interrupted: false }
}
