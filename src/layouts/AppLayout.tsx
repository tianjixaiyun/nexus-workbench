import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import {
  BarChart3,
  Cloud,
  HardDrive,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  Waves,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  StickyNote,
  Sun,
  Target,
  Timer,
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isCloudMode } from '@/lib/config'
import { startRealtime } from '@/lib/data/realtime'
import { requestAction } from '@/lib/uiBus'
import { liquidNavigate } from '@/components/fx/overlays'
import { useAuthStore } from '@/stores/authStore'
import { useDailyStore } from '@/stores/dailyStore'
import { useGoalStore } from '@/stores/goalStore'
import { useHabitStore } from '@/stores/habitStore'
import { useLinkStore } from '@/stores/linkStore'
import { useMilestoneStore } from '@/stores/milestoneStore'
import { useNoteStore } from '@/stores/noteStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTaskStore } from '@/stores/taskStore'
import { useWorkStore } from '@/stores/workStore'
import { AssistantPanel } from '@/components/AssistantPanel'
import { OnboardingModal } from '@/components/OnboardingModal'
import { CommandPalette } from '@/components/CommandPalette'
import { QuickCapture, QuickCaptureFab } from '@/components/QuickCapture'
import { ShortcutsHelp } from '@/components/ShortcutsHelp'

const NAV_ITEMS = [
  { to: '/home', label: '工作台', icon: LayoutDashboard },
  { to: '/', label: '个人主页', icon: Waves },
  { to: '/tasks', label: '任务中心', icon: ListChecks },
  { to: '/goals', label: '目标', icon: Target },
  { to: '/habits', label: '习惯打卡', icon: Zap },
  { to: '/focus', label: '专注番茄', icon: Timer },
  { to: '/notes', label: '笔记便签', icon: StickyNote },
  { to: '/stats', label: '数据看板', icon: BarChart3 },
  { to: '/links', label: '工具箱', icon: Wrench },
  { to: '/trash', label: '回收站', icon: Trash2 },
  { to: '/sanctuary', label: '云鲸圣域', icon: Waves },
] as const

const PAGE_TITLES: Record<string, string> = {
  '/home': '工作台',
  '/tasks': '任务中心',
  '/goals': '目标',
  '/habits': '习惯打卡',
  '/focus': '专注番茄',
  '/notes': '笔记便签',
  '/stats': '数据看板',
  '/links': '工具箱',
  '/trash': '回收站',
  '/sanctuary': '云鲸圣域',
}

/** 顶栏时钟:自包含的秒级重渲染,避免牵连整个应用树每秒刷新 */
function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <span className="font-mono text-xs text-txt-muted tabular-nums">
      {now.toLocaleTimeString('zh-CN', { hour12: false })}
    </span>
  )
}

export function AppLayout() {
  const { user, ready, init, signOut } = useAuthStore()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const [collapsed, setCollapsed] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

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
    ] as const
    for (const s of stores) {
      if (!s.loaded) void s.fetch()
    }
    // 云端模式:订阅实时同步,其他设备/标签页的改动实时推送过来
    if (isCloudMode) startRealtime()
  }, [ready, user])

  // 全局快捷键(Linear 风格):输入框内不生效
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
        return
      }
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === '/') {
        e.preventDefault()
        setPaletteOpen(true)
      } else if (e.key === '?') {
        e.preventDefault()
        setHelpOpen(true)
      } else if (e.key.toLowerCase() === 'q') {
        e.preventDefault()
        setQuickOpen(true)
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setAssistantOpen(true)
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        requestAction('new-task')
        navigate('/tasks')
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault()
        requestAction('new-note')
        navigate('/notes')
      } else if (/^[1-9]$/.test(e.key)) {
        const item = NAV_ITEMS[Number(e.key) - 1]
        if (item) {
          e.preventDefault()
          navigate(item.to)
        }
      } else if (e.key === '0') {
        e.preventDefault()
        navigate('/sanctuary')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate])

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
    navigate('/login', { replace: true })
  }

  const title = PAGE_TITLES[location.pathname] ?? '工作台'

  return (
    <div className="flex h-full">
      {/* 侧边栏 */}
      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-line-1 bg-ink-900/60 backdrop-blur-xl transition-all duration-200',
          collapsed ? 'w-[68px]' : 'w-[220px]',
        )}
      >
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="neon-gradient-bg glow-cyan flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <Zap size={18} className="text-white" />
          </div>
          <div className={cn('min-w-0', collapsed && 'hidden md:block')}>
            <p className="neon-gradient-text text-lg leading-5 font-bold tracking-widest">NEXUS</p>
            <p className="text-[11px] text-txt-muted">个人工作台</p>
          </div>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={(e) => {
                e.preventDefault()
                liquidNavigate(navigate, to, e)
              }}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'text-txt-secondary hover:bg-surface-2 hover:text-txt-primary',
                )
              }
              title={collapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="neon-gradient-bg absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full" />
                  )}
                  <Icon size={19} className="shrink-0" />
                  <span className={cn('truncate', collapsed && 'hidden md:block')}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-1 px-3 pb-4">
          <button
            onClick={() => setPaletteOpen(true)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-txt-muted transition-colors hover:bg-surface-2 hover:text-txt-secondary',
            )}
            title="命令面板 (Ctrl+K)"
          >
            <Search size={18} className="shrink-0" />
            <span className={cn('flex-1 truncate text-left', collapsed && 'hidden md:block')}>搜索</span>
            <kbd className={cn('rounded-md border border-line-3 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]', collapsed && 'hidden md:inline')}>
              Ctrl K
            </kbd>
          </button>
          {isCloudMode && (
            <button
              onClick={handleSignOut}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-txt-secondary transition-colors hover:bg-surface-2 hover:text-danger',
              )}
              title="退出登录"
            >
              <LogOut size={18} className="shrink-0" />
              <span className={cn('truncate', collapsed && 'hidden md:block')}>退出登录</span>
            </button>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-txt-muted transition-colors hover:bg-surface-2 hover:text-txt-secondary md:flex"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span className={cn(collapsed && 'hidden md:block')}>收起菜单</span>
          </button>
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line-1 px-6 backdrop-blur-xl">
          <h1 className="text-sm font-semibold tracking-wider text-txt-secondary">{title}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="cursor-pointer rounded-xl border border-line-2 bg-surface-1 p-1.5 text-txt-muted transition-colors hover:border-accent hover:text-accent"
              title={theme === 'light' ? '切换到深色主题' : '切换到亮色主题'}
              aria-label="切换主题"
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden cursor-pointer items-center gap-2 rounded-xl border border-line-2 bg-surface-1 px-3 py-1.5 text-xs text-txt-muted transition-colors hover:border-accent hover:text-txt-secondary md:flex"
            >
              <Search size={13} />
              搜索一切…
              <kbd className="rounded-md border border-line-3 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
            </button>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]',
                isCloudMode
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-slate-400/25 bg-slate-400/10 text-txt-secondary',
              )}
            >
              {isCloudMode ? <Cloud size={12} /> : <HardDrive size={12} />}
              {isCloudMode ? '云端同步' : '本地模式'}
            </span>
            <Clock />
            {isCloudMode && user?.email && (
              <span className="max-w-40 truncate text-xs text-txt-secondary">{user.email}</span>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          {/* 圣域展厅:全出血电影感布局,自己管理滚动 */}
          {location.pathname === '/sanctuary' ? (
            <Outlet />
          ) : (
            <div className="mx-auto max-w-7xl p-6">
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
    </div>
  )
}
