import { useMemo, useRef, useState } from 'react'
import { FileDown, FileUp, Loader2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chart, chartPalette, darkChartBase } from '@/components/ui/Chart'
import { isoToLocalDateStr, toDateStr } from '@/lib/utils'
import { exportData, importData } from '@/lib/backup'
import { useHabitStore } from '@/stores/habitStore'
import { useDailyStore } from '@/stores/dailyStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { activeNotes, useNoteStore } from '@/stores/noteStore'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { Heatmap, HeatmapLegend } from './Heatmap'
import { WeeklyReviewCard } from './WeeklyReview'
import { WrappedModal } from './WrappedModal'

/** 备份导入导出区 */
function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const handleImport = async (file: File) => {
    if (!window.confirm('导入会替换当前全部数据(本地模式整库替换,云端模式追加创建),继续吗?建议先导出当前数据备份。')) return
    setBusy(true)
    setNotice('')
    try {
      const res = await importData(file)
      setNotice(`导入成功:${res.counts},3 秒后刷新页面…`)
      setTimeout(() => window.location.reload(), 3000)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '导入失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <p className="mb-1 text-sm font-semibold tracking-wide text-txt-secondary">数据备份</p>
      <p className="mb-4 text-xs leading-relaxed text-txt-muted">
        全部数据导出为一个 JSON 文件,换电脑或清缓存前先备份;导入会替换当前数据。
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void exportData()}>
          <FileDown size={14} />
          导出备份
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
          <FileUp size={14} />
          导入备份
        </Button>
      </div>
      {notice && <p className="mt-3 text-xs text-accent">{notice}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleImport(file)
          e.target.value = ''
        }}
      />
    </Card>
  )
}

export function StatsView() {
  const [wrappedOpen, setWrappedOpen] = useState(false)
  const allTasks = useTaskStore((s) => s.tasks)
  const tasksLoaded = useTaskStore((s) => s.loaded)
  const tasks = useMemo(() => activeTasks(allTasks), [allTasks])
  const { notes: allNotes, loaded: notesLoaded } = useNoteStore()
  const { habits, loaded: habitsLoaded } = useHabitStore()
  const notes = useMemo(() => activeNotes(allNotes), [allNotes])
  const light = useSettingsStore((s) => s.theme) === 'light'
  const pal = useMemo(() => chartPalette(light), [light])
  const base = useMemo(() => darkChartBase(light), [light])

  const summary = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length
    const doing = tasks.filter((t) => t.status === 'doing').length
    const done = tasks.filter((t) => t.status === 'done').length
    return { todo, doing, done, total: tasks.length }
  }, [tasks])

  const trend = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      return { key: toDateStr(d), label: `${d.getMonth() + 1}/${d.getDate()}` }
    })
    const created = days.map((d) =>
      tasks.filter((t) => isoToLocalDateStr(t.createdAt) === d.key).length,
    )
    const completed = days.map((d) =>
      tasks.filter((t) => t.completedAt && isoToLocalDateStr(t.completedAt) === d.key).length,
    )
    return { labels: days.map((d) => d.label), created, completed }
  }, [tasks])

  const trendOption = useMemo(
    () => ({
      ...base,
      legend: {
        data: ['新建任务', '完成任务'],
        top: 0,
        right: 0,
        textStyle: { color: pal.legend, fontSize: 11 },
        itemWidth: 14,
      },
      grid: { left: 6, right: 12, top: 32, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: trend.labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: pal.grid } },
        axisTick: { show: false },
        axisLabel: { color: pal.label, fontSize: 11 },
      },
      yAxis: {
        type: 'value' as const,
        minInterval: 1,
        splitLine: { lineStyle: { color: pal.grid } },
        axisLabel: { color: pal.label, fontSize: 11 },
      },
      series: [
        {
          name: '新建任务',
          type: 'line' as const,
          smooth: true,
          data: trend.created,
          symbol: 'none',
          lineStyle: { color: pal.accent2, width: 2 },
          itemStyle: { color: pal.accent2 },
        },
        {
          name: '完成任务',
          type: 'line' as const,
          smooth: true,
          data: trend.completed,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color: pal.accent, width: 2 },
          itemStyle: { color: pal.accent },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: pal.areaFrom },
                { offset: 1, color: pal.areaTo },
              ],
            },
          },
        },
      ],
    }),
    [trend, base, pal],
  )

  const statusOption = useMemo(
    () => ({
      ...darkChartBase,
      legend: {
        bottom: 0,
        textStyle: { color: pal.legend, fontSize: 11 },
        itemWidth: 14,
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['52%', '76%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: light ? 'rgba(255,255,255,0.9)' : 'rgba(5,8,15,0.8)', borderWidth: 2 },
          label: { show: false },
          data: [
            { name: '待办', value: summary.todo, itemStyle: { color: pal.muted } },
            { name: '进行中', value: summary.doing, itemStyle: { color: pal.accent } },
            { name: '已完成', value: summary.done, itemStyle: { color: pal.success } },
          ],
        },
      ],
      graphic: summary.total
        ? []
        : [
            {
              type: 'text' as const,
              left: 'center',
              top: '40%',
              style: { text: '暂无任务', fill: pal.label, fontSize: 12 },
            },
          ],
    }),
    [summary],
  )

  const priorityOption = useMemo(
    () => ({
      ...darkChartBase,
      grid: { left: 6, right: 12, top: 24, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: ['高优先级', '中优先级', '低优先级'],
        axisLine: { lineStyle: { color: pal.grid } },
        axisTick: { show: false },
        axisLabel: { color: pal.muted, fontSize: 11 },
      },
      yAxis: {
        type: 'value' as const,
        minInterval: 1,
        splitLine: { lineStyle: { color: pal.grid } },
        axisLabel: { color: pal.label, fontSize: 11 },
      },
      series: [
        {
          type: 'bar' as const,
          barWidth: 36,
          data: [
            {
              value: tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length,
              itemStyle: { color: pal.danger, borderRadius: [6, 6, 0, 0] },
            },
            {
              value: tasks.filter((t) => t.priority === 'medium' && t.status !== 'done').length,
              itemStyle: { color: pal.warn, borderRadius: [6, 6, 0, 0] },
            },
            {
              value: tasks.filter((t) => t.priority === 'low' && t.status !== 'done').length,
              itemStyle: { color: pal.accent, borderRadius: [6, 6, 0, 0] },
            },
          ],
          label: { show: true, position: 'top' as const, color: pal.muted, fontSize: 11 },
        },
      ],
    }),
    [tasks],
  )

  // 习惯打卡热力图数据(全部习惯按天求和,近 26 周)
  const habitHeat = useMemo(() => {
    const map = new Map<string, number>()
    for (const h of habits) {
      for (const d of h.dates) {
        map.set(d, (map.get(d) ?? 0) + 1)
      }
    }
    return map
  }, [habits])

  // 心情曲线数据(近 14 天,没记录的日子断开)
  const dailies = useDailyStore((s) => s.dailies)
  const dailyLoaded = useDailyStore((s) => s.loaded)
  const moodTrend = useMemo(() => {
    const byDate = new Map(dailies.map((d) => [d.date, d.mood]))
    const labels: string[] = []
    const values: (number | null)[] = []
    for (let i = 13; i >= 0; i--) {
      const dt = new Date()
      dt.setDate(dt.getDate() - i)
      const key = toDateStr(dt)
      labels.push(`${dt.getMonth() + 1}/${dt.getDate()}`)
      values.push(byDate.get(key) ?? null)
    }
    return { labels, values }
  }, [dailies])

  const moodOption = useMemo(
    () => ({
      ...base,
      grid: { left: 6, right: 12, top: 24, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: moodTrend.labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: pal.grid } },
        axisTick: { show: false },
        axisLabel: { color: pal.label, fontSize: 11 },
      },
      yAxis: {
        type: 'value' as const,
        min: 0,
        max: 5,
        interval: 1,
        splitLine: { lineStyle: { color: pal.grid } },
        axisLabel: { color: pal.label, fontSize: 11 },
      },
      series: [
        {
          type: 'line' as const,
          smooth: true,
          data: moodTrend.values,
          connectNulls: false,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { color: pal.warn, width: 2 },
          itemStyle: { color: pal.warn },
        },
      ],
    }),
    [moodTrend, base, pal],
  )

  // 任务完成热力图数据(近 26 周)
  const taskHeat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tasks) {
      if (t.completedAt) {
        const key = isoToLocalDateStr(t.completedAt)
        map.set(key, (map.get(key) ?? 0) + 1)
      }
    }
    return map
  }, [tasks])

  if (!tasksLoaded || !notesLoaded || !habitsLoaded || !dailyLoaded) {
    return (
      <div className="flex items-center justify-center gap-3 py-32 text-txt-secondary">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  const cards = [
    { label: '全部任务', value: summary.total },
    { label: '进行中', value: summary.doing },
    { label: '已完成', value: summary.done },
    { label: '完成率', value: `${summary.total ? Math.round((summary.done / summary.total) * 100) : 0}%` },
    { label: '便签数', value: notes.length },
    { label: '习惯数', value: habits.length },
  ]

  // 任务完成热力图数据(近 26 周)
  // (hook 已在组件顶部声明,见 taskHeat / habitHeat)

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="glass-card-hover p-4 text-center">
            <p className="text-xs text-txt-muted">{c.label}</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{c.value}</p>
          </Card>
        ))}
      </section>

      <WeeklyReviewCard />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold tracking-wide text-txt-secondary">任务完成热力图(近半年)</p>
            <HeatmapLegend />
          </div>
          <div className="overflow-x-auto pb-1">
            <Heatmap counts={taskHeat} weeks={26} />
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold tracking-wide text-txt-secondary">习惯打卡热力图(近半年)</p>
            <HeatmapLegend />
          </div>
          <div className="overflow-x-auto pb-1">
            <Heatmap counts={habitHeat} weeks={26} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <p className="mb-2 text-sm font-semibold tracking-wide text-txt-secondary">近 14 天任务动态</p>
          <Chart option={trendOption} className="h-72 w-full" />
        </Card>
        <Card className="lg:col-span-2">
          <p className="mb-2 text-sm font-semibold tracking-wide text-txt-secondary">近 14 天心情曲线(每日复盘)</p>
          <Chart option={moodOption} className="h-56 w-full" />
        </Card>
        <Card>
          <p className="mb-2 text-sm font-semibold tracking-wide text-txt-secondary">任务状态分布</p>
          <Chart option={statusOption} className="h-64 w-full" />
        </Card>
        <Card>
          <p className="mb-2 text-sm font-semibold tracking-wide text-txt-secondary">未完成任务优先级分布</p>
          <Chart option={priorityOption} className="h-64 w-full" />
        </Card>
      </section>

      <div className="flex justify-center">
        <Button variant="primary" className="h-11 px-6" onClick={() => setWrappedOpen(true)}>
          <Trophy size={16} />
          生成我的报告(Wrapped)
        </Button>
      </div>

      <BackupSection />
      <WrappedModal open={wrappedOpen} onClose={() => setWrappedOpen(false)} />
    </div>
  )
}
