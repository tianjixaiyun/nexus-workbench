import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from '@/layouts/AppLayout'
import LandingPage from '@/pages/LandingPage'
import PortfolioPage from '@/pages/PortfolioPage'
import AchievementsPage from '@/pages/AchievementsPage'
import ScrapbookPage from '@/pages/ScrapbookPage'
import MemosPage from '@/pages/MemosPage'
import ExpensePage from '@/pages/ExpensePage'
import AboutPage from '@/pages/AboutPage'
import NotFoundPage from '@/pages/NotFoundPage'
import { KonamiEgg } from '@/components/fx/KonamiEgg'
import { PinGuard } from '@/components/fx/PinGuard'
import { FluidTrail } from '@/components/fx/FluidTrail'
import { GlobalSkew } from '@/components/fx/motion'
import { CustomCursor } from '@/components/fx/CustomCursor'
import DashboardPage from '@/pages/DashboardPage'
import TasksPage from '@/pages/TasksPage'
import GoalsPage from '@/pages/GoalsPage'
import SanctuaryPage from '@/pages/SanctuaryPage'
import HabitsPage from '@/pages/HabitsPage'
import FocusPage from '@/pages/FocusPage'
import NotesPage from '@/pages/NotesPage'
import StatsPage from '@/pages/StatsPage'
import LinksPage from '@/pages/LinksPage'
import TrashPage from '@/pages/TrashPage'
import LoginPage from '@/pages/LoginPage'
import { GlobalRipple, LiquidCurtain, DiveIntro } from '@/components/fx/overlays'
import { BurstHost } from '@/components/fx/Burst'
import { AchievementWatcher } from '@/components/fx/achievements'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.PROD ? '/nexus-workbench' : '/'}>
      <GlobalRipple />
      <LiquidCurtain />
      <BurstHost />
      <DiveIntro />
      <CustomCursor />
      <PinGuard />
      <FluidTrail />
      <GlobalSkew />
      <KonamiEgg />
      <AchievementWatcher />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* 个人网站首页:全屏海洋下潜叙事,独立于工作台外壳 */}
        <Route path="/" element={<LandingPage />} />
        {/* 作品集:个人网站对外展示页,同样独立全屏 */}
        <Route path="/portfolio" element={<PortfolioPage />} />
        {/* 海面之上·手帐:剪贴簿风彩蛋页 */}
        <Route path="/scrapbook" element={<ScrapbookPage />} />
        <Route element={<AppLayout />}>
          <Route path="home" element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="focus" element={<FocusPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="links" element={<LinksPage />} />
          <Route path="sanctuary" element={<SanctuaryPage />} />
          <Route path="trash" element={<TrashPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="memos" element={<MemosPage />} />
          <Route path="expense" element={<ExpensePage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
        {/* 深海 404:未知路由不再静默跳转 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
