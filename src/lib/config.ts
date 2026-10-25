import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * 运行模式:
 * - 云端模式:在 .env 配置了 Supabase 地址与密钥,数据存云端,需要登录
 * - 本地模式(默认):零配置,数据存浏览器 IndexedDB
 */
export const isCloudMode = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export const supabase: SupabaseClient | null = isCloudMode
  ? createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!)
  : null
