// R3F Canvas 出错时的错误边界:保留降级 UI,不再把错误写进标签页标题
import { Component, type ReactNode } from 'react'

export class CanvasErrorTrap extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null }
  static getDerivedStateFromError(error: Error) {
    return { err: error.message }
  }
  componentDidCatch(error: Error) {
    console.error('[sanctuary] R3F 场景渲染出错:', error)
  }
  render() {
    if (this.state.err) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-sm text-rose-300">
          场景渲染出错:{this.state.err}
        </div>
      )
    }
    return this.props.children
  }
}
