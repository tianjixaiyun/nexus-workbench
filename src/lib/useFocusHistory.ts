import { useEffect, useState } from 'react'

/** 番茄历史是设备存储；只在记录改变或返回页面时刷新使用者。 */
export function useFocusHistory(): number {
  const [revision, update] = useState(0)
  useEffect(() => {
    const refresh = () => update(value => value + 1)
    const storage = (event: StorageEvent) => { if (event.key === 'nexus:pomodoro' || event.key === null) refresh() }
    window.addEventListener('nexus:focus-history', refresh)
    window.addEventListener('storage', storage)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('nexus:focus-history', refresh)
      window.removeEventListener('storage', storage)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  return revision
}
