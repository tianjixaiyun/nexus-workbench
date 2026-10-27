import { create } from 'zustand'
import { isCloudMode, supabase } from '@/lib/config'
import { LOCAL_USER_ID } from '@/lib/data/localAdapter'
import { resetCloudData, stopRealtime } from '@/lib/data/realtime'

export interface AuthUser { id: string; email?: string }
interface AuthState {
  user: AuthUser | null
  ready: boolean
  error: string | null
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
}
function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return '邮箱或密码错误'
  if (m.includes('user already registered')) return '该邮箱已注册，请直接登录'
  if (m.includes('email not confirmed')) return '邮箱尚未验证，请先到邮箱点击确认链接'
  if (m.includes('password should be at least')) return '密码至少需要 6 位'
  if (m.includes('unable to validate email') || m.includes('invalid email')) return '邮箱格式不正确'
  if (m.includes('rate limit')) return '操作太频繁，请稍后再试'
  if (m.includes('fetch') || m.includes('network')) return '网络连接失败，请检查网络或云端连接设置'
  return message
}
let initPromise: Promise<void> | null = null
let subscription: { unsubscribe: () => void } | null = null
let revision = 0

export const useAuthStore = create<AuthState>((set, get) => {
  const applyUser = (user: AuthUser | null) => {
    if (get().user?.id !== user?.id) { stopRealtime(); resetCloudData() }
    set({ user, error: null })
  }
  return {
    user: null, ready: false, error: null,
    async init() {
      if (!isCloudMode || !supabase) { set({ user: { id: LOCAL_USER_ID }, ready: true, error: null }); return }
      if (initPromise) return initPromise
      if (get().ready && !get().error) return
      if (!subscription) {
        subscription = supabase.auth.onAuthStateChange((_event, session) => {
          revision++
          const user = session?.user
          applyUser(user ? { id: user.id, email: user.email } : null)
          set({ ready: true })
        }).data.subscription
      }
      const epoch = revision
      initPromise = (async () => {
        try {
          const { data, error } = await supabase.auth.getSession()
          if (error) throw error
          if (epoch === revision) {
            const user = data.session?.user
            applyUser(user ? { id: user.id, email: user.email } : null)
          }
        } catch (cause) {
          if (epoch === revision) set({ error: mapAuthError(cause instanceof Error ? cause.message : '会话检查失败，请重试或检查连接设置') })
        } finally { set({ ready: true }); initPromise = null }
      })()
      return initPromise
    },
    async signIn(email, password) {
      if (!supabase) throw new Error('请先配置云端连接')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(mapAuthError(error.message))
      if (data.session?.user) { revision++; applyUser({ id: data.session.user.id, email: data.session.user.email }); set({ ready: true }) }
    },
    async signUp(email, password) {
      if (!supabase) throw new Error('请先配置云端连接')
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw new Error(mapAuthError(error.message))
      if (data.session?.user) { revision++; applyUser({ id: data.session.user.id, email: data.session.user.email }); set({ ready: true }) }
      return { needsEmailConfirmation: !data.session }
    },
    async signOut() {
      if (isCloudMode && supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) throw new Error(mapAuthError(error.message))
      }
      revision++; applyUser(null); set({ ready: true })
    },
  }
})
