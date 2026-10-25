import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, ChevronDown, Lightbulb, Send, X } from 'lucide-react'
import { askAssistant, QUICK_QUESTIONS, type AssistantAnswer } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  prompt?: string
  actions?: [string, string][]
}

/** 本地智能助手抽屉:回答基于工作台实时数据,每条回答可查看其提示词 */
export function AssistantPanel({ open, onClose, onNavigate }: {
  open: boolean
  onClose: () => void
  onNavigate: (to: string) => void
}) {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      text: '你好!我读过你工作台里的全部数据 📊\n直接问我,或点下面的快问。\n(回答基于本地规则引擎 + 提示词模板,离线可用,每条都能查看提示词)',
    },
  ])
  const [input, setInput] = useState('')
  const [showPrompt, setShowPrompt] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, open, showPrompt])

  const send = (raw: string) => {
    const query = raw.trim()
    if (!query) return
    const answer: AssistantAnswer = askAssistant(query)
    setMsgs((m) => [
      ...m,
      { role: 'user', text: query },
      { role: 'assistant', text: answer.answer, prompt: answer.prompt, actions: answer.actions },
    ])
    setInput('')
  }

  return createPortal(
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-[55] flex w-full max-w-[430px] flex-col border-l border-line-2 bg-ink-900/95 shadow-2xl backdrop-blur-xl transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
      aria-hidden={!open}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-line-2 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="neon-gradient-bg flex h-8 w-8 items-center justify-center rounded-xl">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">问问助手</p>
            <p className="text-[10px] text-txt-muted">本地引擎 · 读你的实时数据 · 提示词全透明</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1.5 text-txt-muted transition-colors hover:bg-white/6 hover:text-txt-primary"
          aria-label="关闭助手"
        >
          <X size={17} />
        </button>
      </div>

      {/* 消息区 */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex flex-col gap-1', m.role === 'user' ? 'items-end' : 'items-start')}>
            <div
              className={cn(
                'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                m.role === 'user'
                  ? 'neon-gradient-bg rounded-br-md text-white'
                  : 'glass-card rounded-bl-md whitespace-pre-wrap',
              )}
            >
              {m.text}
            </div>
            {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {m.actions.map(([label, to]) => (
                  <button
                    key={label + to}
                    onClick={() => {
                      onNavigate(to)
                      onClose()
                    }}
                    className="cursor-pointer rounded-full border border-accent bg-accent-soft px-2.5 py-1 text-[11px] text-accent transition-opacity hover:opacity-80"
                  >
                    {label} →
                  </button>
                ))}
              </div>
            )}
            {m.role === 'assistant' && m.prompt && (
              <button
                onClick={() => setShowPrompt(showPrompt === i ? null : i)}
                className="flex cursor-pointer items-center gap-1 px-1 text-[10px] text-txt-muted transition-colors hover:text-accent"
              >
                <Lightbulb size={10} />
                {showPrompt === i ? '收起提示词' : '查看本条使用的提示词'}
                <ChevronDown size={10} className={cn('transition-transform', showPrompt === i && 'rotate-180')} />
              </button>
            )}
            {m.role === 'assistant' && m.prompt && showPrompt === i && (
              <pre className="max-w-full overflow-x-auto rounded-xl border border-line-2 bg-surface-1 p-3 font-mono text-[10px] leading-relaxed text-txt-secondary">
                {m.prompt}
              </pre>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 快问 */}
      <div className="flex gap-1.5 overflow-x-auto border-t border-line-2 px-4 py-2">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="shrink-0 cursor-pointer rounded-full border border-line-2 bg-surface-1 px-3 py-1 text-[11px] text-txt-secondary transition-colors hover:border-accent hover:text-accent"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 输入 */}
      <div className="flex items-center gap-2 border-t border-line-2 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send(input)
          }}
          placeholder="问我任何关于你数据的问题…"
          className="input-base flex-1"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim()}
          className="neon-gradient-bg flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40"
          aria-label="发送"
        >
          <Send size={15} />
        </button>
      </div>
    </div>,
    document.body,
  )
}
