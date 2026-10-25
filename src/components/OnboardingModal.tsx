import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { seedSampleData } from '@/lib/sample'
import { useGoalStore } from '@/stores/goalStore'
import { useHabitStore } from '@/stores/habitStore'
import { useLinkStore } from '@/stores/linkStore'
import { useNoteStore } from '@/stores/noteStore'
import { useTaskStore } from '@/stores/taskStore'

const KEY = 'nexus:onboarded'

/** 首次打开的欢迎引导:可一键载入示例数据,立刻看到完整工作台 */
export function OnboardingModal() {
  const [ready, setReady] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')

  useEffect(() => {
    // 等所有 store 加载完再判断是否全空
    const t = setTimeout(() => {
      const empty =
        useTaskStore.getState().tasks.length === 0 &&
        useNoteStore.getState().notes.length === 0 &&
        useHabitStore.getState().habits.length === 0 &&
        useGoalStore.getState().goals.length === 0 &&
        useLinkStore.getState().links.length === 0
      setShouldShow(empty && localStorage.getItem(KEY) !== '1')
      setReady(true)
    }, 600)
    return () => clearTimeout(t)
  }, [])

  const finish = () => {
    localStorage.setItem(KEY, '1')
    setShouldShow(false)
  }

  const loadSample = async () => {
    setBusy(true)
    try {
      setDone(await seedSampleData())
      setTimeout(finish, 900)
    } finally {
      setBusy(false)
    }
  }

  if (!ready || !shouldShow) return null

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="neon-gradient-bg glow-cyan flex h-14 w-14 items-center justify-center rounded-2xl">
            <Zap size={26} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold">
            欢迎来到 <span className="neon-gradient-text">NEXUS</span>
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-txt-secondary">
            任务 · 目标 · 习惯 · 专注 · 笔记 · 数据,一体的个人效率工作台。
            现在还是一片空白 —— 要不要装点示例数据,立刻看看它成型后的样子?
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          {[
            ['Q', '快速捕捉'],
            ['1-9', '切换页面'],
            ['A', '智能助手'],
            ['Ctrl K', '搜索一切'],
          ].map(([k, d]) => (
            <div key={k} className="rounded-xl border border-line-2 bg-surface-1 px-3 py-2.5 text-center">
              <kbd className="font-mono text-[11px] text-accent">{k}</kbd>
              <p className="mt-1 text-txt-secondary">{d}</p>
            </div>
          ))}
        </div>

        {done && (
          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm text-success">
            <Sparkles size={14} />
            {done}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" className="justify-center px-6" onClick={loadSample} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            载入示例数据,马上体验
          </Button>
          <Button variant="outline" className="justify-center" onClick={finish}>
            从空白开始
          </Button>
        </div>
        <p className="mt-4 text-center text-[11px] text-txt-muted">
          示例数据随时可以删掉;记得在「数据看板」里导出备份
        </p>
      </div>
    </div>,
    document.body,
  )
}
