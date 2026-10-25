import { create } from 'zustand'

/** 应用设置(存 localStorage,本地/云端模式通用) */

export type Theme = 'dark' | 'light'

export interface WeatherCity {
  name: string
  lat: number
  lon: number
}

interface Settings {
  /** 主题:dark(默认)/ light */
  theme: Theme
  setTheme: (theme: Theme) => void
  /** 天气城市(未设置则不显示天气卡) */
  weatherCity: WeatherCity | null
  setWeatherCity: (city: WeatherCity | null) => void
}

const KEY = 'nexus:settings'

type Stored = Pick<Settings, 'weatherCity' | 'theme'>

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { weatherCity: null, theme: 'dark' }
    const parsed = JSON.parse(raw) as Partial<Stored>
    return {
      weatherCity: parsed.weatherCity ?? null,
      theme: parsed.theme === 'light' ? 'light' : 'dark',
    }
  } catch {
    return { weatherCity: null, theme: 'dark' }
  }
}

function persist(patch: Partial<Stored>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...load(), ...patch }))
  } catch {
    // localStorage 满/被禁用时静默失败
  }
}

/** 把主题落到 <html> 的 class 上(CSS 变量随 class 切换) */
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light')
  document.documentElement.style.colorScheme = theme
}

const initial = load()

export const useSettingsStore = create<Settings>((set) => ({
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
}))

// 模块加载即应用,避免首帧闪错主题
applyTheme(initial.theme)
