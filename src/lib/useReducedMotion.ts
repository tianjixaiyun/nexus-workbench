import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** 读取系统「减少动态效果」偏好(同步,供事件回调等非渲染代码使用) */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && 'matchMedia' in window && window.matchMedia(QUERY).matches
}

/**
 * 响应式订阅系统「减少动态效果」偏好。
 * 重型动效组件(丝带拖尾/自定义光标/滚动歪斜/海洋粒子与 3D 场景)据此自动降级。
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
