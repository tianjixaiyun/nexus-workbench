import { cn } from '@/lib/utils'

/**
 * 旋转文字环徽章(工作室站经典元素):
 * 沿圆环排列的文字匀速旋转,中心一枚箭头;
 * 点击平滑滚动到容器下一屏。SVG textPath 实现,零依赖。
 */
export function RotatingBadge({ text = '向下潜 · DIVE DEEPER · 向下潜 · DIVE DEEPER ·', size = 108, duration = 14, className, onClick, tone = 'rgba(255,255,255,0.85)' }: {
  text?: string
  size?: number
  duration?: number
  className?: string
  onClick?: () => void
  tone?: string
}) {
  const r = 44
  return (
    <button
      onClick={onClick}
      className={cn('group relative cursor-pointer select-none', className)}
      style={{ width: size, height: size }}
      aria-label={text}
      title="继续下潜"
    >
      <style>{`
        .nexus-badge-spin { animation: nexus-badge-rotate ${duration}s linear infinite }
        @keyframes nexus-badge-rotate { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      `}</style>
      <svg viewBox="0 0 100 100" className="nexus-badge-spin h-full w-full">
        <defs>
          <path id="nexus-badge-circle" d={`M 50,50 m -${r},0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 -${r * 2},0`} fill="none" />
        </defs>
        <text fontSize="8.2" letterSpacing="1.6" fill={tone} style={{ fontFamily: 'Georgia, serif', fontWeight: 600 }}>
          <textPath href="#nexus-badge-circle">{text}</textPath>
        </text>
      </svg>
      {/* 中心箭头:悬停时下沉 */}
      <span
        className="absolute inset-0 flex items-center justify-center text-xl transition-transform duration-300 group-hover:translate-y-1"
        style={{ color: tone }}
      >
        ↓
      </span>
      {/* 悬停微光 */}
      <span className="absolute inset-2 rounded-full opacity-0 shadow-[0_0_36px_rgba(124,231,255,0.35)] transition-opacity duration-300 group-hover:opacity-100" />
    </button>
  )
}
