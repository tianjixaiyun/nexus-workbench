import { useEffect, useMemo, useState } from 'react'
import { FileDown, FileUp, Loader2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chart, chartPalette, darkChartBase } from '@/components/ui/Chart'
import { isoToLocalDateStr, toDateStr } from '@/lib/utils'
import { exportData } from '@/lib/backup'
import { dataAdapter } from '@/lib/data'
import { notesToMarkdown, tasksToCsv } from '@/lib/portableExport'
import { todayStr } from '@/lib/utils'
import { requestBackupImport } from '@/lib/backupImport'
import { useHabitStore } from '@/stores/habitStore'
import { useAuthStore } from '@/stores/authStore'
import { useDailyStore } from '@/stores/dailyStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { activeNotes, useNoteStore } from '@/stores/noteStore'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { Heatmap, HeatmapLegend } from './Heatmap'
import { WeeklyReviewCard } from './WeeklyReview'
import { WrappedModal } from './WrappedModal'

/** 数据看板与命令面板使用同一份校验和恢复预览。 */
function BackupSection() {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [portableText, setPortableText] = useState('')
  const owner = useAuthStore(state => state.user?.id)
  useEffect(() => { setPortableText(''); setNotice('') }, [owner])
  const handleExport = async () => {
    if (busy) return
    setBusy(true)
    setNotice('')
    try { await exportData(); setNotice('已请求下载，请确认浏览器已保存 JSON 文件。') }
    catch (error) { setNotice(error instanceof Error ? error.message : '导出失败，请重试') }
    finally { setBusy(false) }
  }
  const exportPortable = async (kind: 'tasks' | 'notes') => {
    if (busy) return
    setBusy(true)
    setNotice('')
    setPortableText('')
    try {
      const data = kind === 'tasks' ? tasksToCsv(await dataAdapter.tasks.list()) : notesToMarkdown(await dataAdapter.notes.list())
      setPortableText(data)
      const url = URL.createObjectURL(new Blob([data], { type: kind === 'tasks' ? 'text/csv;charset=utf-8' : 'text/markdown;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `nexus-${kind}-${todayStr()}.${kind === 'tasks' ? 'csv' : 'md'}`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('已请求下载，请确认浏览器已保存文件；下载受阻时可复制内容。')
    } catch (error) { setNotice(error instanceof Error ? error.message : '导出失败，请检查连接后重试。') }
    finally { setBusy(false) }
  }
  const copyPortable = async () => {
    try { await navigator.clipboard.writeText(portableText); setNotice('内容已复制，可粘贴到文本文件保存。') }
    catch { setNotice('复制失败，请检查浏览器剪贴板权限后重试。') }
  }
  return <Card>
    <h2 className="mb-1 text-sm font-semibold tracking-wide text-txt-secondary">数据备份与恢复</h2>
    <p className="mb-3 text-xs leading-relaxed text-txt-muted">导出 11 类业务记录，以及本机专注历史、日志、个人档案、作品集文案、留言、成就和偏好。认证凭据、PIN、缓存、活动计时与未保存草稿不在备份内。</p>
    <p className="mb-4 text-xs leading-relaxed text-txt-muted">恢复前先校验并预览数量：本地替换所选集合，云端追加创建；本机补充数据可单独选择，默认不覆盖。</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" disabled={busy} onClick={() => void handleExport()}>{busy ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}{busy ? '正在导出…' : '导出备份'}</Button>
      <Button variant="outline" disabled={busy} onClick={requestBackupImport}><FileUp size={14} />恢复备份</Button>
    </div>
    <div className="mt-4 border-t border-line-2 pt-4"><p className="mb-2 text-xs leading-5 text-txt-secondary">导出未删除的任务或笔记，方便在其他软件查看；这些文件不替代完整 JSON 备份。</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void exportPortable('tasks')}><FileDown size={14} />任务 CSV</Button><Button variant="outline" disabled={busy} onClick={() => void exportPortable('notes')}><FileDown size={14} />笔记 Markdown</Button>{portableText && <Button variant="outline" disabled={busy} onClick={() => void copyPortable()}>复制导出内容</Button>}</div></div>
    {notice && <p role="status" className="mt-3 text-xs text-txt-secondary">{notice}</p>}
  </Card>
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
