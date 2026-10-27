import {
  Award, BadgeCheck, BarChart3, BookOpen, Cloud, Images, LayoutDashboard, ListChecks,
  NotebookPen, Settings, StickyNote, Target, Timer, Trash2, Users, Wallet, Waves, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react'

export type ModuleGroup = 'action' | 'record' | 'life' | 'showcase' | 'system'
export interface AppModule {
  group: ModuleGroup
  to: string
  label: string
  keywords: string
  icon: LucideIcon
  shortcut?: string
}

// 数字键保持原来的目的地，新增模块不再影响已有快捷键。
export const APP_MODULES: readonly AppModule[] = [
  { to: '/home', group: 'action', label: '工作台', keywords: 'home dashboard 主页 仪表盘', icon: LayoutDashboard, shortcut: '1' },
  { to: '/', group: 'showcase', label: '个人主页', keywords: 'ocean landing 首页 数字海洋 个人网站', icon: Waves, shortcut: '2' },
  { to: '/tasks', group: 'action', label: '任务中心', keywords: 'task todo 任务 待办 看板', icon: ListChecks, shortcut: '3' },
  { to: '/goals', group: 'action', label: '目标', keywords: 'goal target 目标 里程碑', icon: Target, shortcut: '4' },
  { to: '/habits', group: 'action', label: '习惯打卡', keywords: 'habit 习惯 打卡 签到', icon: Zap, shortcut: '5' },
  { to: '/focus', group: 'action', label: '专注番茄', keywords: 'pomodoro focus 番茄 专注 计时', icon: Timer, shortcut: '6' },
  { to: '/notes', group: 'record', label: '笔记便签', keywords: 'note 笔记 便签 双链', icon: StickyNote, shortcut: '7' },
  { to: '/stats', group: 'life', label: '数据看板', keywords: 'stats chart 统计 数据 图表', icon: BarChart3, shortcut: '8' },
  { to: '/links', group: 'record', label: '工具箱', keywords: 'link bookmark 工具 链接 网址', icon: Wrench, shortcut: '9' },
  { to: '/trash', group: 'system', label: '回收站', keywords: 'trash recycle 回收站 删除 恢复', icon: Trash2 },
  { to: '/about', group: 'showcase', label: '海员证', keywords: 'about profile 关于我 个人档案 海员证', icon: BadgeCheck },
  { to: '/memos', group: 'record', label: '碎碎念', keywords: 'memo 速记 灵感 时间线 flomo', icon: Cloud },
  { to: '/expense', group: 'life', label: '记账', keywords: 'expense money 记账 收支 账单', icon: Wallet },
  { to: '/contacts', group: 'life', label: '人脉', keywords: 'contact crm 人脉 联系人', icon: Users },
  { to: '/journal', group: 'record', label: '日志', keywords: 'journal 日志 自动日志 记录', icon: BookOpen },
  { to: '/achievements', group: 'life', label: '成就', keywords: 'achievement badge 成就 徽章 图鉴', icon: Award },
  { to: '/sanctuary', group: 'showcase', label: '云鲸圣域', keywords: 'sanctuary whale 3d 云鲸 圣域 梦境 场景', icon: Waves, shortcut: '0' },
  { to: '/portfolio', group: 'showcase', label: '作品集', keywords: 'portfolio works 作品 作品集 画册', icon: Images },
  { to: '/settings', group: 'system', label: '设置与同步', keywords: 'settings cloud sync 设置 云端 连接 备份 外观', icon: Settings },
  { to: '/scrapbook', group: 'showcase', label: '手帐', keywords: 'scrapbook 手帐 剪贴簿 留言 海面之上', icon: NotebookPen },
]

export const NAV_GROUPS = [
  { id: 'action', label: '行动' }, { id: 'record', label: '记录' },
  { id: 'life', label: '生活' }, { id: 'showcase', label: '展示' },
] as const
export type NavigationGroup = typeof NAV_GROUPS[number]['id']
export const modulesForGroup = (group: NavigationGroup) => APP_MODULES.filter(item => item.group === group)

export function shortcutDestination(key: string): string | undefined {
  return APP_MODULES.find((module) => module.shortcut === key)?.to
}

export const COMMAND_GROUPS = ['计算', '页面', '操作', '任务', '笔记', '链接', '碎碎念', '作品', '记账'] as const

export function commandItemsInDisplayOrder<T extends { key: string; group: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>()
  const rank = (group: string) => {
    const index = COMMAND_GROUPS.findIndex((item) => item === group)
    return index < 0 ? COMMAND_GROUPS.length : index
  }
  return items.filter((item) => {
    if (seen.has(item.key)) return false
    seen.add(item.key)
    return true
  }).sort((a, b) => rank(a.group) - rank(b.group))
}

export function commandSelectionIndex(query: string, selection: { query: string; index: number }, resultCount: number): number {
  if (selection.query !== query) return 0
  return Math.max(0, Math.min(selection.index, resultCount - 1))
}
