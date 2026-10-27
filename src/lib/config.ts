import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readCloudConnection, validateCloudConnection, type CloudConnection, type ConnectionConfig } from './cloudConnection'

let selected: ConnectionConfig | null = null
let source: 'browser' | 'environment' | 'local' = 'local'
let error: string | null = null
try {
  selected = readCloudConnection()
  if (selected) source = 'browser'
  else {
    const url = import.meta.env.VITE_SUPABASE_URL
    const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
    if (url || publicKey) {
      selected = validateCloudConnection({ url: url ?? '', publicKey: publicKey ?? '' })
      source = 'environment'
    }
  }
} catch (cause) { error = cause instanceof Error ? cause.message : '无法读取云端连接配置' }

export const connectionSource = source
export const connectionError = error
export const activeCloudConnection: Readonly<CloudConnection> | null = selected?.mode === 'cloud' ? Object.freeze(selected) : null
export const isCloudMode = activeCloudConnection !== null
export const supabase: SupabaseClient | null = activeCloudConnection
  ? createClient(activeCloudConnection.url, activeCloudConnection.publicKey)
  : null
