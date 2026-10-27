import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

const QUERY = '(prefers-reduced-motion: reduce)'
const systemReducedMotion = () => typeof window !== 'undefined' && 'matchMedia' in window && window.matchMedia(QUERY).matches

/** 手动低干扰与系统减少动态效果取并集，手动关闭不会覆盖系统偏好。 */
export function prefersReducedMotion(): boolean {
  return systemReducedMotion() || useSettingsStore.getState().calmMode
}

export function useReducedMotion(): boolean {
  const calm = useSettingsStore(state => state.calmMode)
  const [systemReduced, setSystemReduced] = useState(systemReducedMotion)
  useEffect(() => {
    if (!('matchMedia' in window)) return
    const media = window.matchMedia(QUERY)
    const change = () => setSystemReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return calm || systemReduced
}
