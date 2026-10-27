import { useEffect } from 'react'
import { useReducedMotion } from '@/lib/useReducedMotion'

/**
 * 全局指针委托(Aceternity 式 Spotlight,自研实现):
 * 把光标相对坐标写进最近的 .spotlight-card 的 CSS 变量——
 * 一张卡一次监听都不用挂,全局只挂一个 pointermove。
 * 必须保持零重依赖:本组件在入口静态图内,别在这里 import 共享组件。
 */
export function SpotlightHover() {
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('.spotlight-card') as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
      el.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => document.removeEventListener('pointermove', onMove)
  }, [reduced])
  return null
}
