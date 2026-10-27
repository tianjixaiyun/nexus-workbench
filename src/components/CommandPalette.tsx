import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import {
  BarChart3, Bot, Calculator, CornerDownLeft, FileDown, FileUp, ListChecks, Plus,
  Search, StickyNote, Wrench, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_MODULES, COMMAND_GROUPS, commandItemsInDisplayOrder, commandSelectionIndex } from '@/lib/modules'
import { exportData } from '@/lib/backup'
import { requestBackupImport } from '@/lib/backupImport'
import { noteContextHref, taskContextHref } from '@/lib/contextLinks'
import { useSettingsStore } from '@/stores/settingsStore'
import { requestAction } from '@/lib/uiBus'
import { useNativeDialog } from '@/components/ui/Modal'
import { toast } from '@/stores/toastStore'
import { activeNotes, useNoteStore } from '@/stores/noteStore'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { useLinkStore } from '@/stores/linkStore'
import { useMemoStore } from '@/stores/memoStore'
import { useWorkStore } from '@/stores/workStore'
import { useExpenseStore } from '@/stores/expenseStore'

interface PaletteItem {
  key: string
  group: typeof COMMAND_GROUPS[number]
  label: string
  hint?: string
  keywords: string
  icon: React.ReactNode
  run: () => void | Promise<void>
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState({ query: '', index: 0 })
  const [notice, setNotice] = useState('')
  const dialogRef = useNativeDialog(open)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const calmMode = useSettingsStore(state => state.calmMode)
  const listId = useId()
  const titleId = useId()
  const tasks = useTaskStore((s) => s.tasks)
  const notes = useNoteStore((s) => s.notes)
  const links = useLinkStore((s) => s.links)
  const memos = useMemoStore((s) => s.memos)
  const works = useWorkStore((s) => s.works)
  const expenses = useExpenseStore((s) => s.expenses)

  useLayoutEffect(() => {
    if (!open) return
    setQuery('')
    setSelection({ query: '', index: 0 })
    setNotice('')
    inputRef.current?.focus()
  }, [open])

  const items = useMemo<PaletteItem[]>(() => {
    const go = (to: string) => { navigate(to); onClose() }
    const pages: PaletteItem[] = APP_MODULES.map(({ to, label, keywords, icon: Icon, shortcut }) => ({
      key: `page:${to}`, group: '页面', label, keywords,
      hint: shortcut ? `快捷键 ${shortcut}` : undefined,
      icon: <Icon size={15} />, run: () => go(to),
    }))
    const actions: PaletteItem[] = [
      { key: 'action:task', group: '操作', label: '新建任务', keywords: 'new add create 新建 添加 任务', icon: <Plus size={15} />, run: () => { requestAction('new-task'); go('/tasks') } },
      { key: 'action:batch-task', group: '操作', label: '批量添加任务', keywords: 'batch bulk paste import 批量 添加 粘贴 清单', icon: <ListChecks size={15} />, run: () => { onClose(); window.dispatchEvent(new CustomEvent('nexus:capture', { detail: 'batch' })) } },
      { key: 'action:note', group: '操作', label: '新建便签', keywords: 'new add create 新建 添加 便签 笔记', icon: <Plus size={15} />, run: () => { requestAction('new-note'); go('/notes') } },
      { key: 'action:assistant', group: '操作', label: '问问助手（基于你的数据）', keywords: 'ai assistant 助手 问问 智能 帮我分析', icon: <Bot size={15} />, run: () => { onClose(); window.dispatchEvent(new CustomEvent('nexus:assistant')) } },
      { key: 'action:pin', group: '操作', label: '隐私锁 · 开启/关闭', keywords: 'pin lock 隐私 锁屏 密码', icon: <Bot size={15} />, run: () => { onClose(); window.dispatchEvent(new CustomEvent('nexus:pin-setup')) } },
      { key: 'action:export', group: '操作', label: '导出数据备份（JSON）', keywords: 'export backup 导出 备份 下载', icon: <FileDown size={15} />, run: async () => { await exportData(); onClose() } },
      { key: 'action:import', group: '操作', label: '导入数据备份', keywords: 'import restore 导入 恢复', icon: <FileUp size={15} />, run: () => { onClose(); requestBackupImport() } },
    ]
    actions.push({ key: 'action:calm', group: '操作', label: '切换低干扰模式', hint: calmMode ? '当前开启' : '当前关闭', keywords: 'calm motion focus 低干扰 外观 动效 安静', icon: <Bot size={15} />, run: () => {
      if (!useSettingsStore.getState().setCalmMode(!calmMode)) toast.error('外观偏好未能保存', '当前页面已切换，刷新后可能恢复。')
      onClose()
    } })
    return [
      ...pages, ...actions,
      ...activeTasks(tasks).map((task): PaletteItem => ({
        key: `task:${task.id}`, group: '任务', label: task.title,
        hint: task.status === 'done' ? '已完成' : task.status === 'doing' ? '进行中' : '待办',
        keywords: `${task.description} ${task.tags.join(' ')}`, icon: <ListChecks size={15} />, run: () => go(taskContextHref(task.id)),
      })),
      ...activeNotes(notes).map((note): PaletteItem => ({
        key: `note:${note.id}`, group: '笔记', label: note.title || '无标题', hint: note.content.slice(0, 24),
        keywords: note.content, icon: <StickyNote size={15} />, run: () => go(noteContextHref(note.id)),
      })),
      ...links.map((link): PaletteItem => ({
        key: `link:${link.id}`, group: '链接', label: link.name, hint: link.group,
        keywords: `${link.url} ${link.group}`, icon: <Wrench size={15} />,
        run: () => { window.open(link.url, '_blank', 'noopener,noreferrer'); onClose() },
      })),
      ...memos.map((memo): PaletteItem => ({
        key: `memo:${memo.id}`, group: '碎碎念', label: memo.content.slice(0, 40),
        keywords: `${memo.content} ${memo.tags.join(' ')}`, icon: <StickyNote size={15} />, run: () => go('/memos'),
      })),
      ...works.map((work): PaletteItem => ({
        key: `work:${work.id}`, group: '作品', label: work.title,
        keywords: `${work.category} ${work.year} ${work.description}`, icon: <Wrench size={15} />, run: () => go('/portfolio'),
      })),
      ...expenses.map((expense): PaletteItem => ({
        key: `expense:${expense.id}`, group: '记账',
        label: `${expense.kind === 'expense' ? '支出' : '收入'} ¥${expense.amount} ${expense.category}`,
        keywords: `${expense.note} ${expense.category}`, icon: <BarChart3 size={15} />, run: () => go('/expense'),
      })),
    ]
  }, [tasks, notes, links, memos, works, expenses, calmMode, navigate, onClose])

  const results = useMemo(() => {
    const raw = query.trim()
    const kw = raw.toLowerCase()
    const extras: PaletteItem[] = []
    const bang = raw.match(/^(g|bd|gh|b)\s+(.+)/i)
    if (bang) {
      const engines = {
        g: { name: 'Google', url: 'https://www.google.com/search?q=' },
        bd: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
        gh: { name: 'GitHub', url: 'https://github.com/search?q=' },
        b: { name: 'B站', url: 'https://search.bilibili.com/all?keyword=' },
      }
      const prefix = bang[1].toLowerCase() as keyof typeof engines
      const engine = engines[prefix]
      extras.push({
        key: `search:${prefix}`, group: '操作', label: `在 ${engine.name} 搜索「${bang[2]}」`, keywords: '',
        icon: <Search size={15} />,
        run: () => { window.open(`${engine.url}${encodeURIComponent(bang[2])}`, '_blank', 'noopener,noreferrer'); onClose() },
      })
    }
    if (/^[-+*/%().\d\s]+$/.test(raw) && /\d/.test(raw) && /[-+*/%]/.test(raw)) {
      try {
        const value: unknown = Function(`"use strict"; return (${raw})`)()
        if (typeof value === 'number' && Number.isFinite(value)) {
          const answer = String(Math.round(value * 1e10) / 1e10)
          extras.push({
            key: 'calculator', group: '计算', label: `${raw} = ${answer}`, keywords: '', hint: '回车复制结果',
            icon: <Calculator size={15} />,
            run: async () => {
              try {
                await navigator.clipboard.writeText(answer)
                toast.success('结果已复制', `${raw} = ${answer}`)
                onClose()
              } catch { setNotice(`结果：${answer}（无法自动复制，请手动复制）`) }
            },
          })
        }
      } catch { /* 未完成的算式继续作为普通搜索。 */ }
    }
    return commandItemsInDisplayOrder([
      ...extras,
      ...items.filter((item) => !kw || `${item.label} ${item.keywords}`.toLowerCase().includes(kw)),
    ])
  }, [items, query, onClose])

  const selectedIndex = commandSelectionIndex(query, selection, results.length)
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, query])

  if (!open) return null

  const runItem = async (item: PaletteItem) => {
    try { await item.run() }
    catch (err) { setNotice(err instanceof Error ? err.message : '操作失败，请重试') }
  }
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none items-start justify-center bg-transparent p-4 pt-[min(12vh,5rem)] text-txt-primary backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex"
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          setSelection({ query, index: Math.max(0, Math.min(selectedIndex + (e.key === 'ArrowDown' ? 1 : -1), results.length - 1)) })
        } else if (e.key === 'Enter' && e.target === inputRef.current) {
          e.preventDefault()
          const item = results[selectedIndex]
          if (item) void runItem(item)
        }
      }}
    >
      <div className="glass-card flex max-h-[76dvh] w-full max-w-xl flex-col overflow-hidden shadow-2xl">
        <h2 id={titleId} className="sr-only">搜索与命令面板</h2>
        <div className="flex shrink-0 items-center gap-3 border-b border-line-2 px-4 py-3">
          <Search size={17} className="shrink-0 text-txt-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => {
              const nextQuery = e.target.value
              setQuery(nextQuery)
              setSelection({ query: nextQuery, index: 0 })
            }}
            role="combobox"
            aria-label="搜索任务、笔记、链接或操作"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-${selectedIndex}` : undefined}
            placeholder="搜索页面、任务、笔记、链接…"
            className="min-w-0 flex-1 bg-transparent text-sm text-txt-primary outline-none placeholder:text-txt-muted"
          />
          <button type="button" onClick={onClose} aria-label="关闭命令面板" className="cursor-pointer rounded-lg p-2 text-txt-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent">
            <X size={16} />
          </button>
        </div>
        <div ref={listRef} id={listId} role="listbox" aria-label="搜索结果" className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length === 0 && <p role="status" className="py-10 text-center text-sm text-txt-muted">没有匹配的结果</p>}
          {results.map((item, index) => (
            <Fragment key={item.key}>
              {(index === 0 || results[index - 1].group !== item.group) && <p role="presentation" className="px-3 pt-2 pb-1 text-[11px] tracking-wider text-txt-muted">{item.group}</p>}
              <button
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                tabIndex={-1}
                data-idx={index}
                onClick={() => void runItem(item)}
                onMouseEnter={() => setSelection({ query, index })}
                className={cn('flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors', index === selectedIndex ? 'bg-accent-soft text-txt-primary' : 'text-txt-secondary')}
              >
                <span className={cn('shrink-0', index === selectedIndex ? 'text-accent' : 'text-txt-muted')} aria-hidden="true">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                {item.hint && <span className="max-w-28 shrink-0 truncate text-xs text-txt-muted sm:max-w-40">{item.hint}</span>}
                {index === selectedIndex && <CornerDownLeft size={13} className="shrink-0 text-txt-muted" aria-hidden="true" />}
              </button>
            </Fragment>
          ))}
        </div>
        {notice && <p role="status" className="shrink-0 border-t border-line-2 px-4 py-2.5 text-xs text-accent">{notice}</p>}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line-2 px-4 py-2 text-[11px] text-txt-muted">
          <span>↑↓ 选择 · Enter 确认 · Esc 关闭</span><span className="hidden sm:inline">{results.length} 个结果</span>
        </div>
      </div>
    </dialog>,
    document.body,
  )
}
