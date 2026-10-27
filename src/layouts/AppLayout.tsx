import { useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { Cloud, HardDrive, Loader2, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X, Zap } from 'lucide-react'
import { cn, todayStr } from '@/lib/utils'
import { isCloudMode } from '@/lib/config'
import { startRealtime } from '@/lib/data/realtime'
import { requestAction } from '@/lib/uiBus'
import { liquidNavigate } from '@/components/fx/overlays'
import { APP_MODULES, shortcutDestination } from '@/lib/modules'
import { useNativeDialog } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/authStore'
import { useContactStore } from '@/stores/contactStore'
import { useDailyStore } from '@/stores/dailyStore'
import { useGoalStore } from '@/stores/goalStore'
import { useHabitStore } from '@/stores/habitStore'
import { useLinkStore } from '@/stores/linkStore'
import { useMilestoneStore } from '@/stores/milestoneStore'
import { useNoteStore } from '@/stores/noteStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTaskStore } from '@/stores/taskStore'
import { useWorkStore } from '@/stores/workStore'
import { useMemoStore } from '@/stores/memoStore'
import { useExpenseStore } from '@/stores/expenseStore'
import { AssistantPanel } from '@/components/AssistantPanel'
import { BackupReminder } from '@/components/BackupReminder'
import { OnboardingModal } from '@/components/OnboardingModal'
import { CommandPalette } from '@/components/CommandPalette'
import { QuickCapture, QuickCaptureFab } from '@/components/QuickCapture'
import { ShortcutsHelp } from '@/components/ShortcutsHelp'
import { Toaster } from '@/components/Toaster'
import { CalmModeToggle } from '@/components/CalmModeToggle'
import { prefersReducedMotion } from '@/lib/useReducedMotion'

const NAV_ITEMS = APP_MODULES

/** 顶栏时钟:自包含的秒级重渲染,避免牵连整个应用树每秒刷新 */
function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <span className="hidden font-mono text-xs text-txt-muted tabular-nums sm:inline">
      {now.toLocaleTimeString('zh-CN', { hour12: false })}
    </span>
  )
}

export function AppLayout() {
  const { user, ready, init, signOut } = useAuthStore()
  const theme = useSettingsStore((s) => s.theme)
  const allTasks = useTaskStore((st) => st.tasks)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useNativeDialog(mobileOpen)
  const mainRef = useRef<HTMLElement>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [dueDismissed, setDueDismissed] = useState(() => sessionStorage.getItem('nexus-due-dismissed') === '1')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const onChange = () => { if (media.matches) setMobileOpen(false) }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.title = `${APP_MODULES.find((module) => module.to === location.pathname)?.label ?? '工作台'} · NEXUS`
    mainRef.current?.scrollTo({ top: 0 })
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname, ready])

  useEffect(() => {
    if (!ready) void init()
  }, [ready, init])

  // 会话就绪后拉取各模块数据(只拉一次)
  useEffect(() => {
    if (!ready || !user) return
    const stores = [
      useTaskStore.getState(),
      useNoteStore.getState(),
      useLinkStore.getState(),
      useHabitStore.getState(),
      useMilestoneStore.getState(),
      useDailyStore.getState(),
      useGoalStore.getState(),
      useWorkStore.getState(),
      useMemoStore.getState(),
      useExpenseStore.getState(),
      useContactStore.getState(),
    ] as const
    for (const s of stores) {
      if (!s.loaded) void s.fetch()
    }
    // 云端模式:订阅实时同步,其他设备/标签页的改动实时推送过来
    if (isCloudMode) startRealtime()
  }, [ready, user])

  // 弹窗和中文输入法组合期间不触发页面快捷键。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const modalOpen = Boolean(document.querySelector('dialog[open]'))
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if ((modalOpen && !paletteOpen) || assistantOpen) return
        e.preventDefault()
        setPaletteOpen((value) => !value)
        return
      }
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      if (typing || modalOpen || assistantOpen || e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()
      const destination = shortcutDestination(key)
      if (destination) {
        e.preventDefault()
        navigate(destination)
      } else if (key === '/') {
        e.preventDefault()
        setPaletteOpen(true)
      } else if (key === '?') {
        e.preventDefault()
        setHelpOpen(true)
      } else if (key === 'q') {
        e.preventDefault()
        setQuickOpen(true)
      } else if (key === 'a') {
        e.preventDefault()
        setAssistantOpen(true)
      } else if (key === 'n' || key === 'm') {
        e.preventDefault()
        requestAction(key === 'n' ? 'new-task' : 'new-note')
        navigate(key === 'n' ? '/tasks' : '/notes')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate, paletteOpen, assistantOpen])
  // 命令面板「问问助手」动作
  useEffect(() => {
    const open = () => setAssistantOpen(true)
    window.addEventListener('nexus:assistant', open)
    return () => window.removeEventListener('nexus:assistant', open)
  }, [])

  // 云端模式未登录 → 去登录页
  if (isCloudMode && ready && !user) {
    return <Navigate to="/login" replace />
  }

  // 云端模式等待会话检查
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-txt-secondary">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm">正在加载…</span>
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    useTaskStore.getState().reset()
    useNoteStore.getState().reset()
    useLinkStore.getState().reset()
    useHabitStore.getState().reset()
    useMilestoneStore.getState().reset()
    useDailyStore.getState().reset()
    useGoalStore.getState().reset()
    useWorkStore.getState().reset()
    useMemoStore.getState().reset()
    useExpenseStore.getState().reset()
    useContactStore.getState().reset()
    navigate('/login', { replace: true })
  }

  const title = APP_MODULES.find((module) => module.to === location.pathname)?.label ?? '工作台'
  const sidebarContent = (compact: boolean, mobile = false) => (
    <>
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="neon-gradient-bg glow-cyan flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"><Zap size={18} className="text-white" /></div>
        {!compact && <div className="min-w-0 flex-1"><p className="neon-gradient-text text-lg leading-5 font-bold tracking-widest">NEXUS</p><p className="text-[11px] text-txt-muted">个人工作台</p></div>}
        {mobile && <button type="button" onClick={() => setMobileOpen(false)} aria-label="关闭导航菜单" className="cursor-pointer rounded-lg p-2 text-txt-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"><X size={18} /></button>}
      </div>
      <nav aria-label="主要导航" className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return
              e.preventDefault()
              setMobileOpen(false)
              if (prefersReducedMotion()) navigate(to)
              else liquidNavigate(navigate, to, e)
            }}
            title={compact ? label : undefined}
            className={({ isActive }) => cn('group relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all focus-visible:outline-2 focus-visible:outline-accent', isActive ? 'bg-accent-soft text-accent' : 'text-txt-secondary hover:bg-surface-2 hover:text-txt-primary')}
          >
            {({ isActive }) => <>
              {isActive && <span className="neon-gradient-bg absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full" />}
              <Icon size={19} className="shrink-0" aria-hidden="true" />
              <span className={compact ? 'sr-only' : 'truncate'}>{label}</span>
            </>}
          </NavLink>
        ))}
      </nav>
      <div className="flex shrink-0 flex-col gap-1 px-3 pt-3 pb-4">
        <button type="button" onClick={() => { setMobileOpen(false); setPaletteOpen(true) }} title="搜索与命令面板 (Ctrl+K)" className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-txt-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent">
          <Search size={18} className="shrink-0" aria-hidden="true" />
          <span className={compact ? 'sr-only' : 'flex-1 truncate text-left'}>搜索</span>
          {!compact && <kbd className="rounded-md border border-line-3 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>}
        </button>
        {isCloudMode && <button type="button" onClick={handleSignOut} title="退出登录" className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-txt-secondary hover:bg-surface-2 hover:text-danger focus-visible:outline-2 focus-visible:outline-accent">
          <LogOut size={18} className="shrink-0" aria-hidden="true" /><span className={compact ? 'sr-only' : 'truncate'}>退出登录</span>
        </button>}
        {!mobile && <button type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!compact} title={compact ? '展开菜单' : '收起菜单'} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-txt-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent">
          {compact ? <PanelLeftOpen size={18} className="shrink-0" /> : <PanelLeftClose size={18} className="shrink-0" />}<span className={compact ? 'sr-only' : undefined}>{compact ? '展开菜单' : '收起菜单'}</span>
        </button>}
      </div>
    </>
  )

  return (
    <div className="flex h-full">
      <a href="#main-content" className="sr-only fixed top-2 left-2 z-[100] rounded-lg bg-ink-900 px-4 py-3 text-accent focus:not-sr-only">跳到主要内容</a>
      <aside className={cn('hidden shrink-0 flex-col border-r border-line-1 bg-ink-900/60 backdrop-blur-xl transition-[width] duration-200 motion-reduce:transition-none md:flex', collapsed ? 'w-[68px]' : 'w-[220px]')}>
        {sidebarContent(collapsed)}
      </aside>
      {mobileOpen && <dialog
        ref={drawerRef}
        id="mobile-navigation"
        aria-label="工作台导航菜单"
        aria-modal="true"
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-txt-primary backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex"
        onCancel={(e) => { e.preventDefault(); setMobileOpen(false) }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) setMobileOpen(false) }}
      >
        <aside className="flex h-full w-[min(84vw,18rem)] flex-col border-r border-line-2 bg-ink-900 shadow-2xl">{sidebarContent(false, true)}</aside>
      </dialog>}

      {/* 主区域 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line-1 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="打开导航菜单" aria-controls="mobile-navigation" aria-expanded={mobileOpen} className="shrink-0 cursor-pointer rounded-lg p-2 text-txt-secondary hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent md:hidden"><Menu size={20} /></button>
            <h1 className="truncate text-sm font-semibold tracking-wider text-txt-secondary">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <CalmModeToggle />
            <button
              type="button"
              onClick={(e) => {
                const next = theme === 'light' ? 'dark' : 'light'
                const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
                if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setTheme(next); return }
                const x = e.clientX
                const y = e.clientY
                const transition = doc.startViewTransition(() => setTheme(next))
                void transition.ready.then(() => {
                  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
                  document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: 520, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' })
                }).catch(() => setTheme(next))
              }}
              className="cursor-pointer rounded-xl border border-line-2 bg-surface-1 p-2 text-txt-muted hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
              title={theme === 'light' ? '切换到深色主题' : '切换到亮色主题'}
              aria-label={theme === 'light' ? '切换到深色主题' : '切换到亮色主题'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button type="button" onClick={() => setPaletteOpen(true)} aria-label="搜索与命令面板" className="flex cursor-pointer items-center gap-2 rounded-xl border border-line-2 bg-surface-1 p-2 text-xs text-txt-muted hover:border-accent hover:text-txt-secondary focus-visible:outline-2 focus-visible:outline-accent md:px-3">
              <Search size={16} /><span className="hidden md:inline">搜索一切…</span><kbd className="hidden rounded-md border border-line-3 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] md:inline">Ctrl K</kbd>
            </button>
            <span title={isCloudMode ? '云端同步模式' : '数据保存在本机浏览器'} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1.5 text-[11px] sm:px-2.5 sm:py-1', isCloudMode ? 'border-accent bg-accent-soft text-accent' : 'border-slate-400/25 bg-slate-400/10 text-txt-secondary')}>
              {isCloudMode ? <Cloud size={12} /> : <HardDrive size={12} />}<span className="sr-only sm:not-sr-only">{isCloudMode ? '云端同步' : '本地模式'}</span>
            </span>
            <Clock />
            {isCloudMode && user?.email && <span className="hidden max-w-40 truncate text-xs text-txt-secondary lg:inline">{user.email}</span>}
          </div>
        </header>

        {/* 到期提醒:逾期/今日到期任务,每次会话提醒一次(Todoist 式温和提示) */}
        {(() => {
          if (dueDismissed) return null
          const today = todayStr()
          const undone = allTasks.filter((t) => t.status !== 'done' && !t.deletedAt && t.dueDate)
          const overdue = undone.filter((t) => t.dueDate! < today)
          const dueToday = undone.filter((t) => t.dueDate === today)
          if (!overdue.length && !dueToday.length) return null
          return (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-warn/25 bg-warn/10 px-4 py-2 text-xs sm:gap-3 sm:px-6">
              <span className="text-warn">⏰</span>
              <span className="text-txt-secondary">
                {overdue.length > 0 && <><b className="text-warn">{overdue.length}</b> 项已逾期</>}
                {overdue.length > 0 && dueToday.length > 0 && <span className="mx-1.5 text-txt-muted">·</span>}
                {dueToday.length > 0 && <><b className="text-warn">{dueToday.length}</b> 项今日到期</>}
                <span className="ml-1 text-txt-muted">——去处理一下?</span>
              </span>
              <button
                onClick={() => navigate('/tasks?scope=today')}
                className="cursor-pointer rounded-md bg-warn/20 px-2.5 py-1 font-medium text-warn transition-colors hover:bg-warn/30"
              >
                查看
              </button>
              <button
                onClick={() => {
                  setDueDismissed(true)
                  sessionStorage.setItem('nexus-due-dismissed', '1')
                }}
                className="ml-auto cursor-pointer text-txt-muted transition-colors hover:text-txt-secondary"
                title="本次会话不再提醒"
              >
                ✕
              </button>
            </div>
          )
        })()}

        {/* 本地模式数据备份提醒:超 7 天未导出且库内有数据时,会话内提示一次 */}
        <BackupReminder />

        <main ref={mainRef} id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto focus:outline-none">
          {/* 圣域展厅:全出血电影感布局,自己管理滚动 */}
          {location.pathname === '/sanctuary' ? (
            <Outlet />
          ) : (
            <div className="mx-auto max-w-7xl p-4 sm:p-6">
              <Outlet />
            </div>
          )}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <QuickCapture open={quickOpen} onClose={() => setQuickOpen(false)} />
      <QuickCaptureFab onClick={() => setQuickOpen(true)} />
      <OnboardingModal />
      <AssistantPanel
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onNavigate={(to) => navigate(to)}
      />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Toaster />
    </div>
  )
}
