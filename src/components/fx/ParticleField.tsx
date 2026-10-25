import { useEffect, useRef } from 'react'

/**
 * 粒子英雄场(致敬粒子特效站):
 * - 深空星尘粒子 + 近距离细连线
 * - 粒子实时汇聚成目标文字(「NEXUS」),鼠标靠近会被推开形成空腔
 * - 挂载时从散乱状态汇聚成型;interval 驱动(不依赖 rAF)
 *
 * 纯 canvas 实现,零依赖。
 */

interface P {
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  size: number
  bright: number
}

export function ParticleField({ text = 'NEXUS', className, density = 1, opacity = 0.85 }: {
  text?: string
  className?: string
  density?: number
  opacity?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let particles: P[] = []
    let w = 0
    let h = 0
    let timer = 0
    let alive = true
    const mouse = { x: -9999, y: -9999 }

    /** 采样文字像素,生成目标点阵 */
    const buildTargets = (): { x: number; y: number }[] => {
      const off = document.createElement('canvas')
      const fs = Math.min(Math.max(w * 0.13, 64), 190)
      off.width = w
      off.height = h
      const octx = off.getContext('2d')!
      octx.fillStyle = '#fff'
      octx.font = `bold ${fs}px Georgia, "Songti SC", serif`
      octx.textAlign = 'center'
      octx.textBaseline = 'middle'
      octx.letterSpacing = '12px'
      octx.fillText(text, w / 2, h / 2)
      const data = octx.getImageData(0, 0, w, h).data
      const pts: { x: number; y: number }[] = []
      const gap = w < 640 ? 5 : 6
      for (let y = 0; y < h; y += gap) {
        for (let x = 0; x < w; x += gap) {
          if (data[(y * w + x) * 4 + 3] > 128) pts.push({ x, y })
        }
      }
      return pts
    }

    const build = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const targets = buildTargets()
      const count = Math.round(targets.length * density)
      particles = targets.slice(0, count).map((t, i) => ({
        // 出生:从全屏随机位置飞向文字点
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0,
        vy: 0,
        tx: t.x + (Math.random() - 0.5) * 2,
        ty: t.y + (Math.random() - 0.5) * 2,
        size: 1 + Math.random() * 1.4,
        bright: 0.4 + Math.random() * 0.6,
        // 打乱分配顺序,汇聚时像星尘汇流
        ...(i % 3 === 0 ? { size: 1.6 + Math.random() } : {}),
      }))
      // 补一圈游离背景星尘(不参与成型)
      for (let i = 0; i < Math.round(count * 0.35); i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          tx: -1, // 游离标记
          ty: -1,
          size: 0.6 + Math.random() * 0.9,
          bright: 0.25 + Math.random() * 0.3,
        })
      }
    }

    const onResize = () => build()
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999 }

    build()
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)

    const R = 90 // 鼠标推开半径

    const tick = () => {
      if (!alive) return
      ctx.clearRect(0, 0, w, h)

      // 连线(只在成型粒子之间,近距)
      ctx.lineWidth = 0.6
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        if (a.tx < 0) continue
        for (let j = i + 1; j < particles.length; j += 2) {
          const b = particles[j]
          if (b.tx < 0) continue
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < 26 * 26) {
            const alpha = (1 - Math.sqrt(d2) / 26) * 0.22
            ctx.strokeStyle = `rgba(140,225,255,${alpha.toFixed(3)})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      for (const p of particles) {
        if (p.tx >= 0) {
          // 汇聚到目标点(弹簧)
          p.vx += (p.tx - p.x) * 0.012
          p.vy += (p.ty - p.y) * 0.012
        } else {
          // 游离星尘缓慢漂移
          p.vx += (Math.random() - 0.5) * 0.01
          p.vy += (Math.random() - 0.5) * 0.01
        }
        // 鼠标推开
        const mdx = p.x - mouse.x
        const mdy = p.y - mouse.y
        const md2 = mdx * mdx + mdy * mdy
        if (md2 < R * R && md2 > 0.01) {
          const md = Math.sqrt(md2)
          const force = (1 - md / R) * 1.6
          p.vx += (mdx / md) * force
          p.vy += (mdy / md) * force
        }
        p.vx *= 0.86
        p.vy *= 0.86
        p.x += p.vx
        p.y += p.vy

        const tw = 0.75 + 0.25 * Math.sin(p.x * 0.05 + p.y * 0.03 + performance.now() * 0.001)
        ctx.fillStyle = p.tx >= 0
          ? `rgba(150,228,255,${(p.bright * tw).toFixed(3)})`
          : `rgba(170,200,240,${(p.bright * tw * 0.8).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    timer = window.setInterval(tick, 16)

    return () => {
      alive = false
      clearInterval(timer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [text, density])

  return <canvas ref={canvasRef} className={className} style={{ opacity }} aria-hidden />
}
