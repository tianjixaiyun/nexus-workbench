import { useEffect, useRef, useState } from 'react'
import { Eraser, PenLine, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useNoteStore } from '@/stores/noteStore'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

/**
 * 手绘图板(Excalidraw / obsidian-excalidraw 灵感,自研实现):
 * 涂鸦一张草图,一键存成便签(图片以 dataURL 存进笔记内容,markdown 渲染)。
 */

const W = 1280
const H = 800
const COLORS = ['#0f172a', '#0891b2', '#7c3aed', '#e11d48', '#f59e0b']

export function SketchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useNoteStore((s) => s.add)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const undoStack = useRef<string[]>([])
  const [color, setColor] = useState(COLORS[0])
  const [eraser, setEraser] = useState(false)
  const [width, setWidth] = useState(4)
  const [canUndo, setCanUndo] = useState(false)

  const ctx2d = () => canvasRef.current?.getContext('2d') ?? null

  const resetCanvas = () => {
    const ctx = ctx2d()
    if (!ctx) return
    ctx.fillStyle = '#fffdf8'
    ctx.fillRect(0, 0, W, H)
  }

  // 打开时铺一张米白纸底
  useEffect(() => {
    if (open) {
      resetCanvas()
      undoStack.current = []
      setCanUndo(false)
      setEraser(false)
    }
  }, [open])

  const pushUndo = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    undoStack.current.push(canvas.toDataURL('image/png'))
    if (undoStack.current.length > 12) undoStack.current.shift()
    setCanUndo(true)
  }

  const undo = () => {
    const data = undoStack.current.pop()
    const ctx = ctx2d()
    if (!data || !ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(img, 0, 0)
    }
    img.src = data
    setCanUndo(undoStack.current.length > 0)
  }

  const pos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pushUndo()
    drawing.current = true
    last.current = pos(e)
  }

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = ctx2d()
    if (!ctx || !last.current) return
    const p = pos(e)
    ctx.strokeStyle = eraser ? '#fffdf8' : color
    ctx.lineWidth = eraser ? width * 4 : width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }

  const onUp = () => {
    drawing.current = false
    last.current = null
  }

  const insertAsNote = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const now = new Date()
    const title = `手绘 ${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    void add({ title, content: `![手绘](${dataUrl})` })
    toast.success('手绘已存为便签', title)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="手绘便签">
      <div className="flex flex-col gap-3">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full cursor-crosshair rounded-2xl border border-line-2 bg-[#fffdf8] touch-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
        <div className="flex flex-wrap items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c)
                setEraser(false)
              }}
              className={cn(
                'h-6 w-6 cursor-pointer rounded-full border transition-all',
                !eraser && color === c ? 'scale-110 border-accent ring-2 ring-accent ring-offset-2 ring-offset-ink-900' : 'border-line-3 opacity-80 hover:opacity-100',
              )}
              style={{ background: c }}
              aria-label={`颜色 ${c}`}
            />
          ))}
          <button
            type="button"
            onClick={() => setEraser((v) => !v)}
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors',
              eraser ? 'bg-accent-soft text-accent' : 'text-txt-muted hover:bg-surface-2 hover:text-txt-secondary',
            )}
          >
            <Eraser size={13} />
            橡皮
          </button>
          <input
            type="range"
            min={2}
            max={14}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-24 accent-cyan-400"
            title="笔迹粗细"
          />
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={undo} disabled={!canUndo}>
              <PenLine size={13} />
              撤销
            </Button>
            <Button size="sm" variant="outline" onClick={resetCanvas}>
              <Trash2 size={13} />
              清空
            </Button>
            <Button size="sm" variant="primary" onClick={insertAsNote}>
              存为便签
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-txt-muted">草图会以图片形式存进一条新便签,笔记卡片与详情里直接可见。</p>
      </div>
    </Modal>
  )
}
