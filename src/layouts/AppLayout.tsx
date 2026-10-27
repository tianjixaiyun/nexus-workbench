import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { ChevronDown, Cloud, HardDrive, Loader2, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, RefreshCw, Search, Sun, X, Zap } from 'lucide-react'
import { cn, todayStr } from '@/lib/utils'
import { isCloudMode } from '@/lib/config'
import { refreshCloudData, startRealtime } from '@/lib/data/realtime'
import { requestAction } from '@/lib/uiBus'
import { liquidNavigate } from '@/components/fx/overlays'
import { APP_MODULES, NAV_GROUPS, modulesForGroup, shortcutDestination, type AppModule } from '@/lib/modules'
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

import { loadNavigationPreferences, saveNavigationPreferences, type NavigationPreferences } from '@/lib/navigationPreferences'
import { useSyncStore } from '@/stores/syncStore'
import { toast } from '@/stores/toastStore'

const SYNC_LABELS = { local: '本机空间', connecting: '连接中', live: '实时已连接', offline: '离线', error: '连接需检查' } as const

export function AppLayout() {
  const { user, ready, init, signOut } = useAuthStore()
  const theme = useSettingsStore((s) => s.theme)
  const allTasks = useTaskStore((st) => st.tasks)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const [navigation, setNavigation] = useState(loadNavigationPreferences)
  const collapsed = navigation.collapsed
  const { status: syncStatus, message: syncMessage, lastSyncedAt, refreshing } = useSyncStore()
  const owner = user?.id
  const updateNavigation = (next: NavigationPreferences) => {
    setNavigation(next)
    if (!saveNavigationPreferences(next)) toast.error('导航偏好未能保存', '当前页面已切换，刷新后可能恢复。')
  }
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useNativeDialog(mobileOpen)
  const mainRef = useRef<HTMLElement>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickBatch, setQuickBatch] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantTab, setAssistantTab] = useState<'analysis'|'prompts'>('analysis')
  useEffect(() => { setAssistantOpen(false) }, [owner])
  const [dueDismissed, setDueDismissed] = useState(() => { try { return sessionStorage.getItem('nexus-due-dismissed') === '1' } catch { return false } })
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

  // 云端由受控刷新统一应用，本地沿用现有按模块加载。
  useEffect(() => {
    if (!ready || !owner) return
    if (isCloudMode) {
      const stop = startRealtime()
      void refreshCloudData().catch(() => {})
      return stop
    }
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
  }, [ready, owner])

  // 弹窗和中文输入法组合期间不触发页面快捷键。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isCloudMode && !useAuthStore.getState().user) return
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
        setQuickBatch(false)
        setQuickOpen(true)
      } else if (key === 'a') {
        e.preventDefault()
        setAssistantTab('analysis')
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
    const open = (event: Event) => { setAssistantTab((event as CustomEvent).detail==='prompts'?'prompts':'analysis'); setAssistantOpen(true) }
    window.addEventListener('nexus:assistant', open)
    return () => window.removeEventListener('nexus:assistant', open)
  }, [])

  useEffect(() => {
    const open = (event: Event) => {
      if (!useAuthStore.getState().user) return
      setQuickBatch((event as CustomEvent).detail === 'batch')
      setQuickOpen(true)
    }
    window.addEventListener('nexus:capture', open)
    return () => window.removeEventListener('nexus:capture', open)
  }, [])

  // 云端模式未登录 → 去登录页
  if (isCloudMode && ready && !user && location.pathname !== '/settings') {
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
    try { await signOut() } catch { toast.error('退出未完成', '请检查网络后重试。'); return }
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

  const currentModule = APP_MODULES.find(module => module.to === location.pathname)
  const title = currentModule?.label ?? '工作台'
  const activeGroup = currentModule?.group
  const groupLabel = NAV_GROUPS.find(group => group.id === activeGroup)?.label ?? '工作空间'
  const syncLabel = !isCloudMode ? '本机空间' : SYNC_LABELS[syncStatus]
  const navItem = ({ to, label, icon: Icon, shortcut }: AppModule, compact: boolean) => <NavLink
    key={to} to={to} end={to === '/'} aria-keyshortcuts={shortcut} title={compact ? label : undefined}
    onClick={event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
      event.preventDefault(); setMobileOpen(false)
      if (prefersReducedMotion()) navigate(to)
      else liquidNavigate(navigate, to, event)
    }}
    className={({ isActive }) => cn('group relative flex min-h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-accent', isActive ? 'bg-accent-soft font-medium text-accent' : 'text-txt-secondary hover:bg-surface-2 hover:text-txt-primary')}
  ><Icon size={17} className="shrink-0" aria-hidden="true" /><span className={compact ? 'sr-only' : 'min-w-0 flex-1 truncate'}>{label}</span>{!compact && shortcut && <kbd aria-hidden="true" className="font-mono text-[10px] text-txt-muted opacity-60">{shortcut}</kbd>}</NavLink>
  const sidebarContent = (compact: boolean, mobile = false) => <>
    <div className="flex items-center gap-3 px-4 pt-5 pb-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><Zap size={18} /></div>{!compact && <div className="min-w-0 flex-1"><p className="text-base font-bold tracking-[.16em] text-txt-primary">NEXUS</p><p className="mt-0.5 text-[10px] text-txt-muted">个人工作空间</p></div>}{mobile && <button type="button" onClick={() => setMobileOpen(false)} aria-label="关闭导航菜单" className="cursor-pointer rounded-lg p-2 text-txt-secondary hover:bg-surface-2"><X size={18} /></button>}</div>
    <div className="px-3 pb-3"><button type="button" disabled={!user} onClick={() => { setMobileOpen(false); setPaletteOpen(true) }} title="搜索与命令面板 (Ctrl+K)" className={cn('flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-line-2 px-2.5 text-xs text-txt-secondary hover:border-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50', compact && 'justify-center px-0')}><Search size={15} className="shrink-0" /><span className={compact ? 'sr-only' : 'flex-1 text-left'}>搜索工作空间</span>{!compact && <kbd className="text-[10px] text-txt-muted">Ctrl K</kbd>}</button></div>
    <nav aria-label="主要导航" className="min-h-0 flex-1 overflow-y-auto px-2">
      {NAV_GROUPS.map(group => {
        const items = modulesForGroup(group.id)
        const expanded = activeGroup === group.id || navigation.groups[group.id]
        return <div key={group.id} role="group" aria-label={group.label} className="mb-3">
          {!compact ? <button type="button" aria-expanded={expanded} aria-controls={`nav-${mobile ? 'mobile-' : ''}${group.id}`} title={activeGroup === group.id ? '当前页面所属分组保持展开' : undefined} disabled={activeGroup === group.id} onClick={() => updateNavigation({ ...navigation, groups: { ...navigation.groups, [group.id]: !navigation.groups[group.id] } })} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-[11px] font-medium text-txt-muted hover:text-txt-primary disabled:cursor-default"><span className="flex-1 text-left">{group.label}</span><span className="font-mono text-[10px] opacity-60">{items.length}</span><ChevronDown size={12} className={cn('transition-transform', !expanded && '-rotate-90')} /></button> : <div className="mx-3 my-2 border-t border-line-2" />}
          {(compact || expanded) && <div id={`nav-${mobile ? 'mobile-' : ''}${group.id}`} className="flex flex-col gap-0.5">{items.map(item => navItem(item, compact))}</div>}
        </div>
      })}
    </nav>
    <div className="flex shrink-0 flex-col gap-1 border-t border-line-2 px-2 py-3">
      {APP_MODULES.filter(item => item.group === 'system').sort((a, b) => Number(b.to === '/settings') - Number(a.to === '/settings')).map(item => navItem(item, compact))}
      {isCloudMode && user && <button type="button" onClick={() => void handleSignOut()} title="退出登录" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-txt-secondary hover:bg-surface-2 hover:text-danger"><LogOut size={17} className="shrink-0" /><span className={compact ? 'sr-only' : 'truncate'}>退出登录</span></button>}
      {!mobile && <button type="button" onClick={() => updateNavigation({ ...navigation, collapsed: !collapsed })} aria-expanded={!compact} title={compact ? '展开菜单' : '收起菜单'} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-txt-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent">{compact ? <PanelLeftOpen size={17} className="shrink-0" /> : <PanelLeftClose size={17} className="shrink-0" />}<span className={compact ? 'sr-only' : undefined}>{compact ? '展开菜单' : '收起菜单'}</span></button>}
    </div>
  </>

  return (
    <div className="workbench-shell flex h-full">
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
            <span className="hidden shrink-0 text-xs text-txt-muted sm:inline">{groupLabel}<span className="mx-2 opacity-40">/</span></span><h1 className="truncate text-sm font-semibold text-txt-primary">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {user && <button type="button" onClick={() => { requestAction('new-task'); navigate('/tasks') }} className="hidden h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-line-2 px-3 text-xs text-txt-secondary hover:border-accent lg:inline-flex"><Plus size={14} />新建任务</button>}
            <CalmModeToggle />
            <button
              type="button"
              onClick={(e) => {
                const next = theme === 'light' ? 'dark' : 'light'
                const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
                if (!doc.startViewTransition || prefersReducedMotion()) { setTheme(next); return }
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
            <button type="button" disabled={!user} onClick={() => setPaletteOpen(true)} aria-label="搜索与命令面板" className="flex cursor-pointer items-center gap-2 rounded-xl border border-line-2 bg-surface-1 p-2 text-xs text-txt-muted hover:border-accent hover:text-txt-secondary focus-visible:outline-2 focus-visible:outline-accent md:px-3">
              <Search size={16} /><span className="hidden md:inline">搜索一切…</span><kbd className="hidden rounded-md border border-line-3 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] md:inline">Ctrl K</kbd>
            </button>
            <Link to="/settings" aria-label={`存储与同步：${syncLabel}`} title="打开设置与同步" className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg border px-2 text-[11px] sm:px-2.5', syncStatus === 'error' || syncStatus === 'offline' ? 'border-warn/30 text-warn' : 'border-line-2 text-txt-secondary hover:border-accent')}>
              {isCloudMode ? <Cloud size={14} /> : <HardDrive size={14} />}<span className="sr-only sm:not-sr-only">{syncLabel}</span>
            </Link>
            {isCloudMode && user?.email && <span className="hidden max-w-40 truncate text-xs text-txt-secondary lg:inline">{user.email}</span>}
          </div>
        </header>
        {(syncStatus === 'error' || syncStatus === 'offline') && syncMessage && location.pathname !== '/settings' && <div role="alert" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-warn/25 bg-warn/10 px-4 py-2 text-xs leading-5 text-txt-secondary sm:px-6"><p className="min-w-0 flex-1">{syncMessage}</p><Link to="/settings" className="shrink-0 text-accent hover:underline">检查连接</Link></div>}

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
                  try { sessionStorage.setItem('nexus-due-dismissed', '1') } catch { /* 当前页面已隐藏提醒。 */ }
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
          {isCloudMode && !lastSyncedAt && (syncStatus === 'error' || syncStatus === 'offline') && location.pathname !== '/settings' ? (
            <div className="mx-auto max-w-lg p-6 sm:pt-16"><div className="workspace-panel p-6"><h2 className="text-lg font-semibold text-txt-primary">暂时无法载入云端空间</h2><p className="mt-3 text-sm leading-6 text-txt-secondary">{syncMessage ?? '请检查网络、登录账号及数据表配置。'}</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={refreshing} onClick={() => void refreshCloudData().catch(() => {})} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line-3 px-3 py-2 text-sm text-accent disabled:opacity-50"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />重新载入</button><Link to="/settings" className="inline-flex items-center rounded-lg px-3 py-2 text-sm text-accent hover:bg-surface-2">打开设置与同步</Link></div></div></div>
          ) : location.pathname === '/sanctuary' ? (
            <Outlet />
          ) : (
            <div className="mx-auto max-w-7xl p-4 sm:p-6">
              <Outlet />
            </div>
          )}
        </main>
      </div>

      {user && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />}
      {user && <QuickCapture key={user.id} open={quickOpen} initialBatch={quickBatch} onClose={() => setQuickOpen(false)} />}
      {user && <QuickCaptureFab onClick={() => { setQuickBatch(false); setQuickOpen(true) }} />}
      {ready && user && location.pathname !== '/settings' && <OnboardingModal />}
      {user && <AssistantPanel
        key={`assistant:${user.id}`}
        open={assistantOpen}
        initialTab={assistantTab}
        onClose={() => setAssistantOpen(false)}
        onNavigate={(to) => navigate(to)}
      />}
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Toaster />
    </div>
  )
}
