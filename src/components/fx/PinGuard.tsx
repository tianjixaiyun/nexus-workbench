import { useCallback, useEffect, useState } from 'react'
import { Delete, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * PIN 隐私锁:自托管应用的标配隐私能力。
 * - 命令面板「隐私锁」开启:连续输入两次 4 位 PIN
 * - 开启后每次打开网站先解锁(sessionStorage 记住本次会话)
 * - 关闭需先验证原 PIN;数据仅存本地,这是隐私锁不是加密
 */

const LS_PIN = 'nexus-pin'
const SS_UNLOCKED = 'nexus-pin-unlocked'

const hasPin = () => Boolean(localStorage.getItem(LS_PIN))
const isUnlocked = () => sessionStorage.getItem(SS_UNLOCKED) === '1'

/** 数字键盘面板(锁屏与设置共用) */
function Pad({ title, error, onDone, onCancel }: {
  title: string
  error?: string
  onDone: (pin: string) => void
  onCancel?: () => void
}) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)

  const push = useCallback((d: string) => {
    setPin((p) => (p.length >= 4 ? p : p + d))
  }, [])

  useEffect(() => {
    if (pin.length === 4) {
      const t = setTimeout(() => onDone(pin), 140)
      return () => clearTimeout(t)
    }
  }, [pin, onDone])

  return (
    <div className={cn('flex w-64 flex-col items-center', shake && 'animate-[nexus-pin-shake_360ms_ease]')}>
      <style>{`@keyframes nexus-pin-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 75%{transform:translateX(7px)} }`}</style>
      <span className="neon-gradient-bg flex h-12 w-12 items-center justify-center rounded-2xl">
        <Lock size={20} className="text-white" />
      </span>
      <p className="mt-4 text-sm font-semibold text-txt-primary">{title}</p>
      <div className="mt-4 flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-3 w-3 rounded-full border transition-all duration-150',
              pin.length > i ? 'neon-gradient-bg border-transparent scale-110' : 'border-line-strong',
            )}
          />
        ))}
      </div>
      <p className="mt-2.5 h-4 text-[11px] text-danger">{error}</p>
      <div className="mt-2 grid grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => push(d)} className="h-12 w-16 cursor-pointer rounded-xl border border-line-2 bg-surface-1 font-mono text-lg text-txt-primary transition-all hover:border-accent hover:bg-surface-2 active:scale-95">
            {d}
          </button>
        ))}
        <button onClick={onCancel} className="h-12 w-16 cursor-pointer rounded-xl border border-line-2 bg-surface-1 text-xs text-txt-muted transition-all hover:border-danger hover:text-danger active:scale-95">
          取消
        </button>
        <button onClick={() => push('0')} className="h-12 w-16 cursor-pointer rounded-xl border border-line-2 bg-surface-1 font-mono text-lg text-txt-primary transition-all hover:border-accent hover:bg-surface-2 active:scale-95">
          0
        </button>
        <button onClick={() => { setPin((p) => p.slice(0, -1)); setShake(false) }} className="flex h-12 w-16 cursor-pointer items-center justify-center rounded-xl border border-line-2 bg-surface-1 text-txt-muted transition-all hover:border-accent active:scale-95">
          <Delete size={17} />
        </button>
      </div>
    </div>
  )
}

export function PinGuard() {
  // locked: 需要解锁 | setup1/setup2: 首次设置 | off: 无事发生
  const [mode, setMode] = useState<'off' | 'locked' | 'setup1' | 'setup2' | 'disable'>('off')
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (hasPin() && !isUnlocked()) setMode('locked')
    const setup = () => {
      setError('')
      setMode(hasPin() ? 'disable' : 'setup1')
    }
    window.addEventListener('nexus:pin-setup', setup)
    return () => window.removeEventListener('nexus:pin-setup', setup)
  }, [])

  const finishUnlock = () => {
    sessionStorage.setItem(SS_UNLOCKED, '1')
    setMode('off')
  }

  if (mode === 'off') return null

  return (
    <div className="fixed inset-0 z-[9996] flex items-center justify-center bg-ink-950/92 backdrop-blur-xl">
      {mode === 'locked' && (
        <Pad
          key={'lock-' + attempt}
          title="输入 PIN 解锁"
          error={error}
          onCancel={() => setError('')}
          onDone={(pin) => {
            if (atob(localStorage.getItem(LS_PIN) ?? '') === pin) finishUnlock()
            else {
              setError('PIN 不对,再试一次')
              setAttempt((a) => a + 1)
            }
          }}
        />
      )}
      {mode === 'setup1' && (
        <Pad
          title="设置 4 位 PIN"
          onDone={(pin) => { setFirstPin(pin); setMode('setup2') }}
          onCancel={() => setMode(hasPin() && !isUnlocked() ? 'locked' : 'off')}
        />
      )}
      {mode === 'setup2' && (
        <Pad
          title="再输一次确认"
          error={error}
          onDone={(pin) => {
            if (pin === firstPin) {
              localStorage.setItem(LS_PIN, btoa(pin))
              sessionStorage.setItem(SS_UNLOCKED, '1')
              setMode('off')
            } else {
              setError('两次不一致,重来')
              setMode('setup1')
            }
          }}
          onCancel={() => setMode(hasPin() && !isUnlocked() ? 'locked' : 'off')}
        />
      )}
      {mode === 'disable' && (
        <Pad
          key={'dis-' + attempt}
          title="输入原 PIN 关闭隐私锁"
          error={error}
          onDone={(pin) => {
            if (atob(localStorage.getItem(LS_PIN) ?? '') === pin) {
              localStorage.removeItem(LS_PIN)
              sessionStorage.removeItem(SS_UNLOCKED)
              setMode('off')
            } else {
              setError('PIN 不对')
              setAttempt((a) => a + 1)
            }
          }}
          onCancel={() => setMode(isUnlocked() ? 'off' : 'locked')}
        />
      )}
    </div>
  )
}
