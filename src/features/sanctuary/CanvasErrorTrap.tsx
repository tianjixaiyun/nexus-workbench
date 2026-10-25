// 临时诊断:R3F Canvas 内容出错时把错误写进标题栏(用完即删)
import { Component, type ReactNode } from 'react'

export class CanvasErrorTrap extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null }
  static getDerivedStateFromError(error: Error) {
    return { err: error.message }
  }
  componentDidCatch(error: Error) {
    document.title = `R3F: ${error.message}`.slice(0, 140)
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
