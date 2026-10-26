import { activeNotes, useNoteStore } from '@/stores/noteStore'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { streakOf, useHabitStore } from '@/stores/habitStore'
import { useDailyStore } from '@/stores/dailyStore'
import { useLinkStore } from '@/stores/linkStore'
import { todayStr } from './utils'
import { recentSessions } from './pomodoro'
import type { Task } from './data/types'

/**
 * 本地智能助手:提示词模板引擎。
 *
 * 按 2026 提示词工程最佳实践实现(离线、透明、可解释):
 * - 模板 = 稳定骨架,槽位 = 变化的数据;变量命名清晰且尽量少
 * - 静态内容在前(角色/要求),变量在后
 * - 输出为结构化 Markdown
 * - 每条回答都暴露它使用的提示词,可解释、可审计
 */

export interface AssistantAnswer {
  intent: string
  /** 渲染后的完整提示词(模板 + 填入的数据槽) */
  prompt: string
  /** 结构化输出(Markdown) */
  answer: string
  /** 建议的后续动作 [文案, 路由] */
  actions: [string, string][]
}

interface Slot {
  name: string
  value: string
}

/** 模板渲染:{{槽位名}} → 值 */
export function render(template: string, slots: Slot[]): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => slots.find((s) => s.name === name)?.value ?? `{{${name}}}`)
}

function fmtTaskList(tasks: Task[], limit = 5): string {
  if (tasks.length === 0) return '(无)'
  return tasks
    .slice(0, limit)
    .map((t) => `- ${t.title}${t.dueDate ? `(截止 ${t.dueDate})` : ''}${t.priority === 'high' ? ' ⚡高优先级' : ''}`)
    .join('\n')
}function buildSnapshot() {
  const tasks = activeTasks(useTaskStore.getState().tasks)
  const notes = activeNotes(useNoteStore.getState().notes)
  const habits = useHabitStore.getState().habits
  const dailies = useDailyStore.getState().dailies
  const links = useLinkStore.getState().links
  const today = todayStr()

  const todo = tasks.filter((t) => t.status === 'todo')
  const doing = tasks.filter((t) => t.status === 'doing')
  const done = tasks.filter((t) => t.status === 'done')
  const dueToday = tasks.filter((t) => t.status !== 'done' && t.dueDate === today)
  const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today)
  const upcoming = tasks
    .filter((t) => t.status !== 'done' && t.dueDate && t.dueDate > today)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  // 本周一零点起算
  const monday = new Date()
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const weekDone = done.filter((t) => t.completedAt && new Date(t.completedAt) >= monday).length
  const weekSessions = recentSessions(7).reduce((s, d) => s + d.count, 0)
  const focusMinutes = recentSessions(7).reduce((sum, day) => sum + day.minutes, 0)
  const bestHabit = [...habits].sort((a, b) => streakOf(b) - streakOf(a))[0]
  const moodRecent = dailies.slice(-3)

  return { tasks, notes, habits, dailies, links, today, todo, doing, done, dueToday, overdue, upcoming, weekDone, weekSessions, focusMinutes, bestHabit, moodRecent }
}

type Snapshot = ReturnType<typeof buildSnapshot>
type SlotBuilder = (s: Snapshot & Record<string, unknown>) => Slot[]

interface Intent {
  key: string
  patterns: RegExp[]
  /** 提示词模板:静态骨架在前,{{槽位}} 在后 */
  template: string
  slots: SlotBuilder
  actions: [string, string][]
}

const INTENTS: Intent[] = [
  {
    key: 'overview',
    patterns: [/总结|概览|现状|怎么样|进度|報告|报告/],
    template: `# 角色
你是用户的个人效率助手,基于下面的工作台实时数据做简报。

# 数据(结构化槽位)
今日待办:{{todo}}
进行中:{{doing}}
今日截止:{{due}}
逾期:{{overdue}}
本周已完成:{{weekDone}}
近 7 天专注:{{focus}} 分钟

# 要求
用不超过 3 句话总结现状,最后给一条具体、可执行的建议。语气轻松,不要客套。`,
    slots: (s) => [
      { name: 'todo', value: String(s.todo.length) },
      { name: 'doing', value: String(s.doing.length) },
      { name: 'due', value: String(s.dueToday.length) },
      { name: 'overdue', value: String(s.overdue.length) },
      { name: 'weekDone', value: String(s.weekDone) },
      { name: 'focus', value: String(s.focusMinutes) },
    ],
    actions: [['查看任务', '/tasks'], ['看数据看板', '/stats']],
  },
  {
    key: 'deadline',
    patterns: [/截止|到期|deadline|最近要做什么|接下来|日程/],
    template: `# 角色
你是用户的日程助手,列出最近的时间压力。

# 数据
今日到期:{{dueToday}}
逾期未完成:{{overdue}}
未来几天:{{upcoming}}

# 要求
按紧急程度用列表输出,逾期项标 ⚠️;若全部清空则明确说"没有时间压力"。`,
    slots: (s) => [
      { name: 'dueToday', value: fmtTaskList(s.dueToday) },
      { name: 'overdue', value: fmtTaskList(s.overdue) },
      { name: 'upcoming', value: fmtTaskList(s.upcoming) },
    ],
    actions: [['打开日历', '/tasks']],
  },
  {
    key: 'habits',
    patterns: [/习惯|连击|打卡|坚持/],
    template: `# 角色
你是习惯养成教练,基于打卡数据鼓励用户。

# 数据
习惯数量:{{count}}
连击排行:{{ranks}}
今日已打卡:{{doneToday}}

# 要求
先报最强连击,再点一个还没打卡的习惯(如有),给一句具体行动指令。`,
    slots: (s) => [
      { name: 'count', value: String(s.habits.length) },
      {
        name: 'ranks',
        value:
          [...s.habits]
            .sort((a, b) => streakOf(b) - streakOf(a))
            .slice(0, 3)
            .map((h) => `${h.icon} ${h.name}(${streakOf(h)} 天)`)
            .join('、') || '(暂无习惯)',
      },
      {
        name: 'doneToday',
        value:
          s.habits.filter((h) => h.dates.includes(todayStr())).map((h) => h.name).join('、') || '(还没打)',
      },
    ],
    actions: [['去打卡', '/habits']],
  },
  {
    key: 'focus',
    patterns: [/专注|番茄|时长|效率/],
    template: `# 角色
你是深度工作教练,基于番茄钟数据分析专注状况。

# 数据
近 7 天番茄数:{{sessions}}
累计专注时长:{{minutes}} 分钟

# 要求
指出专注量处于什么水平(<5 个偏少,5-15 个良好,>15 个优秀),给一条提升建议。`,
    slots: (s) => [
      { name: 'sessions', value: String(s.weekSessions) },
      { name: 'minutes', value: String(s.focusMinutes) },
    ],
    actions: [['开始专注', '/focus']],
  },
  {
    key: 'mood',
    patterns: [/心情|情绪|感觉|状态如何/],
    template: `# 角色
你是温和的复盘伙伴,基于心情记录给出观察。

# 数据
最近记录:{{recent}}
记录天数:{{days}}

# 要求
一两句话描述趋势;若记录太少,温和地建议开始每天打卡。`,
    slots: (s) => [
      {
        name: 'recent',
        value:
          s.moodRecent.map((d) => `${d.date}:${'★'.repeat(d.mood)}`).join(' / ') || '(还没有记录)',
      },
      { name: 'days', value: String(s.moodRecent.length) },
    ],
    actions: [['记今天的心情', '/home']],
  },
  {
    key: 'find',
    patterns: [/找|搜索|查一?下|哪些/],
    template: `# 角色
你是检索助手,在用户的工作台里查找内容。

# 查询词
{{keyword}}

# 任务
在任务和笔记的标题/描述/标签里检索,以列表输出最相关的条目(任务标 [任务],便签标 [便签]);找不到就说没有。`,
    slots: (s) => [
      {
        name: 'keyword',
        value: String(s.keyword ?? '(未提供)'),
      },
      {
        name: 'results',
        value: String(s.results || '(没有匹配的条目)'),
      },
    ],
    actions: [['全部任务', '/tasks'], ['全部笔记', '/notes']],
  },
  {
    key: 'help',
    patterns: [/帮助|你能做什么|怎么用|功能/],
    template: `# 角色
向用户介绍你能回答的问题类型。

# 能力清单
{{abilities}}

# 要求
以简短列表输出,鼓励用户直接提问。`,
    slots: () => [
      {
        name: 'abilities',
        value:
          '- 现状总结(问"总结一下")\n- 截止与逾期(问"最近截止")\n- 习惯连击分析\n- 专注统计\n- 心情趋势\n- 找回任务/便签(问"找 XX")',
      },
    ],
    actions: [],
  },
]

/** 回答用户关于自己数据的提问;返回答案 + 使用的提示词(透明可查) */
export function askAssistant(query: string): AssistantAnswer {
  const s = buildSnapshot()
  const intent = INTENTS.find((i) => i.patterns.some((p) => p.test(query))) ?? INTENTS[0]

  let slots: Slot[]
  if (intent.key === 'find') {
    const keyword = query.replace(/^.*?(找|搜索|查一下|查)(?:找|一?下)?/, '').trim()
    const kw = keyword.toLowerCase()
    const hitTasks = s.tasks.filter((t) => `${t.title} ${t.description} ${t.tags.join(' ')}`.toLowerCase().includes(kw))
    const hitNotes = activeNotes(useNoteStore.getState().notes).filter((n) =>
      `${n.title} ${n.content}`.toLowerCase().includes(kw),
    )
    const results =
      [
        ...hitTasks.map((t) => `- [任务] ${t.title}${t.dueDate ? `(截止 ${t.dueDate})` : ''}`),
        ...hitNotes.map((n) => `- [便签] ${n.title || n.content.slice(0, 20)}`),
      ].join('\n') || '(没有匹配的条目)'
    slots = intent.slots({ ...s, keyword, results })
  } else {
    slots = intent.slots(s)
  }

  const prompt = render(intent.template, slots)

  // 结构化输出:模板即规范,渲染结果直接作为回答
  const answerSection = prompt.split('# 要求')[1] ?? prompt
  const answer = `**基于你工作台的实时数据:**\n\n${answerSection.replace(/^#\s*要求\n?/, '').trim()}`

  return { intent: intent.key, prompt, answer, actions: intent.actions }
}

/** 供面板展示的快问清单 */
export const QUICK_QUESTIONS = [
  '总结一下我的现状',
  '最近有什么要截止的?',
  '我的习惯坚持得怎么样?',
  '这周专注得够吗?',
  '最近心情如何?',
]
