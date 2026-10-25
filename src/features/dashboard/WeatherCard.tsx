import { useCallback, useEffect, useState } from 'react'
import { CloudSun, Droplets, MapPin, RefreshCw, Wind } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSettingsStore } from '@/stores/settingsStore'

/** Open-Meteo 天气代码 → 中文描述 + emoji(WMO weather codes) */
function describeCode(code: number): { text: string; emoji: string } {
  if (code === 0) return { text: '晴', emoji: '☀️' }
  if (code <= 2) return { text: '多云', emoji: '⛅' }
  if (code === 3) return { text: '阴', emoji: '☁️' }
  if (code <= 48) return { text: '雾', emoji: '🌫️' }
  if (code <= 57) return { text: '毛毛雨', emoji: '🌦️' }
  if (code <= 67) return { text: '雨', emoji: '🌧️' }
  if (code <= 77) return { text: '雪', emoji: '❄️' }
  if (code <= 82) return { text: '阵雨', emoji: '🌧️' }
  if (code <= 86) return { text: '阵雪', emoji: '🌨️' }
  return { text: '雷雨', emoji: '⛈️' }
}

interface WeatherData {
  current: { temperature_2m: number; relative_humidity_2m: number; weather_code: number; wind_speed_10m: number }
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] }
}

const CACHE_KEY = 'nexus:weather-cache'
const CACHE_TTL = 30 * 60 * 1000

interface CacheEntry {
  ts: number
  cityName: string
  data: WeatherData
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`请求失败 (${res.status})`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export function WeatherCard() {
  const { weatherCity, setWeatherCity } = useSettingsStore()
  const [cityInput, setCityInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (city: { name: string; lat: number; lon: number }) => {
    // 30 分钟缓存
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as CacheEntry | null
      if (cached && cached.cityName === city.name && Date.now() - cached.ts < CACHE_TTL) {
        setData(cached.data)
        return
      }
    } catch {
      // 缓存损坏则忽略
    }
    setLoading(true)
    setError('')
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
        '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4'
      const json = (await fetchJson(url)) as WeatherData
      setData(json)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), cityName: city.name, data: json }))
    } catch {
      setError('天气获取失败,请检查网络')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (weatherCity) void load(weatherCity)
  }, [weatherCity, load])

  const searchCity = async () => {
    const name = cityInput.trim()
    if (!name) return
    setSearching(true)
    setError('')
    try {
      const json = (await fetchJson(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh&format=json`,
      )) as { results?: { name: string; latitude: number; longitude: number }[] }
      const hit = json.results?.[0]
      if (!hit) {
        setError('没找到这个城市,试试加上省份名')
        return
      }
      const city = { name: hit.name, lat: hit.latitude, lon: hit.longitude }
      setWeatherCity(city)
      setCityInput('')
      await load(city)
    } catch {
      setError('城市搜索失败,请检查网络')
    } finally {
      setSearching(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-txt-secondary">天气</p>
        {weatherCity && (
          <button
            onClick={() => {
              setWeatherCity(null)
              setData(null)
            }}
            className="flex cursor-pointer items-center gap-1 text-[11px] text-txt-muted hover:text-txt-secondary"
          >
            <MapPin size={11} />
            {weatherCity.name} · 更换
          </button>
        )}
      </div>

      {!weatherCity ? (
        <div className="flex flex-1 flex-col justify-center gap-2 py-4">
          <p className="text-xs text-txt-muted">输入城市名,看未来三天天气</p>
          <div className="flex gap-2">
            <Input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void searchCity()}
              placeholder="例如:上海"
              className="flex-1"
            />
            <Button variant="primary" onClick={() => void searchCity()} disabled={searching || !cityInput.trim()}>
              {searching ? <RefreshCw size={14} className="animate-spin" /> : '查询'}
            </Button>
          </div>
        </div>
      ) : loading && !data ? (
        <div className="flex flex-1 items-center justify-center py-10 text-txt-muted">
          <RefreshCw size={18} className="animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{describeCode(data.current.weather_code).emoji}</span>
              <div>
                <p className="font-mono text-3xl font-bold tabular-nums">{Math.round(data.current.temperature_2m)}°</p>
                <p className="text-xs text-txt-muted">{describeCode(data.current.weather_code).text}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-txt-muted">
              <span className="flex items-center gap-1">
                <Droplets size={11} />
                {data.current.relative_humidity_2m}%
              </span>
              <span className="flex items-center gap-1">
                <Wind size={11} />
                {Math.round(data.current.wind_speed_10m)} km/h
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {data.daily.time.slice(1, 4).map((day, i) => {
              const d = new Date(day)
              const w = describeCode(data.daily.weather_code[i + 1])
              return (
                <div key={day} className="rounded-xl bg-surface-1 px-2 py-2 text-center">
                  <p className="text-[11px] text-txt-muted">{['明天', '后天', '大后天'][i] ?? `${d.getMonth() + 1}/${d.getDate()}`}</p>
                  <p className="my-1 text-lg">{w.emoji}</p>
                  <p className="font-mono text-xs tabular-nums">
                    {Math.round(data.daily.temperature_2m_min[i + 1])}° ~ {Math.round(data.daily.temperature_2m_max[i + 1])}°
                  </p>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <CloudSun size={22} className="text-txt-muted" />
          <p className="text-xs text-txt-muted">{error || '加载中…'}</p>
          <Button size="sm" variant="outline" onClick={() => weatherCity && void load(weatherCity)}>
            重试
          </Button>
        </div>
      )}
      {weatherCity && error && <p className="mt-2 text-[11px] text-danger">{error}(显示的是缓存数据)</p>}
    </Card>
  )
}
