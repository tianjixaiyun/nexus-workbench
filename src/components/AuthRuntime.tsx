import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { isCloudMode } from '@/lib/config'
import { refreshCloudData } from '@/lib/data/realtime'
import { useAuthStore } from '@/stores/authStore'

/** 登录态覆盖独立展示页；工作区内的数据启动仍由 AppLayout 负责。 */
export function AuthRuntime() {
  const ready = useAuthStore(state => state.ready)
  const owner = useAuthStore(state => state.user?.id)
  const { pathname } = useLocation()
  useEffect(() => { void useAuthStore.getState().init() }, [])
  useEffect(() => {
    if (isCloudMode && ready && owner && ['/', '/portfolio', '/scrapbook'].includes(pathname)) {
      void refreshCloudData().catch(() => {})
    }
  }, [ready, owner, pathname])
  return null
}
