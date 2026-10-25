import { useEffect, useMemo, useState } from 'react'
import { Loader2, Trash2, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Chart, chartPalette } from '@/components/ui/Chart'
import { CountUp } from '@/components/fx/micro'
import { cn, todayStr } from '@/lib/utils'
import { useExpenseStore } from '@/stores/expenseStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { EXPENSE_CATEGORIES, type Expense } from '@/lib/data/types'

/**
 * 极简记账(ExpenseOwl 式):一行快速记一笔 + 月度环形分类 + 近三月趋势。
 */

const CAT_EMOJI = (cat: string): string =>
  [...EXPENSE_CATEGORIES, { value: '工资', emoji: '💼' }, { value: '奖金', emoji: '🏆' }, { value: '副业', emoji: '✨' }, { value: '理财', emoji: '📈' }, { value: '其他收入', emoji: '🎁' }].find((c) => c.value === cat)?.emoji ?? '📦'

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function fmtMoney(n: number): string {
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

export function ExpenseView() {
  const { expenses, loaded, fetch, add, remove } = useExpenseStore()
  const theme = useSettingsStore((s) => s.theme)
  const palette = chartPalette(theme === 'light')

  // 输入状态
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>('餐饮')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())

  useEffect(() => {
    if (!loaded) void fetch()
  }, [loaded, fetch])

  // 切换类型时重置分类
  useEffect(() => {
    setCategory(kind === 'expense' ? '餐饮' : '工资')
  }, [kind])

  const thisMonth = monthKey(todayStr())
  const monthItems = useMemo(() => expenses.filter((e) => monthKey(e.date) === thisMonth), [expenses, thisMonth])
  const monthExpense = monthItems.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0)
  const monthIncome = monthItems.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0)

  const cats = kind === 'expense' ? EXPENSE_CATEGORIES : [{ value: '工资', emoji: '💼' }, { value: '奖金', emoji: '🏆' }, { value: '副业', emoji: '✨' }, { value: '理财', emoji: '📈' }, { value: '其他', emoji: '🎁' }]

  /** 环形图:本月支出分类占比 */
  const pieOption = useMemo(() => {
    const byCat = new Map<string, number>()
    for (const e of monthItems) if (e.kind === 'expense') byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount)
    const data = [...byCat.entries()].sort((a, b) => b[1] - a[1])
    return {
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['58%', '82%'],
        itemStyle: { borderRadius: 6, borderColor: palette.tooltipBg, borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, formatter: '{b}\n¥{c}', color: palette.label } },
        data: data.length ? data.map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })) : [{ name: '暂无支出', value: 1, itemStyle: { color: palette.grid } }],
      }],
    }
  }, [monthItems, palette])

  /** 近三月柱状:支出/收入 */
  const barOption = useMemo(() => {
    const months: { key: string; label: string }[] = []
    for (let i = 2; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${d.getMonth() + 1}月` })
    }
    const out = months.map((m) => Math.round(expenses.filter((e) => e.kind === 'expense' && monthKey(e.date) === m.key).reduce((s, e) => s + e.amount, 0)))
    const inc = months.map((m) => Math.round(expenses.filter((e) => e.kind === 'income' && monthKey(e.date) === m.key).reduce((s, e) => s + e.amount, 0)))
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['支出', '收入'], textStyle: { color: palette.legend }, top: 0 },
      grid: { left: 42, right: 8, top: 30, bottom: 22 },
      xAxis: { type: 'category', data: months.map((m) => m.label), axisLabel: { color: palette.label }, axisLine: { lineStyle: { color: palette.grid } } },
      yAxis: { type: 'value', axisLabel: { color: palette.label }, splitLine: { lineStyle: { color: palette.grid } } },
      series: [
        { name: '支出', type: 'bar', data: out, itemStyle: { color: palette.danger, borderRadius: [4, 4, 0, 0] }, barWidth: 16 },
        { name: '收入', type: 'bar', data: inc, itemStyle: { color: palette.success, borderRadius: [4, 4, 0, 0] }, barWidth: 16 },
      ],
    }
  }, [expenses, palette])

  const submit = async () => {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return
    await add({ kind, amount: Math.round(n * 100) / 100, category, note: note.trim(), date })
    setAmount('')
    setNote('')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* 记一笔 + 月度概览 */}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <Card className="space-y-3.5">
          <div className="flex rounded-xl border border-line-2 p-1">
            {(['expense', 'income'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  'flex-1 cursor-pointer rounded-lg py-1.5 text-xs font-medium transition-colors',
                  kind === k
                    ? k === 'expense' ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'
                    : 'text-txt-muted hover:text-txt-secondary',
                )}
              >
                {k === 'expense' ? '支出' : '收入'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-txt-muted">¥</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              placeholder="0.00"
              inputMode="decimal"
              className="min-w-0 flex-1 bg-transparent font-mono text-2xl font-bold outline-none placeholder:text-txt-muted/50"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  'cursor-pointer rounded-full px-2.5 py-1 text-[11px] transition-colors',
                  category === c.value ? 'bg-accent text-white' : 'bg-surface-2 text-txt-secondary hover:bg-surface-3',
                )}
              >
                {c.emoji} {c.value}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[46%] rounded-lg border border-line-2 bg-surface-1 px-2.5 py-1.5 text-xs text-txt-secondary outline-none"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              placeholder="备注(可空)"
              className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface-1 px-2.5 py-1.5 text-xs outline-none placeholder:text-txt-muted/60"
            />
          </div>
          <button
            onClick={() => void submit()}
            disabled={!Number(amount)}
            className="w-full cursor-pointer rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            记一笔
          </button>
        </Card>

        {/* 月度概览 */}
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0 space-y-3 sm:w-44">
            <div>
              <p className="text-[11px] text-txt-muted">本月支出</p>
              <p className="font-mono text-3xl font-bold text-danger">
                <CountUp value={Math.round(monthExpense)} />
              </p>
            </div>
            <div className="flex gap-5">
              <div>
                <p className="text-[11px] text-txt-muted">收入</p>
                <p className="font-mono text-lg font-bold text-success"><CountUp value={Math.round(monthIncome)} /></p>
              </div>
              <div>
                <p className="text-[11px] text-txt-muted">结余</p>
                <p className="font-mono text-lg font-bold text-txt-primary"><CountUp value={Math.round(monthIncome - monthExpense)} /></p>
              </div>
            </div>
          </div>
          <Chart option={pieOption} className="h-52 min-w-0 flex-1" />
        </Card>
      </div>

      {/* 近三月趋势 */}
      <Card>
        <p className="mb-1 text-sm font-semibold text-txt-secondary">近三个月收支</p>
        <Chart option={barOption} className="h-56 w-full" />
      </Card>

      {/* 最近记录 */}
      {!loaded ? (
        <div className="flex justify-center py-10 text-txt-muted"><Loader2 className="animate-spin" size={20} /></div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="还没有记账"
          hint="从今天的第一笔开始——奶茶、地铁票都算数"
          steps={[
            { title: '选类型', desc: '支出还是收入,点一下切换' },
            { title: '点分类', desc: '🍜餐饮 🚇交通 🛍️购物…芯片一点就选好' },
            { title: '看趋势', desc: '环形图+近三月柱状,钱去哪了一眼看清' },
          ]}
        />
      ) : (
        <Card>
          <p className="mb-3 text-sm font-semibold text-txt-secondary">最近记录</p>
          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {expenses.slice(0, 50).map((e: Expense) => (
              <div key={e.id} className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-sm">{CAT_EMOJI(e.category)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {e.category}{e.note && <span className="ml-2 text-xs text-txt-muted">{e.note}</span>}
                  </p>
                  <p className="font-mono text-[10px] text-txt-muted/70">{e.date}</p>
                </div>
                <span className={cn('font-mono text-sm font-bold', e.kind === 'expense' ? 'text-danger' : 'text-success')}>
                  {e.kind === 'expense' ? '-' : '+'}¥{fmtMoney(e.amount)}
                </span>
                <button
                  onClick={() => void remove(e.id)}
                  className="cursor-pointer rounded-md p-1.5 text-txt-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-surface-3 hover:text-danger"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
