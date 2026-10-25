import { useDailyStore } from '@/stores/dailyStore'
import { useGoalStore } from '@/stores/goalStore'
import { useHabitStore } from '@/stores/habitStore'
import { useLinkStore } from '@/stores/linkStore'
import { useWorkStore } from '@/stores/workStore'
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


/** 生成示例作品海报:渐变 + 网格 + 大字(离线可靠,无外链图片) */
function makePoster(title: string, en: string, from: string, to: string, accent: string): string {
  const w = 1200
  const h = 800
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, from)
  g.addColorStop(1, to)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // 细网格
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  for (let x = 0; x <= w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  for (let y = 0; y <= h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
  // 色块装饰
  ctx.fillStyle = accent
  ctx.globalAlpha = 0.85
  ctx.beginPath(); ctx.arc(w * 0.82, h * 0.24, 90, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.35
  ctx.beginPath(); ctx.arc(w * 0.16, h * 0.8, 130, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1
  // 文字
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = 'bold 84px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(title, 80, h / 2 - 10)
  ctx.font = '500 34px Georgia,serif'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText(en, 82, h / 2 + 56)
  ctx.font = '500 26px Georgia,serif'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText('NEXUS · PORTFOLIO', 80, h - 70)
  return c.toDataURL('image/jpeg', 0.85)
}

export async function seedWorks(): Promise<void> {
  const samples = [
    { title: '数字海洋 · 个人网站', en: 'DIGITAL OCEAN', category: '网页设计', year: '2026', from: '#0f2027', to: '#2c5364', accent: '#67e8f9', description: '滚动即下潜的个人网站:从海面阳光到 -40m 发光珊瑚海底,WebGL 实时渲染水体与光影,五幕滚动叙事。' },
    { title: '云鲸圣域 · 3D 展厅', en: 'WHALE SANCTUARY', category: '三维交互', year: '2026', from: '#141e30', to: '#243b55', accent: '#a78bfa', description: '封存在玻璃立方体中的微缩生态:云鲸星灵 8 字巡游、雪山发光河流、粒子光轨环绕,电影感滚动运镜。' },
    { title: 'NEXUS 工作台', en: 'PRODUCTIVITY OS', category: '产品设计', year: '2026', from: '#1a2a3a', to: '#3a2a4a', accent: '#f0a6d8', description: '一体化个人效率系统:任务看板、目标闭环、习惯打卡、专注番茄、数据看板,深色科技感设计语言。' },
  ]
  for (const s of samples) {
    await useWorkStore.getState().add({
      title: s.title,
      category: s.category,
      year: s.year,
      description: s.description,
      link: '',
      images: [makePoster(s.title, s.en, s.from, s.to, s.accent)],
    })
  }
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

  // 作品集
  await seedWorks()

  // 全量刷新,保证与持久层一致
  await Promise.all([
    useTaskStore.getState().fetch(),
    useNoteStore.getState().fetch(),
    useHabitStore.getState().fetch(),
    useGoalStore.getState().fetch(),
    useMilestoneStore.getState().fetch(),
    useDailyStore.getState().fetch(),
    useLinkStore.getState().fetch(),
    useWorkStore.getState().fetch(),
  ])
  return '示例数据已就位:5 个任务、2 个习惯、2 条笔记、1 个目标、3 个链接、3 件作品'
}
