import { create } from 'zustand'
import { normalizeDashboardLayout, type DashboardWidget } from '@/features/dashboard/dashboardLayout'

/** 应用设置(存 localStorage,本地/云端模式通用) */

export type Theme = 'dark' | 'light'

export interface WeatherCity {
  name: string
  lat: number
  lon: number
}

interface Settings {
  calmMode: boolean
  setCalmMode: (enabled: boolean) => boolean
  dashboardLayout: DashboardWidget[]
  setDashboardLayout: (layout: DashboardWidget[]) => void
  /** 主题:dark(默认)/ light */
  theme: Theme
  setTheme: (theme: Theme) => void
  /** 天气城市(未设置则不显示天气卡) */
  weatherCity: WeatherCity | null
  setWeatherCity: (city: WeatherCity | null) => void
  /** 本地模式:上次导出备份时间(ISO),null=从未导出 */
  lastExportAt: string | null
  markExported: () => void
  /** 首次打开时间(ISO,备份提醒的时间锚点) */
  firstOpenedAt: string | null
}

const KEY = 'nexus:settings'

type Stored = Pick<Settings, 'weatherCity' | 'theme' | 'lastExportAt' | 'firstOpenedAt' | 'dashboardLayout' | 'calmMode'>

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Stored>) : {}
    const stored: Stored = {
      calmMode: parsed.calmMode === true,
      weatherCity: parsed.weatherCity ?? null,
      dashboardLayout: normalizeDashboardLayout(parsed.dashboardLayout),
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      lastExportAt: parsed.lastExportAt ?? null,
      firstOpenedAt: parsed.firstOpenedAt ?? null,
    }
    if (!stored.firstOpenedAt) {
      // 首次打开:记下错点,供「N 天未备份」提醒计算
      stored.firstOpenedAt = new Date().toISOString()
      try {
        localStorage.setItem(KEY, JSON.stringify(stored))
      } catch {
        // 忽略:localStorage 不可用时提醒退化为永不触发
      }
    }
    return stored
  } catch {
    return {
      calmMode: false,
      weatherCity: null,
      dashboardLayout: normalizeDashboardLayout(null),
      theme: 'dark',
      lastExportAt: null,
      firstOpenedAt: new Date().toISOString(),
    }
  }
}

function persist(patch: Partial<Stored>): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...load(), ...patch }))
    return true
  } catch {
    return false
  }
}

/** 把主题落到 <html> 的 class 上(CSS 变量随 class 切换) */
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light')
  document.documentElement.style.colorScheme = theme
}

export function applyCalmMode(enabled: boolean) {
  document.documentElement.classList.toggle('nexus-calm', enabled)
}

const initial = load()

export const useSettingsStore = create<Settings>((set) => ({
  calmMode: initial.calmMode,
  setCalmMode(enabled) {
    const saved = persist({ calmMode: enabled })
    applyCalmMode(enabled)
    set({ calmMode: enabled })
    return saved
  },
  dashboardLayout: initial.dashboardLayout,
  setDashboardLayout(layout) {
    const dashboardLayout = normalizeDashboardLayout(layout)
    persist({ dashboardLayout })
    set({ dashboardLayout })
  },
  theme: initial.theme,
  setTheme(theme) {
    persist({ theme })
    applyTheme(theme)
    set({ theme })
  },
  weatherCity: initial.weatherCity,
  setWeatherCity(city) {
    persist({ weatherCity: city })
    set({ weatherCity: city })
  },
  lastExportAt: initial.lastExportAt,
  markExported() {
    const at = new Date().toISOString()
    persist({ lastExportAt: at })
    set({ lastExportAt: at })
  },
  firstOpenedAt: initial.firstOpenedAt,
}))

// 模块加载即应用,避免首帧闪错主题
applyTheme(initial.theme)

applyCalmMode(initial.calmMode)
