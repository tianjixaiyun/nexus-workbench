import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/layouts/AppLayout'
import LandingPage from '@/pages/LandingPage'
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

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.PROD ? '/nexus-workbench' : '/'}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* 个人网站首页:全屏海洋下潜叙事,独立于工作台外壳 */}
        <Route path="/" element={<LandingPage />} />
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
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
