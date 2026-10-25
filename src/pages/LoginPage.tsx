import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { isCloudMode } from '@/lib/config'
import { useAuthStore } from '@/stores/authStore'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const { user, ready, signIn, signUp } = useAuthStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 本地模式不需要登录;已登录则直接进主界面
  if (!isCloudMode) return <Navigate to="/" replace />
  if (ready && user) return <Navigate to="/" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') await signIn(email.trim(), password)
      else await signUp(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '出错了,请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="neon-gradient-bg glow-cyan flex h-14 w-14 items-center justify-center rounded-2xl">
            <Zap size={26} className="text-white" />
          </div>
          <div className="text-center">
            <p className="neon-gradient-text text-2xl font-bold tracking-[0.3em]">NEXUS</p>
            <p className="mt-1 text-xs text-txt-muted">个人工作台 · 云端同步</p>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="mb-5 flex rounded-xl border border-line-2 bg-surface-1 p-1">
            {(
              [
                ['login', '登录'],
                ['register', '注册'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setMode(value)
                  setError('')
                }}
                className={cn(
                  'flex-1 cursor-pointer rounded-lg py-1.5 text-sm transition-all',
                  mode === value ? 'bg-surface-4 text-txt-primary' : 'text-txt-muted hover:text-txt-secondary',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs text-txt-secondary">邮箱</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-txt-secondary">密码</label>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <p className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-xs leading-relaxed text-danger">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" className="mt-1 w-full justify-center" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : mode === 'login' ? '登录' : '注册'}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-txt-muted">
          数据存储在你自己的 Supabase 项目中,仅本人可见
        </p>
      </div>
    </div>
  )
}
