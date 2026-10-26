import { useEffect, useRef } from 'react'
import type { Note } from '@/lib/data/types'

/**
 * 笔记关系图谱(Obsidian Graph View 灵感,自研 canvas 力导向):
 * 节点 = 笔记,边 = [[双链]] 引用;拖拽节点,点按打开笔记。
 * 力模拟与绘制用 interval 驱动(不依赖 rAF,与全站约定一致)。
 */

interface Node {
  id: string
  title: string
  x: number
  y: number
  vx: number
  vy: number
  degree: number
  fixed: boolean
}

interface Edge {
  a: number
  b: number
}

export function NoteGraph({ notes, onOpen }: { notes: Note[]; onOpen: (note: Note) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const nodesRef = useRef<Node[]>([])
  const edgesRef = useRef<Edge[]>([])
  const dragRef = useRef<{ index: number; moved: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')!
    const W = Math.max(320, wrap.clientWidth)
    const H = 460
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // 建图:节点最多 80 个(大库取最新的),边按 [[标题]] 匹配
    const pool = [...notes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 80)
    const byTitle = new Map<string, number>()
    const nodes: Node[] = pool.map((n, i) => {
      const a = (i / Math.max(1, pool.length)) * Math.PI * 2
      const r = Math.min(W, H) * 0.36
      return {
        id: n.id,
        title: n.title || '无标题',
        x: W / 2 + Math.cos(a) * r + (Math.sin(i * 7) * 14),
        y: H / 2 + Math.sin(a) * r,
        vx: 0,
        vy: 0,
        degree: 0,
        fixed: false,
      }
    })
    pool.forEach((n, i) => byTitle.set(n.title, i))
    const edges: Edge[] = []
    for (let i = 0; i < pool.length; i++) {
      const matches = pool[i].content.match(/\[\[([^\[\]]+)\]\]/g) ?? []
      for (const m of matches) {
        const title = m.slice(2, -2)
        const j = byTitle.get(title)
        if (j !== undefined && j !== i) {
          edges.push({ a: i, b: j })
          nodes[i].degree++
          nodes[j].degree++
        }
      }
    }
    nodesRef.current = nodes
    edgesRef.current = edges

    let alpha = 1
    const timer = window.setInterval(() => {
      // 斥力(简化 O(n²),n≤80 足够快)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          let dx = a.x - b.x
          let dy = a.y - b.y
          let d2 = dx * dx + dy * dy
          if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1 }
          const d = Math.sqrt(d2)
          const rep = (1800 * alpha) / d2
          const fx = (dx / d) * rep
          const fy = (dy / d) * rep
          a.vx += fx; a.vy += fy
          b.vx -= fx; b.vy -= fy
        }
      }
      // 边弹簧
      for (const e of edges) {
        const a = nodes[e.a]
        const b = nodes[e.b]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.max(1, Math.hypot(dx, dy))
        const rest = 120
        const f = ((d - rest) / d) * 0.015 * alpha
        a.vx += dx * f; a.vy += dy * f
        b.vx -= dx * f; b.vy -= dy * f
      }
      // 向心力 + 积分
      for (const n of nodes) {
        n.vx += (W / 2 - n.x) * 0.0015 * alpha
        n.vy += (H / 2 - n.y) * 0.0015 * alpha
        if (n.fixed) { n.vx = 0; n.vy = 0; continue }
        n.vx *= 0.85
        n.vy *= 0.85
        n.x += Math.max(-12, Math.min(12, n.vx))
        n.y += Math.max(-12, Math.min(12, n.vy))
        n.x = Math.max(30, Math.min(W - 30, n.x))
        n.y = Math.max(24, Math.min(H - 24, n.y))
      }
      alpha = Math.max(0.35, alpha * 0.995)

      // 绘制
      ctx.clearRect(0, 0, W, H)
      ctx.lineWidth = 1
      for (const e of edges) {
        const a = nodes[e.a]
        const b = nodes[e.b]
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)'
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
      for (const n of nodes) {
        const r = 5 + Math.min(8, n.degree * 1.6)
        const glow = n.degree > 0
        if (glow) {
          ctx.shadowColor = 'rgba(34, 211, 238, 0.55)'
          ctx.shadowBlur = 12
        }
        ctx.fillStyle = glow ? 'rgba(103, 232, 249, 0.9)' : 'rgba(148, 163, 184, 0.55)'
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        if (n.degree > 0 || nodes.length <= 30) {
          ctx.fillStyle = 'rgba(226, 232, 240, 0.85)'
          ctx.font = '10px ui-monospace, monospace'
          ctx.textAlign = 'center'
          ctx.fillText(n.title.slice(0, 14), n.x, n.y + r + 12)
        }
      }
    }, 16)

    return () => clearInterval(timer)
  }, [notes])

  const pick = (e: React.PointerEvent): number => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * canvas.width / (Math.min(window.devicePixelRatio || 1, 2))
    const y = ((e.clientY - r.top) / r.height) * canvas.height / (Math.min(window.devicePixelRatio || 1, 2))
    let best = -1
    let bestD = 24
    nodesRef.current.forEach((n, i) => {
      const d = Math.hypot(n.x - x, n.y - y)
      if (d < bestD) { bestD = d; best = i }
    })
    return best
  }

  const onDown = (e: React.PointerEvent) => {
    const i = pick(e)
    if (i >= 0) {
      dragRef.current = { index: i, moved: 0 }
      nodesRef.current[i].fixed = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    const scale = canvas.width / (Math.min(window.devicePixelRatio || 1, 2)) / r.width
    const n = nodesRef.current[d.index]
    const nx = ((e.clientX - r.left) * scale)
    const ny = ((e.clientY - r.top) * scale)
    d.moved += Math.hypot(nx - n.x, ny - n.y)
    n.x = Math.max(30, Math.min(canvas.width / Math.min(window.devicePixelRatio || 1, 2) - 30, nx))
    n.y = Math.max(24, Math.min(canvas.height / Math.min(window.devicePixelRatio || 1, 2) - 24, ny))
  }

  const onUp = () => {
    const d = dragRef.current
    if (d) {
      const n = nodesRef.current[d.index]
      n.fixed = false
      if (d.moved < 5) {
        const note = notes.find((x) => x.id === n.id)
        if (note) onOpen(note)
      }
    }
    dragRef.current = null
  }

  return (
    <div ref={wrapRef} className="relative">
      <canvas
        ref={canvasRef}
        className="w-full cursor-grab rounded-2xl border border-line-2 bg-ink-950/60 touch-none"
        style={{ height: 460 }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
      <p className="mt-2 text-center text-[11px] text-txt-muted">
        拖拽整理布局 · 点按节点打开笔记 · 光晕大小 = 被引用次数(最多展示最近 80 篇)
      </p>
    </div>
  )
}
