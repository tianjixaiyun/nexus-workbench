import { create } from 'zustand'
import { isCloudMode, supabase } from '@/lib/config'
import { LOCAL_USER_ID } from '@/lib/data/localAdapter'

export interface AuthUser {
  id: string
  email?: string
}

interface AuthState {
  user: AuthUser | null
  /** 是否完成初始会话检查(云端模式需要等这个) */
  ready: boolean
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

/** 把 Supabase 的英文报错翻译成人话 */
function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return '邮箱或密码错误'
  if (m.includes('user already registered')) return '该邮箱已注册,请直接登录'
  if (m.includes('email not confirmed')) return '邮箱尚未验证,请先到邮箱点击确认链接'
  if (m.includes('password should be at least')) return '密码至少需要 6 位'
  if (m.includes('unable to validate email') || m.includes('invalid email')) return '邮箱格式不正确'
  if (m.includes('rate limit')) return '操作太频繁,请稍后再试'
  if (m.includes('failed to fetch')) return '网络连接失败,请检查网络或 Supabase 配置'
  return message
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,

  async init() {
    if (!isCloudMode || !supabase) {
      set({ user: { id: LOCAL_USER_ID }, ready: true })
      return
    }
    const { data } = await supabase.auth.getSession()
    const sUser = data.session?.user
    set({
      user: sUser ? { id: sUser.id, email: sUser.email } : null,
      ready: true,
    })
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') set({ user: null })
      else if (session?.user) set({ user: { id: session.user.id, email: session.user.email } })
    })
  },

  async signIn(email, password) {
    const { error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) throw new Error(mapAuthError(error.message))
  },

  async signUp(email, password) {
    const { data, error } = await supabase!.auth.signUp({ email, password })
    if (error) throw new Error(mapAuthError(error.message))
    // 项目开启"邮箱确认"时,注册后没有会话,需要用户先去收确认邮件
    if (data.user && !data.session) {
      throw new Error('注册成功!请先到邮箱点击确认链接,再回来登录')
    }
  },

  async signOut() {
    if (isCloudMode && supabase) await supabase.auth.signOut()
  },
}))
