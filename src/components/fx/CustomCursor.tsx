import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/useReducedMotion'

/**
 * 自定义光标(仅精确指针设备,触屏自动关闭):
 * - 默认:发光小圆点 + 跟随的外环(带轻微滞后)
 * - 悬停按钮/链接:外环放大并填充微光
 * - 悬停带 data-cursor="xxx" 的元素:环内显示提示文字(如作品的 VIEW)
 * - 按下时收缩,离开窗口隐藏;输入框保留原生文本光标
 * - 系统「减少动态效果」时整体停用,保留原生光标
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) return

    const style = document.createElement('style')
    style.textContent = `
      @media (pointer: fine) {
        body.nexus-cursor, body.nexus-cursor * { cursor: none !important }
        body.nexus-cursor input[type="text"], body.nexus-cursor input[type="email"], body.nexus-cursor input[type="password"], body.nexus-cursor textarea { cursor: text !important }
      }
      @keyframes nexus-cursor-in { from { opacity: 0 } to { opacity: 1 } }
    `
    document.head.appendChild(style)
    document.body.classList.add('nexus-cursor')

    const dot = dotRef.current!
    const ring = ringRef.current!
    const label = labelRef.current!
    let tx = -100
    let ty = -100
    let rx = -100
    let ry = -100
    let visible = false

    const onMove = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (!visible) {
        visible = true
        dot.style.opacity = '1'
        ring.style.opacity = '1'
      }
    }

    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('a, button, [role="button"], label, summary, [data-cursor]')
      if (el) {
        ring.classList.add('nexus-cursor-active')
        const text = (el as HTMLElement).getAttribute('data-cursor')
        if (text) {
          label.textContent = text
          ring.classList.add('nexus-cursor-label')
        } else {
          label.textContent = ''
          ring.classList.remove('nexus-cursor-label')
        }
      } else {
        ring.classList.remove('nexus-cursor-active', 'nexus-cursor-label')
        label.textContent = ''
      }
    }

    const onDown = () => ring.classList.add('nexus-cursor-down')
    const onUp = () => ring.classList.remove('nexus-cursor-down')
    const onLeave = () => {
      visible = false
      dot.style.opacity = '0'
      ring.style.opacity = '0'
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    document.documentElement.addEventListener('pointerleave', onLeave)

    // 外环滞后跟随(rAF 在部分环境停摆,统一用 interval)
    const timer = window.setInterval(() => {
      rx += (tx - rx) * 0.18
      ry += (ty - ry) * 0.18
      dot.style.transform = `translate(${tx - 3}px, ${ty - 3}px)`
      ring.style.transform = `translate(${rx}px, ${ry}px)`
    }, 16)

    return () => {
      clearInterval(timer)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      document.body.classList.remove('nexus-cursor')
      style.remove()
    }
  }, [reduced])

  return (
    <>
      <div
        ref={ringRef}
        className="pointer-events-none fixed top-0 left-0 z-[10001] flex h-9 w-9 opacity-0 transition-opacity duration-200"
        style={{ animation: 'nexus-cursor-in 320ms ease-out' }}
        aria-hidden
      >
        <style>{`
          .nexus-cursor-ring-inner { transition: width .2s ease, height .2s ease, background .2s ease, border-color .2s ease }
          .nexus-cursor-active .nexus-cursor-ring-inner { width: 3.2rem; height: 3.2rem; background: rgba(124,231,255,0.12); border-color: rgba(147,233,255,0.9) }
          .nexus-cursor-down .nexus-cursor-ring-inner { width: 1.6rem; height: 1.6rem }
          .nexus-cursor-label .nexus-cursor-ring-inner { width: 4rem; height: 4rem }
          .nexus-cursor-ring-label { transition: opacity .2s ease }
        `}</style>
        <div className="nexus-cursor-ring-inner m-auto flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200/60">
          <span ref={labelRef} className="nexus-cursor-ring-label font-mono text-[9px] tracking-[0.2em] text-cyan-100" />
        </div>
      </div>
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[10002] h-1.5 w-1.5 rounded-full bg-cyan-200 opacity-0 shadow-[0_0_10px_rgba(147,233,255,0.9)] transition-opacity duration-200"
        aria-hidden
      />
    </>
  )
}
