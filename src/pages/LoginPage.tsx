import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { activeCloudConnection, isCloudMode } from '@/lib/config'
import { useAuthStore } from '@/stores/authStore'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const { user, ready, signIn, signUp, init, error: sessionError } = useAuthStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => { void init() }, [init])

  // 本地模式不需要登录;已登录则直接进主界面
  if (!isCloudMode) return <Navigate to="/home" replace />
  if (ready && user) return <Navigate to="/home" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)
    try {
      if (mode === 'login') await signIn(email.trim(), password)
      else {
        const result = await signUp(email.trim(), password)
        if (result.needsEmailConfirmation) {
          setNotice('注册请求已提交。若该邮箱可注册，请到邮箱点击确认链接，再回来登录。')
          setPassword('')
          return
        }
      }
      setPassword('')
      navigate('/home', { replace: true })
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
            {activeCloudConnection && <p className="mt-2 break-all text-[11px] text-txt-muted">当前项目：{new URL(activeCloudConnection.url).hostname}</p>}
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
                  setNotice('')
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
              <label htmlFor="cloud-login-email" className="mb-1.5 block text-xs text-txt-secondary">邮箱</label>
              <Input
                id="cloud-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="cloud-login-password" className="mb-1.5 block text-xs text-txt-secondary">密码</label>
              <Input
                id="cloud-login-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {(error || sessionError) && (
              <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-xs leading-relaxed text-danger">
                {error || sessionError}
              </p>
            )}

            {notice && <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-xs leading-relaxed text-success">{notice}</p>}

            <Button type="submit" variant="primary" className="mt-1 w-full justify-center" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : mode === 'login' ? '登录' : '注册'}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-txt-muted">
          数据由当前连接的 Supabase 项目及其权限策略管理
        </p>
        <p className="mt-3 text-center text-xs"><Link to="/settings" className="text-accent hover:underline">返回设置 · 检查或更换云端连接</Link></p>
      </div>
    </div>
  )
}
