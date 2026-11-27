import type { WeekStats } from './reflection'

/**
 * 周复盘分享图:纯 canvas 绘制,无第三方依赖。
 * buildWeekShareModel 负责把数据整形为可测试的纯文本模型,
 * downloadWeekShareImage 只管画布与下载,浏览器环境才可用。
 */

export interface WeekShareModel {
  title: string
  period: string
  /** 大数字统计:value 已转字符串,unit 是小字单位 */
  stats: { label: string; value: string; unit: string }[]
  comment: string
  brand: string
  /** 下载文件名(不含扩展名) */
  filename: string
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function buildWeekShareModel(week: WeekStats, comment: string, now = new Date()): WeekShareModel {
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const range = `本周 ${monday.getMonth() + 1}.${monday.getDate()}(${WEEKDAYS[monday.getDay()]}) - ${now.getMonth() + 1}.${now.getDate()}(${WEEKDAYS[now.getDay()]})`
  const dateKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return {
    title: '本周回顾',
    period: range,
    stats: [
      { label: '完成任务', value: String(week.tasksDone), unit: '个' },
      { label: '习惯打卡', value: String(week.habitCheckins), unit: '次' },
      { label: '专注时长', value: String(week.focusMinutes), unit: '分钟' },
      { label: '平均心情', value: week.moodAvg ? week.moodAvg.toFixed(1) : '—', unit: week.moodAvg ? '' : '未记录' },
    ],
    comment,
    brand: 'Nexus Workbench · 数字海洋工作台',
    filename: `周复盘-${dateKey}`,
  }
}

export function downloadWeekShareImage(model: WeekShareModel, documentRef: Pick<Document, 'createElement'> = document): void {
  const canvas = documentRef.createElement('canvas')
  const W = 1080
  const H = 1440
  const dpr = 1
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持 canvas 绘制')

  // 深色海洋背景
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#020617')
  bg.addColorStop(0.55, '#0b2942')
  bg.addColorStop(1, '#1b1240')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 顶部光斑氛围
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.08, 0, W * 0.5, H * 0.08, W * 0.7)
  glow.addColorStop(0, 'rgba(34, 211, 238, 0.22)')
  glow.addColorStop(1, 'rgba(34, 211, 238, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H * 0.6)

  const font = (size: number, weight = '400') => `${weight} ${size}px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'

  // 标题区
  ctx.fillStyle = '#67e8f9'
  ctx.font = font(30, '600')
  ctx.fillText('WEEKLY REVIEW', W / 2, 170)
  ctx.fillStyle = '#f1f5f9'
  ctx.font = font(76, '700')
  ctx.fillText(model.title, W / 2, 270)
  ctx.fillStyle = '#94a3b8'
  ctx.font = font(28)
  ctx.fillText(model.period, W / 2, 330)

  // 统计卡
  const cardW = 216
  const gap = 26
  const total = model.stats.length * cardW + (model.stats.length - 1) * gap
  const startX = (W - total) / 2
  const cardY = 430
  const cardH = 300
  model.stats.forEach((stat, i) => {
    const x = startX + i * (cardW + gap)
    ctx.fillStyle = 'rgba(15, 34, 56, 0.72)'
    roundRect(ctx, x, cardY, cardW, cardH, 28)
    ctx.fill()
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.25)'
    ctx.lineWidth = 2
    roundRect(ctx, x, cardY, cardW, cardH, 28)
    ctx.stroke()
    ctx.fillStyle = '#94a3b8'
    ctx.font = font(26)
    ctx.fillText(stat.label, x + cardW / 2, cardY + 84)
    ctx.fillStyle = '#f1f5f9'
    ctx.font = font(72, '700')
    ctx.fillText(stat.value, x + cardW / 2, cardY + 180)
    if (stat.unit) {
      ctx.fillStyle = '#67e8f9'
      ctx.font = font(24)
      ctx.fillText(stat.unit, x + cardW / 2, cardY + 236)
    }
  })

  // 一句话总结
  ctx.fillStyle = 'rgba(15, 34, 56, 0.72)'
  roundRect(ctx, 120, 810, W - 240, 330, 28)
  ctx.fill()
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)'
  roundRect(ctx, 120, 810, W - 240, 330, 28)
  ctx.stroke()
  ctx.fillStyle = '#a5b4fc'
  ctx.font = font(26)
  ctx.fillText('— 本周一句话 —', W / 2, 880)
  ctx.fillStyle = '#e2e8f0'
  ctx.font = font(30, '500')
  wrapText(ctx, model.comment, W / 2, 950, W - 320, 52)

  // 品牌 footer
  ctx.fillStyle = '#64748b'
  ctx.font = font(24)
  ctx.fillText(model.brand, W / 2, H - 110)
  ctx.fillStyle = 'rgba(103, 232, 249, 0.5)'
  ctx.fillRect(W / 2 - 60, H - 80, 120, 3)

  canvas.toBlob((blob) => {
    if (!blob) throw new Error('分享图导出失败')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${model.filename}.png`
    a.click()
    URL.revokeObjectURL(url)
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, startY: number, maxWidth: number, lineHeight: number): void {
  let line = ''
  let y = startY
  for (const ch of text) {
    if (ch === '\n' || ctx.measureText(line + ch).width > maxWidth) {
      ctx.fillText(line, cx, y)
      line = ch === '\n' ? '' : ch
      y += lineHeight
    } else {
      line += ch
    }
  }
  if (line) ctx.fillText(line, cx, y)
}
