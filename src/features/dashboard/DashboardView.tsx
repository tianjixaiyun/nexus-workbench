import { useEffect, useMemo, useState } from 'react'
import { CountUp, TiltCard } from '@/components/fx/micro'
import { Aurora } from '@/components/fx/bits'
import { Link, useNavigate } from 'react-router'
import {
  CalendarClock,
  Check,
  ChevronRight,
  CircleCheck,
  Flame,
  ListChecks,
  Loader2,
  StickyNote,
  Timer as TimerIcon,
  Wrench,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chart, chartPalette, darkChartBase } from '@/components/ui/Chart'
import { cn, formatDate, greeting, isoToLocalDateStr, toDateStr, todayStr } from '@/lib/utils'
import { todaySessions } from '@/lib/pomodoro'
import { useLinkStore } from '@/stores/linkStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useDailyStore, todayMood } from '@/stores/dailyStore'
import { streakOf, useHabitStore } from '@/stores/habitStore'
import { activeNotes, sortNotes, useNoteStore } from '@/stores/noteStore'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { HABIT_COLOR_META } from '@/features/habits/habitMeta'
import { MOODS } from '@/lib/data/types'
import { PRIORITY_META, PRIORITY_ORDER } from '@/features/tasks/taskMeta'
import { GoalsCard } from './GoalsCard'
import { MiniCalendar } from './MiniCalendar'
import { MilestonesCard } from './MilestonesCard'
import { WeatherCard } from './WeatherCard'

/** 首页大时钟:秒级跳动只重渲染自己 */
function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return <p className={className}>{now.toLocaleTimeString('zh-CN', { hour12: false })}</p>
}

/** 每日一句(本地词库,按日期轮换) */
const QUOTES = [
  '不积跬步,无以至千里。—— 荀子',
  '种一棵树最好的时间是十年前,其次是现在。',
  '把每一天当作生命中最好的日子。—— 查斯特菲尔德',
  '行动是治愈恐惧的良药。',
  '你如何过一天,就如何过一生。',
  '慢慢来,比较快。',
  '不要等意志力,要靠习惯。',
  '专注是这个时代最稀缺的能力。',
  '凡是过往,皆为序章。—— 莎士比亚',
  '真正的进步不在于走得多快,而在于方向对不对。',
  '自律者自由。',
  '今天不想跑,所以才去跑。—— 村上春树',
  '完成比完美更重要。',
  '把重要的事变成紧急的事之前,先把它变成日程上的事。',
  '与其临渊羡鱼,不如退而结网。',
  '凡是值得做的,就值得好好做。',
  '积土而为山,积水而为海。—— 荀子',
  '复杂是专注的敌人,简单是高效的朋友。',
  '永远不要把今天能做的事留到明天。—— 帕维尔',
  '每一个不曾起舞的日子,都是对生命的辜负。—— 尼采',
]

function quoteOfToday(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}

function StatCard({ icon: Icon, label, value, tint, progress }: {
  icon: typeof ListChecks
  label: string
  value: string | number
  tint: string
  progress?: number
}) {
  return (
    <TiltCard className="h-full rounded-2xl">
    <Card className="glass-card-hover h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-txt-muted">{label}</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tracking-tight tabular-nums">{typeof value === 'number' ? <CountUp value={value} /> : value}</p>
        </div>
        <div className={cn('rounded-xl p-2.5', tint)}>
          <Icon size={18} />
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3">
          <div className="neon-gradient-bg h-full rounded-full transition-all" style={{ width: `${Math.round(progress)}%` }} />
        </div>
      )}
    </Card>
    </TiltCard>
  )
}

export function DashboardView() {
  const allTasks = useTaskStore((s) => s.tasks)
  const { notes: allNotes, loaded: notesLoaded } = useNoteStore()
  const { links, loaded: linksLoaded } = useLinkStore()
  const { habits, loaded: habitsLoaded } = useHabitStore()
  const { dailies, loaded: dailyLoaded } = useDailyStore()
  const upsertMood = useDailyStore((s) => s.upsert)
  const toggleDone = useTaskStore((s) => s.toggleDone)
  const toggleToday = useHabitStore((s) => s.toggleToday)
  const navigate = useNavigate()

  const tasks = useMemo(() => activeTasks(allTasks), [allTasks])
  const notes = useMemo(() => activeNotes(allNotes), [allNotes])
  const today = todayStr()
  const quote = useMemo(quoteOfToday, [])

  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length
    const doing = tasks.filter((t) => t.status === 'doing').length
    const done = tasks.filter((t) => t.status === 'done').length
    const dueToday = tasks.filter((t) => t.status !== 'done' && t.dueDate === today).length
    const total = tasks.length
    return {
      todo,
      doing,
      done,
      dueToday,
      total,
      completionRate: total === 0 ? 0 : (done / total) * 100,
    }
  }, [tasks, today])

  const trend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return { key: toDateStr(d), label: `${d.getMonth() + 1}/${d.getDate()}` }
    })
    return {
      labels: days.map((d) => d.label),
      counts: days.map((d) => tasks.filter((t) => t.completedAt && isoToLocalDateStr(t.completedAt) === d.key).length),
    }
  }, [tasks])

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'done' && t.dueDate !== null && t.dueDate <= today)
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
        .slice(0, 6),
    [tasks, today],
  )

  const recentNotes = useMemo(() => sortNotes(notes).slice(0, 3), [notes])
  const quickLinks = links.slice(0, 8)
  const pomodoroToday = todaySessions()
  const loaded = notesLoaded && linksLoaded && habitsLoaded && dailyLoaded && useTaskStore.getState().loaded

  const light = useSettingsStore((s) => s.theme) === 'light'
  const pal = useMemo(() => chartPalette(light), [light])
  const base = useMemo(() => darkChartBase(light), [light])

  const trendOption = useMemo(
    () => ({
      ...base,
      grid: { left: 6, right: 12, top: 24, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: trend.labels,
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
          type: 'line' as const,
          smooth: true,
          data: trend.counts,
          symbol: 'circle',
          symbolSize: 6,
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
    [trend],
  )

  if (!loaded) {
    return (
      <div className="flex items-center justify-center gap-3 py-32 text-txt-secondary">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 问候 + 每日一句 + 时钟 */}
      <section className="relative flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-3xl border border-line-1 bg-surface-1/60 px-6 py-5">
        <Aurora opacity={0.35} />
        <div>
          <p className="text-sm text-txt-muted">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} 星期
            {'日一二三四五六'[new Date().getDay()]}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-wide">
            {greeting()}
            <span className="neon-gradient-text">,保持节奏</span>
          </h2>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-txt-muted">{quote}</p>
        </div>
        <LiveClock className="font-mono text-4xl font-bold tracking-tight tabular-nums neon-gradient-text" />
      </section>

      {/* 统计卡片 */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={ListChecks} label="待办任务" value={stats.todo + stats.doing} tint="bg-accent-soft text-accent" />
        <StatCard icon={CalendarClock} label="今日截止" value={stats.dueToday} tint="bg-amber-400/10 text-warn" />
        <StatCard
          icon={CircleCheck}
          label="已完成"
          value={stats.done}
          tint="bg-emerald-400/10 text-success"
          progress={stats.completionRate}
        />
        <StatCard icon={StickyNote} label="便签数量" value={notes.length} tint="bg-violet-400/10 text-accent-2" />
        <StatCard icon={TimerIcon} label="今日番茄" value={pomodoroToday} tint="bg-rose-400/10 text-danger" />
      </section>

      {/* 趋势图 + 今日任务 */}
      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <p className="mb-2 text-sm font-semibold tracking-wide text-txt-secondary">近 7 天完成趋势</p>
          <Chart option={trendOption} className="h-60 w-full" />
        </Card>
        <Card className="flex flex-col lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold tracking-wide text-txt-secondary">今日到期</p>
            <Link to="/tasks" className="flex items-center gap-0.5 text-xs text-accent hover:text-accent">
              全部任务
              <ChevronRight size={12} />
            </Link>
          </div>
          {todayTasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <CircleCheck size={22} className="text-success" />
              <p className="text-xs text-txt-muted">没有临期任务,节奏在自己手里</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2"
                  onClick={() => void toggleDone(task.id)}
                >
                  <span className="h-4 w-4 shrink-0 rounded-full border border-line-strong transition-colors group-hover:border-accent" />
                  <p className="min-w-0 flex-1 truncate text-sm">{task.title}</p>
                  <Badge tone={task.dueDate === today ? 'amber' : 'rose'}>
                    {task.dueDate === today ? '今天' : formatDate(task.dueDate)}
                  </Badge>
                  <Badge tone={PRIORITY_META[task.priority].tone}>{PRIORITY_META[task.priority].label}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* 目标进展 */}
      <GoalsCard />

      {/* 习惯打卡 + 天气 + 倒数日 */}
      <section className="grid gap-4 lg:grid-cols-6">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold tracking-wide text-txt-secondary">今日打卡</p>
            <Link to="/habits" className="flex items-center gap-0.5 text-xs text-accent hover:text-accent">
              全部习惯
              <ChevronRight size={12} />
            </Link>
          </div>
          {habits.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Flame size={22} className="text-txt-muted" />
              <p className="text-xs text-txt-muted">建立习惯,让坚持看得见</p>
              <Button size="sm" variant="outline" onClick={() => navigate('/habits')}>
                去创建
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {habits.slice(0, 5).map((habit) => {
                const done = habit.dates.includes(today)
                return (
                  <button
                    key={habit.id}
                    onClick={() => void toggleToday(habit.id)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors',
                      done ? 'bg-surface-2' : 'hover:bg-surface-2',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all',
                        done ? cn('border-transparent', HABIT_COLOR_META[habit.color].tint) : 'border-line-strong',
                      )}
                    >
                      {done && <Check size={13} className={HABIT_COLOR_META[habit.color].text} />}
                    </span>
                    <span className="text-base">{habit.icon}</span>
                    <p className={cn('min-w-0 flex-1 truncate text-sm', done && 'text-txt-muted')}>{habit.name}</p>
                    <span className="flex items-center gap-1 text-[11px] text-txt-muted">
                      <Flame size={11} className={streakOf(habit) > 0 ? 'text-warn' : undefined} />
                      {streakOf(habit)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-3 border-t border-line-1 pt-3">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[11px] text-txt-muted">今天的心情:</span>
              <div className="flex gap-1">
                {MOODS.map((m) => {
                  const active = todayMood(dailies)?.mood === m.value
                  return (
                    <button
                      key={m.value}
                      onClick={() => void upsertMood(today, m.value)}
                      title={m.label}
                      className={cn(
                        'h-7 w-7 cursor-pointer rounded-lg text-sm transition-all',
                        active ? 'bg-accent-soft ring-1 ring-accent' : 'opacity-45 hover:opacity-100',
                      )}
                    >
                      {m.emoji}
                    </button>
                  )
                })}
                {todayMood(dailies) && (
                  <span className="ml-auto self-center text-[11px] text-txt-muted">已记录 ✓</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <WeatherCard />

        <div className="lg:col-span-2">
          <MilestonesCard />
        </div>
      </section>

      {/* 快捷入口 + 最近便签 + 迷你日历 */}
      <section className="grid gap-4 lg:grid-cols-6">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold tracking-wide text-txt-secondary">快捷入口</p>
            <Link to="/links" className="flex items-center gap-0.5 text-xs text-accent hover:text-accent">
              工具箱
              <ChevronRight size={12} />
            </Link>
          </div>
          {quickLinks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Wrench size={22} className="text-txt-muted" />
              <p className="text-xs text-txt-muted">把常用网站收进工具箱,这里一键直达</p>
              <Button size="sm" variant="outline" onClick={() => navigate('/links')}>
                去添加
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card glass-card-hover flex items-center gap-2 px-3 py-2 text-xs"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-surface-3 text-[10px] font-bold">
                    {link.name.charAt(0).toUpperCase()}
                  </span>
                  {link.name}
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold tracking-wide text-txt-secondary">最近便签</p>
            <Link to="/notes" className="flex items-center gap-0.5 text-xs text-accent hover:text-accent">
              全部便签
              <ChevronRight size={12} />
            </Link>
          </div>
          {recentNotes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <StickyNote size={22} className="text-txt-muted" />
              <p className="text-xs text-txt-muted">随手记一条想法,它会出现在这里</p>
              <Button size="sm" variant="outline" onClick={() => navigate('/notes')}>
                去记一条
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => navigate('/notes')}
                  className="cursor-pointer rounded-xl border border-line-1 bg-surface-1 px-3.5 py-2.5 transition-colors hover:border-line-3"
                >
                  <p className="truncate text-sm font-medium">{note.title || '无标题'}</p>
                  {note.content && <p className="mt-0.5 truncate text-xs text-txt-muted">{note.content}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="lg:col-span-2">
          <MiniCalendar />
        </div>
      </section>
    </div>
  )
}
