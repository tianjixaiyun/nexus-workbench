import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Copy, Loader2, Save, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { MOODS } from '@/lib/data/types'
import { buildReflectionDraft, isReflectionDate } from '@/lib/reflection'
import { loadFocusMinutes } from '@/lib/pomodoro'
import { cn, toDateStr, todayStr } from '@/lib/utils'
import { useDailyStore } from '@/stores/dailyStore'
import { useHabitStore } from '@/stores/habitStore'
import { useTaskStore } from '@/stores/taskStore'

interface Draft { mood: number; note: string }

export function DailyReflection() {
  const dailies = useDailyStore((state) => state.dailies)
  const loaded = useDailyStore((state) => state.loaded)
  const tasks = useTaskStore((state) => state.tasks)
  const habits = useHabitStore((state) => state.habits)
  const [date, setDate] = useState(todayStr)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null)
  const [, setRevision] = useState(0)
  const today = todayStr()
  const current = dailies.find((day) => day.date === date)
  const note = drafts[date]?.note ?? (typeof current?.note === 'string' ? current.note : '')
  const mood = drafts[date]?.mood ?? current?.mood ?? 3
  const dirty = !!drafts[date] && (!current || mood !== current.mood || note !== (current.note ?? ''))
  const validDate = isReflectionDate(date)
  const earliest = new Date()
  earliest.setDate(earliest.getDate() - 29)

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener('nexus:focus-history', refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('nexus:focus-history', refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const history = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${today}T12:00:00`)
    day.setDate(day.getDate() - index)
    return toDateStr(day)
  }), [today])

  const edit = (patch: Partial<Draft>) => {
    setDrafts((all) => ({ ...all, [date]: { mood, note, ...patch } }))
    setStatus(null)
  }

  const save = async () => {
    if (saving || !validDate || !dirty) return
    setSaving(true)
    setStatus(null)
    try {
      await useDailyStore.getState().upsert(date, mood, note)
      setDrafts((all) => {
        const rest = { ...all }
        delete rest[date]
        return rest
      })
      setStatus({ error: false, text: '复盘已保存。' })
    } catch {
      setStatus({ error: true, text: '保存失败，文字仍在这里，请重试。' })
    } finally {
      setSaving(false)
    }
  }

  const generate = () => {
    if (!validDate) return
    const focusMinutes = loadFocusMinutes()[date] ?? 0
    const facts = buildReflectionDraft({ date, tasks, habits, focusMinutes })
    edit({ note: note.trim() ? `${note}\n\n${facts}` : `${facts}\n\n今日收获：\n遇到的阻碍：\n明日重点：` })
    setStatus({ error: false, text: '已按记录整理成草稿，修改后再保存。' })
  }

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      const feeling = MOODS.find((item) => item.value === mood)
      await navigator.clipboard.writeText(`# ${date} 每日复盘\n\n心情：${feeling?.emoji ?? ''} ${feeling?.label ?? '未记录'}\n\n${note}`)
      setStatus({ error: false, text: 'Markdown 已复制。' })
    } catch {
      setStatus({ error: true, text: '复制失败，可选中文字手动复制。' })
    }
  }

  return (
    <Card className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-txt-secondary"><BookOpen size={16} className="text-accent" />每日复盘</h2>
        <label className="flex items-center gap-2 text-xs text-txt-muted">
          日期
          <Input type="date" aria-label="复盘日期" value={date} min={toDateStr(earliest)} max={today} disabled={saving || !loaded} className="w-auto max-w-full text-xs" onChange={(event) => { setDate(event.target.value); setStatus(null) }} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="复盘心情">
        <span className="mr-1 text-xs text-txt-muted">这一天过得怎么样</span>
        {MOODS.map((item) => (
          <button key={item.value} type="button" aria-label={item.label} aria-pressed={mood === item.value} title={item.label} disabled={saving || !loaded || !validDate} onClick={() => edit({ mood: item.value })} className={cn('h-9 w-9 cursor-pointer rounded-xl text-lg transition-colors disabled:cursor-not-allowed', mood === item.value ? 'bg-accent-soft ring-1 ring-accent' : 'bg-surface-1 hover:bg-surface-2')}>
            {item.emoji}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-2 text-xs text-txt-muted">
        收获、阻碍和明日重点
        <Textarea aria-label="每日复盘文字" rows={5} maxLength={6000} value={note} disabled={saving || !loaded || !validDate} placeholder="写下一点收获，给明天留一个方向。" onChange={(event) => edit({ note: event.target.value })} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void save() } }} />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={saving || !loaded || !validDate} onClick={generate}><Sparkles size={13} />{note.trim() ? '追加记录摘要' : '根据记录起草'}</Button>
          <Button size="sm" variant="ghost" disabled={!note.trim() || !validDate} onClick={() => void copy()}><Copy size={13} />复制</Button>
        </div>
        <Button size="sm" variant="primary" disabled={saving || !loaded || !validDate || !dirty} onClick={() => void save()}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}{saving ? '保存中…' : '保存复盘'}</Button>
      </div>
      {!validDate && <p role="alert" className="text-xs text-danger">请选择有效的今天或过去日期。</p>}
      {status && <p role={status.error ? 'alert' : 'status'} className={cn('text-xs', status.error ? 'text-danger' : 'text-txt-secondary')}>{status.text}</p>}
      <div className="border-t border-line-1 pt-3">
        <p className="mb-2 text-[11px] text-txt-muted">最近 7 天 · 点选回看{dirty ? ' · 当前有未保存内容' : ''}</p>
        <div className="flex flex-wrap gap-2">
          {history.map((key) => {
            const record = dailies.find((day) => day.date === key)
            return <button key={key} type="button" disabled={saving || !loaded} onClick={() => { setDate(key); setStatus(null) }} aria-label={`回看 ${key} 复盘`} aria-pressed={date === key} title={record?.note || '尚未记录'} className={cn('flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1.5 text-xs transition-colors', date === key ? 'border-accent bg-accent-soft text-accent' : 'border-line-2 text-txt-muted hover:text-txt-secondary')}><span>{MOODS.find((item) => item.value === record?.mood)?.emoji ?? '·'}</span>{key.slice(5)}{drafts[key] ? ' *' : ''}</button>
          })}
        </div>
      </div>
    </Card>
  )
}
