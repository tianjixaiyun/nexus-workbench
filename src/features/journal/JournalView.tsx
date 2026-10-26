import { useEffect, useMemo, useState } from 'react'
import { BookOpen, RefreshCw, Save, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useJournalStore } from '@/stores/journalStore'
import { useTaskStore } from '@/stores/taskStore'
import { useDailyStore } from '@/stores/dailyStore'
import { useHabitStore } from '@/stores/habitStore'
import { useMemoStore } from '@/stores/memoStore'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

/**
 * 自动日志页(Dayflow/Meridian 式):
 * 打开即自动把今天的任务/专注/心情/习惯写成一段工作日志,可编辑;
 * 历史日志按天回看。数据源与工作台同源,本地模板引擎离线可用。
 */
export function JournalView() {
  const { entries, loaded, fetch, generate, save } = useJournalStore()
  const tasksLoaded = useTaskStore((s) => s.loaded)
  const habitsLoaded = useHabitStore((s) => s.loaded)
  const dailiesLoaded = useDailyStore((s) => s.loaded)
  const memosLoaded = useMemoStore((s) => s.loaded)
  const [today, setToday] = useState('')
  const [draft, setDraft] = useState('')
  const [dirty, setDirty] = useState(false)

  // 进入页面时补拉数据源(与 AppLayout 的首屏拉取互补)
  useEffect(() => {
    fetch()
    const stores = [useTaskStore.getState(), useHabitStore.getState(), useDailyStore.getState(), useMemoStore.getState()]
    for (const s of stores) if (!s.loaded) void s.fetch()
    setToday(new Date().toLocaleDateString('sv-SE')) // sv-SE → YYYY-MM-DD 本地时区
  }, [fetch])

  // 数据就绪且今天还没有日志 → 自动生成一次
  useEffect(() => {
    if (!today || !loaded || !tasksLoaded || !habitsLoaded || !dailiesLoaded || !memosLoaded) return
    if (!entries[today]) {
      const text = generate(today)
      setDraft(text)
      setDirty(false)
    }
  }, [today, loaded, tasksLoaded, habitsLoaded, dailiesLoaded, memosLoaded, entries, generate])

  const todayEntry = today ? entries[today] : undefined
  const shownText = dirty ? draft : (todayEntry?.text ?? '')

  const history = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.date !== today)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 30),
    [entries, today],
  )

  const regenerate = () => {
    const text = generate(today, true)
    setDraft(text)
    setDirty(false)
    toast.info('已重新生成今日日志', '按当前最新数据拼装')
  }

  const saveDraft = () => {
    save(today, shownText)
    setDirty(false)
    toast.success('日志已保存', today)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 今日日志 */}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <p className="text-sm font-semibold tracking-wide">今日日志 · {today}</p>
            {todayEntry?.edited && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-txt-muted">已手动编辑</span>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={regenerate}>
              <RefreshCw size={13} />
              重新生成
            </Button>
            <Button size="sm" variant="primary" onClick={saveDraft} disabled={!dirty}>
              <Save size={13} />
              保存
            </Button>
          </div>
        </div>
        {loaded && tasksLoaded ? (
          <textarea
            value={shownText}
            onChange={(e) => {
              setDraft(e.target.value)
              setDirty(true)
            }}
            rows={14}
            className="w-full rounded-xl border border-line-2 bg-input-bg p-4 font-mono text-[13px] leading-relaxed outline-none transition-colors focus:border-accent"
            placeholder="今天的日志会自动生成…"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="nexus-sk h-4" style={{ width: `${88 - i * 7}%` }} />
            ))}
          </div>
        )}
        <p className="text-[11px] text-txt-muted">
          由本地模板引擎根据真实数据自动拼装:完成任务 · 专注番茄 · 习惯打卡 · 心情复盘 · 碎碎念。改完点保存,再次生成不会覆盖你的编辑。
        </p>
      </Card>

      {/* 历史日志 */}
      <p className="mt-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-txt-secondary">
        <BookOpen size={15} />
        历史日志({history.length})
      </p>
      {history.length === 0 ? (
        <EmptyState icon={BookOpen} title="还没有历史日志" hint="明天再打开这页,昨天就会被自动写成日志" />
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((e) => (
            <details key={e.date} className="glass-card group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center gap-3 text-sm">
                <span className="font-mono text-txt-secondary">{e.date}</span>
                {e.edited && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-txt-muted">已编辑</span>}
                <span className={cn('ml-auto truncate text-xs text-txt-muted')}>{e.text.replace(/[#*>✅⏱🔥💭📝🆕\n]/g, ' ').slice(0, 42)}…</span>
              </summary>
              <pre className="mt-3 border-t border-line-1 pt-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-txt-secondary">{e.text}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
