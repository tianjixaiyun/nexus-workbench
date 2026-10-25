import { useState, type FormEvent } from 'react'
import { CalendarClock, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { daysUntil, useMilestoneStore } from '@/stores/milestoneStore'

const EMOJIS = ['🎯', '✈️', '🎂', '💑', '🎓', '🏆', '📅', '🚀', '🏖️', '📝']

function daysLabel(days: number): { text: string; tone: string } {
  if (days === 0) return { text: '就是今天', tone: 'bg-accent-soft text-accent border-accent' }
  if (days === 1) return { text: '明天', tone: 'bg-accent-soft text-accent border-accent' }
  if (days > 1) return { text: `${days} 天后`, tone: 'bg-surface-2 text-txt-secondary border-line-3' }
  return { text: `${-days} 天前`, tone: 'bg-surface-1 text-txt-muted border-line-2' }
}

export function MilestonesCard() {
  const { milestones, add, remove } = useMilestoneStore()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [emoji, setEmoji] = useState('🎯')

  // 最近的排前面:未来的按时间正序,已过去的按时间倒序放最后
  const sorted = [...milestones].sort((a, b) => {
    const da = daysUntil(a.date)
    const db = daysUntil(b.date)
    if (da >= 0 && db >= 0) return da - db
    if (da >= 0) return -1
    if (db >= 0) return 1
    return db - da
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    void add({ title: title.trim(), date, emoji })
    setTitle('')
    setDate('')
    setEmoji('🎯')
    setAdding(false)
  }

  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-txt-secondary">倒数日</p>
        <button
          onClick={() => setAdding((v) => !v)}
          className="cursor-pointer rounded-lg p-1 text-txt-muted transition-colors hover:bg-surface-3 hover:text-accent"
          aria-label="添加倒数日"
        >
          <Plus size={15} />
        </button>
      </div>

      {adding && (
        <form onSubmit={handleSubmit} className="mb-3 flex flex-col gap-2 rounded-xl border border-line-2 bg-surface-1 p-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="事项:例如 项目上线" autoFocus />
          <div className="flex gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
            <Button type="submit" variant="primary" disabled={!title.trim() || !date}>
              添加
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={cn(
                  'h-7 w-7 cursor-pointer rounded-lg text-sm transition-all',
                  emoji === e ? 'bg-accent-soft ring-1 ring-accent' : 'opacity-60 hover:opacity-100',
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </form>
      )}

      {sorted.length === 0 && !adding ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <CalendarClock size={22} className="text-txt-muted" />
          <p className="text-xs text-txt-muted">纪念日、截止日、旅行出发日…值得倒数的事都放这里</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.slice(0, 6).map((m) => {
            const d = daysUntil(m.date)
            const label = daysLabel(d)
            return (
              <div key={m.id} className="group flex items-center gap-3 rounded-xl border border-line-1 bg-surface-1 px-3 py-2.5">
                <span className="text-lg">{m.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{m.title}</p>
                  <p className="text-[11px] text-txt-muted">{m.date}</p>
                </div>
                <span className={cn('rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap', label.tone)}>
                  {label.text}
                </span>
                <button
                  onClick={() => void remove(m.id)}
                  className="hidden cursor-pointer rounded-md p-1 text-txt-muted hover:bg-rose-500/15 hover:text-danger group-hover:block"
                  aria-label="删除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
