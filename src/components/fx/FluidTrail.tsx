import { useEffect, useRef } from 'react'

/**
 * 鼠标流体丝带拖尾(致敬 3D 动效站的鼠标跟随):
 * 沿鼠标轨迹绘制青→紫→粉渐变发光丝带,头粗尾细、透明度衰减;
 * 快速划动时沿途散落微小粒子。interval 驱动,不依赖 rAF。
 */
export function FluidTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let w = 0
    let h = 0
    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // 轨迹点:记录最近 N 个鼠标位置
    const MAX = 26
    const trail: { x: number; y: number }[] = []
    let mx = -999
    let my = -999
    let moving = 0

    interface Mote {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      hue: number
    }
    const motes: Mote[] = []

    const onMove = (e: PointerEvent) => {
      mx = e.clientX
      my = e.clientY
      moving = 1
    }

    window.addEventListener('pointermove', onMove, { passive: true })

    // 渐变色:随位置比例取 青→紫→粉
    const hueAt = (t: number) => {
      if (t < 0.5) return 185 + (t * 2) * (265 - 185) // 青→紫
      return 265 + ((t - 0.5) * 2) * (330 - 265) // 紫→粉
    }

    const timer = window.setInterval(() => {
      ctx.clearRect(0, 0, w, h)

      // 采样轨迹(静止时不追加,丝带自然缩短)
      if (moving && mx > -900) {
        trail.push({ x: mx, y: my })
        if (trail.length > MAX) trail.shift()
        // 快速移动时散落粒子
        const last = trail[trail.length - 2]
        if (last) {
          const dx = mx - last.x
          const dy = my - last.y
          if (dx * dx + dy * dy > 400 && motes.length < 60) {
            motes.push({
              x: mx, y: my,
              vx: (Math.random() - 0.5) * 1.6,
              vy: (Math.random() - 0.5) * 1.6 - 0.3,
              life: 0,
              hue: hueAt(Math.random()),
            })
          }
        }
      } else if (trail.length) {
        trail.shift()
      }
      moving = 0

      // 画丝带:分段连线,宽度和透明度从头到尾衰减
      if (trail.length > 3) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        for (let i = 1; i < trail.length; i++) {
          const t = i / trail.length // 0 尾 → 1 头
          const p0 = trail[i - 1]
          const p1 = trail[i]
          const width = 1.5 + t * 7.5
          const alpha = t * t * 0.6
          const hue = hueAt(1 - t) // 头青尾粉
          ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${alpha.toFixed(3)})`
          ctx.lineWidth = width
          ctx.shadowColor = `hsla(${hue}, 90%, 65%, 0.8)`
          ctx.shadowBlur = 12 * t
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.stroke()
        }
        ctx.shadowBlur = 0
      }

      // 散落粒子
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i]
        m.life++
        m.x += m.vx
        m.y += m.vy
        if (m.life > 34) {
          motes.splice(i, 1)
          continue
        }
        const a = 1 - m.life / 34
        ctx.fillStyle = `hsla(${m.hue}, 90%, 75%, ${(a * 0.55).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(m.x, m.y, 1.2 + a * 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }, 16)

    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[9989]" style={{ opacity: 0.65 }} aria-hidden />
}
