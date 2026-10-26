import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from '@/layouts/AppLayout'
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
const AboutPage = lazy(() => import('@/pages/AboutPage'))
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

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.PROD ? '/nexus-workbench' : '/'}>
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
        <Route path="/login" element={<Suspense fallback={<PageFallback />}><LoginPage /></Suspense>} />
        {/* 个人网站首页:全屏海洋下潜叙事,独立于工作台外壳 */}
        <Route path="/" element={<Suspense fallback={<FullscreenFallback />}><LandingPage /></Suspense>} />
        {/* 作品集:个人网站对外展示页,同样独立全屏 */}
        <Route path="/portfolio" element={<Suspense fallback={<PageFallback />}><PortfolioPage /></Suspense>} />
        {/* 海面之上·手帐:剪贴簿风彩蛋页 */}
        <Route path="/scrapbook" element={<Suspense fallback={<PageFallback />}><ScrapbookPage /></Suspense>} />
        <Route element={<AppLayout />}>
          {/* 工作台首屏也按需:DashboardView 的 echarts 图表不进入口静态依赖图 */}
          <Route path="home" element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>} />
          <Route path="tasks" element={<Suspense fallback={<PageFallback />}><TasksPage /></Suspense>} />
          <Route path="goals" element={<Suspense fallback={<PageFallback />}><GoalsPage /></Suspense>} />
          <Route path="habits" element={<Suspense fallback={<PageFallback />}><HabitsPage /></Suspense>} />
          <Route path="focus" element={<Suspense fallback={<PageFallback />}><FocusPage /></Suspense>} />
          <Route path="notes" element={<Suspense fallback={<PageFallback />}><NotesPage /></Suspense>} />
          <Route path="stats" element={<Suspense fallback={<PageFallback />}><StatsPage /></Suspense>} />
          <Route path="links" element={<Suspense fallback={<PageFallback />}><LinksPage /></Suspense>} />
          <Route path="sanctuary" element={<Suspense fallback={<PageFallback />}><SanctuaryPage /></Suspense>} />
          <Route path="trash" element={<Suspense fallback={<PageFallback />}><TrashPage /></Suspense>} />
          <Route path="achievements" element={<Suspense fallback={<PageFallback />}><AchievementsPage /></Suspense>} />
          <Route path="memos" element={<Suspense fallback={<PageFallback />}><MemosPage /></Suspense>} />
          <Route path="expense" element={<Suspense fallback={<PageFallback />}><ExpensePage /></Suspense>} />
          <Route path="about" element={<Suspense fallback={<PageFallback />}><AboutPage /></Suspense>} />
        </Route>
        {/* 深海 404:未知路由不再静默跳转 */}
        <Route path="*" element={<Suspense fallback={<PageFallback />}><NotFoundPage /></Suspense>} />
      </Routes>
    </BrowserRouter>
  )
}
