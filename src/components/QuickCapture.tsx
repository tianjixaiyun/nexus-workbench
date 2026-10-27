import { Zap } from 'lucide-react'
export { QuickCapture } from '@/features/tasks/TaskCaptureDialog'

/** 右下角浮动捕捉按钮(全局) */
export function QuickCaptureFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="neon-gradient-bg glow-cyan fixed right-6 bottom-6 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-white transition-transform hover:scale-110"
      title="快速捕捉 (Q)"
      aria-label="快速捕捉"
    >
      <Zap size={20} />
    </button>
  )
}
