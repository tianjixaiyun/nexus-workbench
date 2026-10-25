import { useNavigate } from 'react-router'
import { Magnetic } from '@/components/fx/micro'
import { ScrambleText } from '@/components/fx/micro'

/**
 * 深海 404:你在 -404m 撞见了一片不存在的海域。
 * 上升气泡 + 乱码解码 + 回到水面。
 */
export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a2036] via-[#051426] to-[#020a16] text-white">
      {/* 上升气泡 */}
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full border border-cyan-200/30"
          style={{
            left: `${5 + i * 6.6 + Math.sin(i * 2.3) * 3}%`,
            bottom: '-30px',
            width: 5 + (i % 4) * 5,
            height: 5 + (i % 4) * 5,
            animation: `nexus-404-rise ${2600 + i * 260}ms ease-in ${i * 240}ms infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes nexus-404-rise {
          0% { transform: translateY(0); opacity: 0 }
          12% { opacity: .8 }
          100% { transform: translateY(-88vh); opacity: 0 }
        }
      `}</style>

      <p className="font-mono text-[11px] tracking-[0.45em] text-cyan-200/70">
        <ScrambleText text="DEPTH -404M · 信号丢失" delay={200} />
      </p>
      <h1 className="mt-6 font-mono text-8xl font-bold tracking-tight text-white/95 md:text-9xl" style={{ fontFamily: 'Georgia, serif' }}>
        404
      </h1>
      <p className="mt-5 max-w-md px-6 text-center text-sm leading-relaxed text-white/70">
        你潜到了一片<strong className="text-cyan-200">不存在的海域</strong>。
        这里的水太深,连鲸都不会经过——跟紧气泡,浮回海面吧。
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Magnetic>
          <button
            onClick={() => navigate('/')}
            className="cursor-pointer rounded-full bg-gradient-to-r from-sky-300 to-cyan-200 px-8 py-3 text-sm font-semibold text-sky-950 shadow-[0_8px_30px_rgba(125,211,252,0.35)] transition-transform hover:scale-[1.04]"
          >
            浮回海面 ↑
          </button>
        </Magnetic>
        <Magnetic>
          <button
            onClick={() => navigate('/home')}
            className="cursor-pointer rounded-full border border-white/30 px-8 py-3 text-sm text-white/85 transition-colors hover:border-white/60"
          >
            回工作台
          </button>
        </Magnetic>
      </div>
      <p className="absolute bottom-6 font-mono text-[10px] tracking-[0.35em] text-white/25">
        NEXUS · DIGITAL OCEAN · NO SIGNAL HERE
      </p>
    </div>
  )
}
