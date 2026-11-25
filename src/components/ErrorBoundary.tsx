import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * 路由级错误边界:单个页面崩溃只影响当前页(其他页面照常可用),
 * 给出重试/回家/整页刷新三个出口,替代过去的整站白屏。
 * 懒加载 chunk 失效(版本更新后旧缓存引用旧文件名)也会在这里兜住。
 */
type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[nexus] 页面渲染错误:', error.message, info.componentStack)
  }

  override render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#0d1c31] px-8 text-center text-white">
        <p className="font-mono text-[11px] tracking-[0.3em] text-cyan-100/70">SIGNAL LOST · 页面触礁</p>
        <h1 className="text-2xl font-bold">这一页暂时打不开</h1>
        <p className="max-w-md text-sm leading-relaxed text-white/70">
          其他页面不受影响。通常是版本更新后的缓存残留，刷新即可恢复；
          反复出现请先到「数据看板」导出备份，再联系我们。
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="cursor-pointer rounded-full bg-gradient-to-r from-sky-300 to-cyan-200 px-6 py-2.5 text-sm font-semibold text-sky-950 transition-all hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-white"
          >
            重试本页
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = (import.meta.env.BASE_URL || '/') + 'home' }}
            className="cursor-pointer rounded-full border border-white/35 bg-white/10 px-6 py-2.5 text-sm text-white/90 backdrop-blur-md transition-all hover:border-white/60 focus-visible:outline-2 focus-visible:outline-white"
          >
            回到工作台
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-full px-4 py-2.5 text-sm text-white/60 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            整页刷新
          </button>
        </div>
      </div>
    )
  }
}
