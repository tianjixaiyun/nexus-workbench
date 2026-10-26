import { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoStore } from '@/stores/memoStore'
import { useWorkStore } from '@/stores/workStore'
import { useExpenseStore } from '@/stores/expenseStore'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import {
  BarChart3,
  Bot,
  Calculator,
  Waves,
  CornerDownLeft,
  FileDown,
  FileUp,
  LayoutDashboard,
  ListChecks,
  Plus,
  Search,
  StickyNote,
  Timer,
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportData, importData } from '@/lib/backup'
import { requestAction } from '@/lib/uiBus'
import { toast } from '@/stores/toastStore'
import { activeNotes, useNoteStore } from '@/stores/noteStore'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { useLinkStore } from '@/stores/linkStore'

interface PaletteItem {
  key: string
  group: '页面' | '操作' | '任务' | '笔记' | '链接' | '数据' | '计算'
  label: string
  hint?: string
  keywords: string
  icon: React.ReactNode
  run: () => void | Promise<void>
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [notice, setNotice] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tasks = useTaskStore((s) => s.tasks)
  const notes = useNoteStore((s) => s.notes)
  const links = useLinkStore((s) => s.links)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setNotice('')
    }
  }, [open])

  const items = useMemo<PaletteItem[]>(() => {
    const pages: PaletteItem[] = [
      { key: 'p-/', group: '页面', label: '工作台', keywords: 'home dashboard 主页 仪表盘', icon: <LayoutDashboard size={15} />, run: () => { navigate('/home'); onClose() } },
      { key: 'p-awards', group: '页面', label: '成就收藏册', keywords: 'achievement badge 成就 徽章 图鉴', icon: <BarChart3 size={15} />, run: () => { navigate('/achievements'); onClose() } },
      { key: 'p-about', group: '页面', label: '海员证 · 关于我', keywords: 'about profile 关于我 个人档案 自我介绍', icon: <StickyNote size={15} />, run: () => { navigate('/about'); onClose() } },
      { key: 'p-memos', group: '页面', label: '碎碎念', keywords: 'memo 速记 灵感 时间线 flomo', icon: <StickyNote size={15} />, run: () => { navigate('/memos'); onClose() } },
      { key: 'p-expense', group: '页面', label: '记账', keywords: 'expense money 记账 收支 账单', icon: <BarChart3 size={15} />, run: () => { navigate('/expense'); onClose() } },
      { key: 'a-pin', group: '操作', label: '隐私锁 · 开启/关闭', keywords: 'pin lock 隐私 锁屏 密码', icon: <Bot size={15} />, run: () => { window.dispatchEvent(new CustomEvent('nexus:pin-setup')); onClose() } },
      { key: 'p-scrapbook', group: '页面', label: '手帐 · 海面之上', keywords: 'scrapbook 手帐 剪贴簿 留言 彩蛋', icon: <StickyNote size={15} />, run: () => { navigate('/scrapbook'); onClose() } },
      { key: 'p-portfolio', group: '页面', label: '作品集', keywords: 'portfolio works 作品 作品集 画册', icon: <Waves size={15} />, run: () => { navigate('/portfolio'); onClose() } },
      { key: 'p-ocean', group: '页面', label: '个人主页 · 数字海洋', keywords: 'ocean landing 首页 下潜 个人网站', icon: <Waves size={15} />, run: () => { navigate('/'); onClose() } },
      { key: 'p-tasks', group: '页面', label: '任务中心', keywords: 'task todo 任务 待办 看板', icon: <ListChecks size={15} />, run: () => { navigate('/tasks'); onClose() } },
      { key: 'p-habits', group: '页面', label: '习惯打卡', keywords: 'habit 习惯 打卡 签到', icon: <Zap size={15} />, run: () => { navigate('/habits'); onClose() } },
      { key: 'p-focus', group: '页面', label: '专注番茄钟', keywords: 'pomodoro focus 番茄 专注 计时', icon: <Timer size={15} />, run: () => { navigate('/focus'); onClose() } },
      { key: 'p-notes', group: '页面', label: '笔记便签', keywords: 'note memo 笔记 便签', icon: <StickyNote size={15} />, run: () => { navigate('/notes'); onClose() } },
      { key: 'p-stats', group: '页面', label: '数据看板', keywords: 'stats chart 统计 数据 图表', icon: <BarChart3 size={15} />, run: () => { navigate('/stats'); onClose() } },
      { key: 'p-links', group: '页面', label: '工具箱', keywords: 'link bookmark 工具 链接 网址', icon: <Wrench size={15} />, run: () => { navigate('/links'); onClose() } },
      { key: 'p-trash', group: '页面', label: '回收站', keywords: 'trash recycle 回收站 删除', icon: <Trash2 size={15} />, run: () => { navigate('/trash'); onClose() } },
      { key: 'p-sanctuary', group: '页面', label: '云鲸圣域', keywords: 'sanctuary whale 3d 云鲸 圣域 梦境 场景', icon: <Waves size={15} />, run: () => { navigate('/sanctuary'); onClose() } },
    ]
    const actions: PaletteItem[] = [
      { key: 'a-task', group: '操作', label: '新建任务', keywords: 'new add create 新建 添加 任务', icon: <Plus size={15} />, run: () => { requestAction('new-task'); navigate('/tasks'); onClose() } },
      { key: 'a-note', group: '操作', label: '新建便签', keywords: 'new add create 新建 添加 便签 笔记', icon: <Plus size={15} />, run: () => { requestAction('new-note'); navigate('/notes'); onClose() } },
      { key: 'a-assistant', group: '操作', label: '问问助手(基于你的数据)', keywords: 'ai assistant 助手 问问 智能 帮我分析', icon: <Bot size={15} />, run: () => { onClose(); window.dispatchEvent(new CustomEvent('nexus:assistant')) } },
      { key: 'a-export', group: '操作', label: '导出数据备份 (JSON)', keywords: 'export backup 导出 备份 下载', icon: <FileDown size={15} />, run: async () => { await exportData(); } },
      { key: 'a-import', group: '操作', label: '导入数据备份', keywords: 'import restore 导入 恢复', icon: <FileUp size={15} />, run: () => { fileInputRef.current?.click() } },
    ]
    const taskItems: PaletteItem[] = activeTasks(tasks).map((t) => ({
      key: `t-${t.id}`,
      group: '任务',
      label: t.title,
      hint: t.status === 'done' ? '已完成' : t.status === 'doing' ? '进行中' : '待办',
      keywords: `${t.description} ${t.tags.join(' ')}`.toLowerCase(),
      icon: <ListChecks size={15} />,
      run: () => { navigate('/tasks'); onClose() },
    }))
    const noteItems: PaletteItem[] = activeNotes(notes).map((n) => ({
      key: `n-${n.id}`,
      group: '笔记',
      label: n.title || '无标题',
      hint: n.content.slice(0, 24),
      keywords: n.content.toLowerCase(),
      icon: <StickyNote size={15} />,
      run: () => { navigate('/notes'); onClose() },
    }))
    const linkItems: PaletteItem[] = links.map((l) => ({
      key: `l-${l.id}`,
      group: '链接',
      label: l.name,
      hint: l.group,
      keywords: `${l.url} ${l.group}`.toLowerCase(),
      icon: <Wrench size={15} />,
      run: () => { window.open(l.url, '_blank', 'noopener noreferrer'); onClose() },
    }))
    return [...pages, ...actions, ...taskItems, ...noteItems, ...linkItems]
  }, [tasks, notes, links, navigate, onClose])

  const results = useMemo(() => {
    const kw = query.trim().toLowerCase()
    // 外部搜索 bangs(Dashy 风格):`g 关键词` `bd 关键词` `gh 关键词` `b 关键词`
    const bangMatch = kw.match(/^(g|bd|gh|b)\s+(.+)/)
    const bangs: PaletteItem[] = bangMatch
      ? [
          { prefix: 'g', name: 'Google', url: `https://www.google.com/search?q=${encodeURIComponent(bangMatch[2])}` },
          { prefix: 'bd', name: '百度', url: `https://www.baidu.com/s?wd=${encodeURIComponent(bangMatch[2])}` },
          { prefix: 'gh', name: 'GitHub', url: `https://github.com/search?q=${encodeURIComponent(bangMatch[2])}` },
          { prefix: 'b', name: 'B站', url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(bangMatch[2])}` },
        ]
          .filter((b) => b.prefix === bangMatch[1])
          .map((b) => ({
            key: `bang-${b.prefix}`,
            group: '操作' as const,
            label: `在 ${b.name} 搜索「${bangMatch[2]}」`,
            keywords: '',
            icon: <Search size={15} />,
            run: () => {
              window.open(b.url, '_blank', 'noopener noreferrer')
              onClose()
            },
          }))
      : []
    // Raycast 式内联计算器:纯算术表达式直接给出结果,回车复制
    const calcItem: PaletteItem | null = (() => {
      const q = query.trim()
      if (!/^[-+*/%().\d\s]+$/.test(q) || !/\d/.test(q) || !/[-+*/%]/.test(q)) return null
      try {
        const val = Function(`"use strict"; return (${q})`)()
        if (typeof val !== 'number' || !Number.isFinite(val)) return null
        const value = String(Math.round(val * 1e10) / 1e10)
        return {
          key: 'calc',
          group: '计算' as const,
          label: `${q} = ${value}`,
          keywords: '计算 calculator math',
          icon: <Calculator size={15} />,
          hint: '回车复制结果',
          run: () => {
            void navigator.clipboard?.writeText(value).catch(() => {})
            toast.success('结果已复制', `${q} = ${value}`)
            onClose()
          },
        } as unknown as PaletteItem
      } catch {
        return null
      }
    })()
    if (!kw) return calcItem ? [calcItem, ...items] : items
    // 全文数据搜索(AFFiNE 式):任务/笔记/碎碎念/作品/记账 备注
    if (kw.length >= 1) {
      const data: PaletteItem[] = []
      const push = (max: number, arr: { label: string; keywords: string; icon: React.ReactNode; run: () => void }[]) => {
        for (const it of arr) { if (data.length < 8 && `${it.label} ${it.keywords}`.toLowerCase().includes(kw)) data.push({ ...it, group: '数据' } as PaletteItem) }
        void max
      }
      push(4, useTaskStore.getState().tasks.filter((t) => !t.deletedAt).map((t) => ({
        label: t.title,
        keywords: `任务 ${t.status} ${(t.tags ?? []).join(' ')} ${t.description ?? ''}`,
        icon: <ListChecks size={15} />,
        run: () => { navigate('/tasks'); onClose() },
      })))
      push(3, useNoteStore.getState().notes.map((n) => ({
        label: n.title,
        keywords: `笔记 ${n.content.slice(0, 60)}`,
        icon: <StickyNote size={15} />,
        run: () => { navigate('/notes'); onClose() },
      })))
      push(3, useMemoStore.getState().memos.map((m) => ({
        label: m.content.slice(0, 24),
        keywords: `碎碎念 ${m.content} ${m.tags.join(' ')}`,
        icon: <StickyNote size={15} />,
        run: () => { navigate('/memos'); onClose() },
      })))
      push(2, useWorkStore.getState().works.map((w) => ({
        label: w.title,
        keywords: `作品 ${w.category} ${w.year} ${w.description}`,
        icon: <Wrench size={15} />,
        run: () => { navigate('/portfolio'); onClose() },
      })))
      push(2, useExpenseStore.getState().expenses.map((e) => ({
        label: `${e.kind === 'expense' ? '支出' : '收入'} ¥${e.amount} ${e.category}`,
        keywords: `记账 ${e.note} ${e.category}`,
        icon: <BarChart3 size={15} />,
        run: () => { navigate('/expense'); onClose() },
      })))
      return [...(calcItem ? [calcItem] : []), ...data, ...bangs, ...items.filter((i) => `${i.label} ${i.keywords}`.toLowerCase().includes(kw))]
    }
    return [...(calcItem ? [calcItem] : []), ...bangs, ...items.filter((i) => `${i.label} ${i.keywords}`.toLowerCase().includes(kw))]
  }, [items, query, onClose])

  // 关键词变化时重置选中项
  useEffect(() => setActiveIndex(0), [query])

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  const runItem = async (item: PaletteItem) => {
    try {
      await item.run()
      if (item.key === 'a-export') onClose()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '操作失败')
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[activeIndex]
      if (item) void runItem(item)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handleImportFile = async (file: File) => {
    try {
      await importData(file)
      setNotice(`导入完成,页面将刷新…`)
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '导入失败')
    }
  }

  // 分组渲染(动态:全文搜索的「数据」与计算器的「计算」按需出现)
  const base: PaletteItem['group'][] = ['页面', '操作', '任务', '笔记', '链接']
  const groups: PaletteItem['group'][] = [
    ...(results.some((r) => r.group === '计算') ? ['计算' as const] : []),
    ...base,
    ...(results.some((r) => r.group === '数据') ? ['数据' as const] : []),
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="glass-card w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line-2 px-4 py-3">
          <Search size={17} className="shrink-0 text-txt-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="搜索任务、笔记、链接,或输入操作…"
            className="w-full bg-transparent text-sm text-txt-primary outline-none placeholder:text-txt-muted"
          />
          <kbd className="rounded-md border border-line-3 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-txt-muted">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="py-10 text-center text-sm text-txt-muted">没有匹配的结果</p>
          )}
          {groups.map((group) => {
            const groupItems = results
              .map((item, idx) => ({ item, idx }))
              .filter(({ item }) => item.group === group)
            if (groupItems.length === 0) return null
            return (
              <div key={group} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[11px] tracking-wider text-txt-muted">{group}</p>
                {groupItems.map(({ item, idx }) => (
                  <button
                    key={item.key}
                    data-idx={idx}
                    onClick={() => void runItem(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                      idx === activeIndex ? 'bg-accent-soft text-txt-primary' : 'text-txt-secondary',
                    )}
                  >
                    <span className={cn('shrink-0', idx === activeIndex ? 'text-accent' : 'text-txt-muted')}>
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                    {item.hint && <span className="max-w-40 shrink-0 truncate text-xs text-txt-muted">{item.hint}</span>}
                    {idx === activeIndex && <CornerDownLeft size={13} className="shrink-0 text-txt-muted" />}
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        {notice && (
          <p className="border-t border-line-2 px-4 py-2.5 text-xs text-accent">{notice}</p>
        )}
        <div className="flex items-center justify-between border-t border-line-2 px-4 py-2 text-[11px] text-txt-muted">
          <span>↑↓ 选择 · Enter 确认</span>
          <span>NEXUS 命令面板</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleImportFile(file)
          e.target.value = ''
        }}
      />
    </div>,
    document.body,
  )
}
