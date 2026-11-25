import { Suspense, lazy, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthRuntime } from '@/components/AuthRuntime'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FocusRuntime } from '@/components/FocusRuntime'
import { BackupImportDialog } from '@/components/BackupImportDialog'
import { KonamiEgg } from '@/components/fx/KonamiEgg'
import { PinGuard } from '@/components/fx/PinGuard'
import { FluidTrail } from '@/components/fx/FluidTrail'
import { GlobalSkew } from '@/components/fx/motion'
import { CustomCursor } from '@/components/fx/CustomCursor'
import { GlobalRipple, LiquidCurtain, DiveIntro } from '@/components/fx/overlays'
import { SpotlightHover } from '@/components/fx/SpotlightHover'
import { BurstHost } from '@/components/fx/Burst'
import { AchievementWatcher } from '@/components/fx/achievements'

// 路由级懒加载:重资源页(three 945KB / echarts 552KB 等)按需拉取,
// 直连工作台的访客不再为首页/圣域预载 3D 与图表库
const TasksPage = lazy(() => import('@/pages/TasksPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const GoalsPage = lazy(() => import('@/pages/GoalsPage'))
const HabitsPage = lazy(() => import('@/pages/HabitsPage'))
const FocusPage = lazy(() => import('@/pages/FocusPage'))
const NotesPage = lazy(() => import('@/pages/NotesPage'))
const StatsPage = lazy(() => import('@/pages/StatsPage'))
const LinksPage = lazy(() => import('@/pages/LinksPage'))
const SanctuaryPage = lazy(() => import('@/pages/SanctuaryPage'))
const TrashPage = lazy(() => import('@/pages/TrashPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const PortfolioPage = lazy(() => import('@/pages/PortfolioPage'))
const ScrapbookPage = lazy(() => import('@/pages/ScrapbookPage'))
const AchievementsPage = lazy(() => import('@/pages/AchievementsPage'))
const MemosPage = lazy(() => import('@/pages/MemosPage'))
const ExpensePage = lazy(() => import('@/pages/ExpensePage'))
const ContactsPage = lazy(() => import('@/pages/ContactsPage'))
const JournalPage = lazy(() => import('@/pages/JournalPage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
// 海洋首页同样按需:three.js 只在真正访问首页时加载(下潜序幕会盖住加载期)
const LandingPage = lazy(() => import('@/pages/LandingPage'))

/** 全屏深色 fallback:首页加载期与下潜序幕无缝衔接 */
function FullscreenFallback() {
  return <div className="min-h-dvh bg-[#0d1c31]" />
}

function PageFallback() {
  // shadcn 式骨架屏:布局形状与工作台页面对齐,替代旋转 spinner
  return (
    <div className="p-6">
      <div className="nexus-sk h-7 w-44" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nexus-sk h-24" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="nexus-sk h-72 lg:col-span-3" />
        <div className="nexus-sk h-72 lg:col-span-2" />
      </div>
    </div>
  )
}

/** 页面容器:错误边界(单页崩溃不扩散到整站) + 骨架屏懒加载 */
function Page({ children }: { children: ReactNode }) {
  return <ErrorBoundary><Suspense fallback={<PageFallback />}>{children}</Suspense></ErrorBoundary>
}

/** 独立全屏页(海洋首页等)的容器:错误边界 + 全屏深色加载 */
function FullPage({ children }: { children: ReactNode }) {
  return <ErrorBoundary><Suspense fallback={<FullscreenFallback />}>{children}</Suspense></ErrorBoundary>
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <AuthRuntime />
      <FocusRuntime />
      <BackupImportDialog />
      <GlobalRipple />
      <LiquidCurtain />
      <BurstHost />
      <DiveIntro />
      <CustomCursor />
      <SpotlightHover />
      <PinGuard />
      <FluidTrail />
      <GlobalSkew />
      <KonamiEgg />
      <AchievementWatcher />
      <Routes>
        <Route path="/login" element={<Page><LoginPage /></Page>} />
        {/* 个人网站首页:全屏海洋下潜叙事,独立于工作台外壳 */}
        <Route path="/" element={<FullPage><LandingPage /></FullPage>} />
        {/* 作品集:个人网站对外展示页,同样独立全屏 */}
        <Route path="/portfolio" element={<Page><PortfolioPage /></Page>} />
        {/* 海面之上·手帐:剪贴簿风彩蛋页 */}
        <Route path="/scrapbook" element={<Page><ScrapbookPage /></Page>} />
        <Route element={<AppLayout />}>
          {/* 工作台首屏也按需:DashboardView 的 echarts 图表不进入口静态依赖图 */}
          <Route path="home" element={<Page><DashboardPage /></Page>} />
          <Route path="tasks" element={<Page><TasksPage /></Page>} />
          <Route path="goals" element={<Page><GoalsPage /></Page>} />
          <Route path="habits" element={<Page><HabitsPage /></Page>} />
          <Route path="focus" element={<Page><FocusPage /></Page>} />
          <Route path="notes" element={<Page><NotesPage /></Page>} />
          <Route path="stats" element={<Page><StatsPage /></Page>} />
          <Route path="links" element={<Page><LinksPage /></Page>} />
          <Route path="sanctuary" element={<Page><SanctuaryPage /></Page>} />
          <Route path="trash" element={<Page><TrashPage /></Page>} />
          <Route path="achievements" element={<Page><AchievementsPage /></Page>} />
          <Route path="memos" element={<Page><MemosPage /></Page>} />
          <Route path="expense" element={<Suspense fallback={<PageFallback />}><ExpensePage /></Suspense>} />
          <Route path="contacts" element={<Suspense fallback={<PageFallback />}><ContactsPage /></Suspense>} />
          <Route path="journal" element={<Suspense fallback={<PageFallback />}><JournalPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
          <Route path="about" element={<Suspense fallback={<PageFallback />}><AboutPage /></Suspense>} />
        </Route>
        {/* 深海 404:未知路由不再静默跳转 */}
        <Route path="*" element={<Suspense fallback={<PageFallback />}><NotFoundPage /></Suspense>} />
      </Routes>
    </BrowserRouter>
  )
}
