import { useEffect, useRef } from 'react'
import { useReducedMotion, prefersReducedMotion } from '@/lib/useReducedMotion'

/**
 * 全屏粒子引擎:任务完成金色水花 / 番茄庆祝气泡彩带 / 通用粒子迸发。
 * Canvas 单例 + 指数衰减,零依赖,挂在 App 根部一次即可。
 */

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  g: number
  life: number
  maxLife: number
  size: number
  color: string
  bubble: boolean
}

interface BurstOptions {
  count?: number
  colors?: string[]
  spread?: number
  up?: number
  gravity?: number
  size?: number
  bubbles?: number
}

let ctxApi: ((x: number, y: number, opts: BurstOptions) => void) | null = null

/** 在屏幕坐标 (x, y) 迸发一簇粒子 */
export function burst(x: number, y: number, opts: BurstOptions = {}) {
  if (!prefersReducedMotion()) ctxApi?.(x, y, opts)
}

/** 任务完成:金色水花 + 几颗小气泡 */
export function splashGold(x: number, y: number) {
  burst(x, y, {
    count: 26,
    colors: ['#ffd76a', '#ffb545', '#7ce7ff', '#fff6d8'],
    spread: 3.4,
    up: 2.6,
    gravity: 0.16,
    size: 3.4,
    bubbles: 6,
  })
}

/** 番茄完成 / 里程碑:底部喷发的气泡与彩带 */
export function celebrate() {
  if (prefersReducedMotion()) return
  const w = window.innerWidth
  const h = window.innerHeight
  burst(w * 0.5, h * 0.72, {
    count: 90,
    colors: ['#67e8f9', '#a78bfa', '#ffd76a', '#f0a6d8', '#7ce7ff', '#ffffff'],
    spread: 8,
    up: 11,
    gravity: 0.22,
    size: 4,
    bubbles: 26,
  })
  setTimeout(() => burst(w * 0.22, h * 0.78, { count: 40, colors: ['#67e8f9', '#ffd76a', '#ffffff'], spread: 6, up: 10, gravity: 0.2, size: 3.4, bubbles: 10 }), 140)
  setTimeout(() => burst(w * 0.78, h * 0.78, { count: 40, colors: ['#a78bfa', '#f0a6d8', '#ffffff'], spread: 6, up: 10, gravity: 0.2, size: 3.4, bubbles: 10 }), 260)
}

export function BurstHost() {
  const reduced = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let particles: Particle[] = []
    let raf = 0

    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio
      canvas.height = window.innerHeight * devicePixelRatio
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    ctxApi = (x, y, opts) => {
      const { count = 24, colors = ['#7ce7ff'], spread = 3, up = 3, gravity = 0.15, size = 3, bubbles = 0 } = opts
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const v = (0.35 + Math.random() * 0.65) * spread
        particles.push({
          x, y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - up * (0.5 + Math.random() * 0.6),
          g: gravity,
          life: 0,
          maxLife: 55 + Math.random() * 35,
          size: size * (0.5 + Math.random()),
          color: colors[Math.floor(Math.random() * colors.length)],
          bubble: false,
        })
      }
      for (let i = 0; i < bubbles; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 26,
          y: y + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -(1 + Math.random() * 1.6),
          g: -0.012,
          life: 0,
          maxLife: 70 + Math.random() * 40,
          size: 2.5 + Math.random() * 4,
          color: 'rgba(190,235,255,0.85)',
          bubble: true,
        })
      }
    }

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      particles = particles.filter((p) => p.life < p.maxLife)
      for (const p of particles) {
        p.life++
        p.vy += p.g
        p.vx *= 0.985
        p.x += p.vx
        p.y += p.vy
        const t = 1 - p.life / p.maxLife
        if (p.bubble) {
          ctx.strokeStyle = p.color
          ctx.globalAlpha = t * 0.8
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.fillStyle = p.color
          ctx.globalAlpha = Math.min(1, t * 1.6)
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * (0.6 + t * 0.4), 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
    }
    // setInterval 驱动渲染循环:rAF 在后台/降帧环境会被暂停,粒子会冻住
    raf = window.setInterval(tick, 16)

    return () => {
      clearInterval(raf)
      window.removeEventListener('resize', resize)
      ctxApi = null
    }
  }, [reduced])

  return reduced ? null : <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[9999]" aria-hidden />
}
