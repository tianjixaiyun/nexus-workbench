import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

interface ChartProps {
  option: echarts.EChartsCoreOption
  className?: string
}

/** ECharts 轻封装:自动初始化、响应容器尺寸、option 变化时全量更新 */
export function Chart({ option, className }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = echarts.init(el)
    chartRef.current = chart
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(el)
    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={containerRef} className={className} />
}

export interface ChartPalette {
  accent: string
  accent2: string
  success: string
  warn: string
  danger: string
  muted: string
  label: string
  legend: string
  grid: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  areaFrom: string
  areaTo: string
}

/** 图表配色:随主题切换 */
export function chartPalette(light: boolean): ChartPalette {
  if (light) {
    return {
      accent: '#0891b2',
      accent2: '#7c3aed',
      success: '#059669',
      warn: '#d97706',
      danger: '#e11d48',
      muted: '#94a3b8',
      label: '#64748b',
      legend: '#475569',
      grid: 'rgba(15, 23, 42, 0.08)',
      tooltipBg: 'rgba(255, 255, 255, 0.97)',
      tooltipBorder: 'rgba(15, 23, 42, 0.1)',
      tooltipText: '#0f172a',
      areaFrom: 'rgba(8, 145, 178, 0.22)',
      areaTo: 'rgba(8, 145, 178, 0)',
    }
  }
  return {
    accent: '#22d3ee',
    accent2: '#8b5cf6',
    success: '#34d399',
    warn: '#f59e0b',
    danger: '#f43f5e',
    muted: '#94a3b8',
    label: '#64748b',
    legend: '#94a3b8',
    grid: 'rgba(255, 255, 255, 0.05)',
    tooltipBg: 'rgba(16, 24, 40, 0.95)',
    tooltipBorder: 'rgba(255, 255, 255, 0.1)',
    tooltipText: '#e2e8f0',
    areaFrom: 'rgba(34, 211, 238, 0.25)',
    areaTo: 'rgba(34, 211, 238, 0)',
  }
}

/** 深色主题下通用的 ECharts 基础样式(坐标轴、tooltip 等),随主题切换 */
export function darkChartBase(light: boolean) {
  const pal = chartPalette(light)
  return {
    textStyle: { color: pal.legend },
    tooltip: {
      backgroundColor: pal.tooltipBg,
      borderColor: pal.tooltipBorder,
      textStyle: { color: pal.tooltipText, fontSize: 12 },
    },
    gridCommon: pal,
  }
}
