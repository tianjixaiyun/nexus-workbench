import { useEffect, useRef } from 'react'

/**
 * 滚动速度歪斜(Codrops/Lenis 圈经典):
 * 轮询 window.scrollY 计算速度,映射为 CSS 变量 --nexus-skew(±3.2deg,带惯性),
 * 各处用 style={{ transform: 'skewY(var(--nexus-skew))' }} 接力,
 * 快滚时内容微微倾斜、停手回正——页面像有物理质感。
 * 轮询而非 scroll 事件:部分合成环境不向监听器派发 scroll。
 */
export function GlobalSkew() {
  const state = useRef({ lastY: 0, skew: 0, target: 0 })

  useEffect(() => {
    const s = state.current
    s.lastY = window.scrollY

    const timer = window.setInterval(() => {
      const y = window.scrollY
      const vel = y - s.lastY
      s.lastY = y
      if (vel !== 0) {
        const t = Math.max(-14, Math.min(14, vel)) * 0.28
        s.target = Math.max(-3.2, Math.min(3.2, t))
      } else {
        s.target *= 0.86
      }
      s.skew += (s.target - s.skew) * 0.14
      document.documentElement.style.setProperty('--nexus-skew', `${s.skew.toFixed(3)}deg`)
    }, 16)

    return () => clearInterval(timer)
  }, [])

  return null
}
