import { useDailyStore } from '@/stores/dailyStore'
import { useGoalStore } from '@/stores/goalStore'
import { useHabitStore } from '@/stores/habitStore'
import { useLinkStore } from '@/stores/linkStore'
import { useMilestoneStore } from '@/stores/milestoneStore'
import { useNoteStore } from '@/stores/noteStore'
import { useTaskStore } from '@/stores/taskStore'

/** 一键示例数据:让新用户立刻看到完整的工作台长什么样 */

function dateAfter(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export async function seedSampleData(): Promise<string> {
  // 任务(覆盖三状态 / 优先级 / 标签 / 重复 / 子任务 / 截止)
  await useTaskStore.getState().add({ title: '给客户发季度方案', description: '附上报价单与排期', priority: 'high', dueDate: dateAfter(1), tags: ['工作'] })
  await useTaskStore.getState().add({ title: '写季度复盘', description: '汇总 OKR 数据', priority: 'medium', status: 'doing', tags: ['工作', '复盘'] })
  await useTaskStore.getState().add({
    title: '整理项目资料库',
    priority: 'low',
    tags: ['工作'],
    subtasks: [
      { id: crypto.randomUUID(), title: '归档旧文档', done: true },
      { id: crypto.randomUUID(), title: '统一命名规范', done: false },
    ],
  })
  await useTaskStore.getState().add({ title: '晚上 11 点前睡觉', priority: 'medium', dueDate: dateAfter(0), recurrence: 'daily', tags: ['生活'] })
  await useTaskStore.getState().add({ title: '每周 团队例会准备', priority: 'medium', recurrence: 'weekly', tags: ['工作'] })

  // 习惯(近 5 天打了 4 天)
  const h1 = await useHabitStore.getState().add({ name: '每天阅读 30 分钟', icon: '📚', color: 'emerald' })
  const h2 = await useHabitStore.getState().add({ name: '早上 7 点起床', icon: '☀️', color: 'amber' })
  const dates: string[] = []
  for (let i = 0; i < 5; i++) {
    if (i === 2) continue
    const d = new Date()
    d.setDate(d.getDate() - i)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push(`${d.getFullYear()}-${m}-${day}`)
  }
  // add 返回的是创建好的记录,直接带 id 更新
  await useHabitStore.getState().update(h1.id, { dates })
  await useHabitStore.getState().update(h2.id, { dates: dates.slice(0, 3) })

  // 笔记(含 Markdown)
  await useNoteStore.getState().add({
    title: 'Q4 业务重点',
    content: '**结论**:把客户续约率做到 90%\n\n- 建立到期前 30 天跟进节奏\n- 每月回访一次头部客户\n\n> 灵感来自上周的复盘会',
    color: 'violet',
    pinned: true,
  })
  await useNoteStore.getState().add({ title: 'Idea', content: '工作台可以加一个番茄钟模块,配合任务专注计时 🍅', color: 'cyan' })

  // 目标(自动统计:关联 #工作)
  await useGoalStore.getState().add({
    title: '完成 SaaS 上线',
    emoji: '🚀',
    color: 'cyan',
    tag: '工作',
    mode: 'auto',
    deadline: dateAfter(60),
  })

  // 倒数日 + 心情
  await useMilestoneStore.getState().add({ title: '产品发布会', date: dateAfter(30), emoji: '🚀' })
  await useDailyStore.getState().upsert(dateAfter(0), 4, '状态不错,推进顺利')

  // 链接
  await useLinkStore.getState().add({ name: 'GitHub', url: 'https://github.com', group: '工作' })
  await useLinkStore.getState().add({ name: '语雀文档', url: 'https://yuque.com', group: '工作' })
  await useLinkStore.getState().add({ name: '哔哩哔哩', url: 'https://bilibili.com', group: '常用' })

  // 全量刷新,保证与持久层一致
  await Promise.all([
    useTaskStore.getState().fetch(),
    useNoteStore.getState().fetch(),
    useHabitStore.getState().fetch(),
    useGoalStore.getState().fetch(),
    useMilestoneStore.getState().fetch(),
    useDailyStore.getState().fetch(),
    useLinkStore.getState().fetch(),
  ])
  return '示例数据已就位:5 个任务、2 个习惯、2 条笔记、1 个目标、3 个链接'
}
