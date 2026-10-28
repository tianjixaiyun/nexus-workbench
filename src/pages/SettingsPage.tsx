import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, Check, CircleCheck, Cloud, Copy, Download, ExternalLink, Eye, EyeOff, HardDrive, Loader2, Monitor, Moon, RefreshCw, ShieldCheck, SlidersHorizontal, Sun, Upload, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { activeCloudConnection, connectionError, connectionSource, isCloudMode, supabase } from '@/lib/config'
import { checkCloudTables, saveCloudConnection, testCloudConnection, useLocalConnection, validateCloudConnection } from '@/lib/cloudConnection'
import { refreshCloudData } from '@/lib/data/realtime'
import { assertNoActiveFocus, exportData } from '@/lib/backup'
import { requestBackupImport } from '@/lib/backupImport'
import { BACKUP_COLLECTIONS, BACKUP_LABELS } from '@/lib/backupValidation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useSyncStore } from '@/stores/syncStore'
import { toast } from '@/stores/toastStore'
import schemaSql from '../../supabase/schema.sql?raw'

const SECTIONS = [{ id: 'cloud', label: '云端连接', icon: Cloud }, { id: 'appearance', label: '外观与体验', icon: SlidersHorizontal }, { id: 'data', label: '数据与备份', icon: HardDrive }] as const
type Section = typeof SECTIONS[number]['id']
type TableCheck = { table: string; label: string; ok: boolean; error?: string }
const STATUS_LABELS = { local: '本地存储', connecting: '实时连接中', live: '实时已连接', offline: '当前离线', error: '连接需检查' } as const
const TASK_TIME_UPGRADE_SQL = "alter table public.tasks add column if not exists due_time text check (due_time is null or due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');"
const reloadAt = (path: string) => window.location.assign(`${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`)

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="workspace-kicker">{eyebrow}</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-txt-primary">{title}</h2><p className="mt-2 text-sm leading-6 text-txt-secondary">{description}</p></div>
}

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const selected = params.get('section')
  const section: Section = SECTIONS.some(item => item.id === selected) ? selected as Section : 'cloud'
  const user = useAuthStore(state => state.user)
  const ready = useAuthStore(state => state.ready)
  const theme = useSettingsStore(state => state.theme)
  const calm = useSettingsStore(state => state.calmMode)
  const lastExportAt = useSettingsStore(state => state.lastExportAt)
  const { status, lastSyncedAt, message: syncMessage, refreshing } = useSyncStore()
  const [url, setUrl] = useState(activeCloudConnection?.url ?? '')
  const [publicKey, setPublicKey] = useState(activeCloudConnection?.publicKey ?? '')
  const [showKey, setShowKey] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkedValue, setCheckedValue] = useState<string | null>(null)
  const [connectionNotice, setConnectionNotice] = useState('')
  const [connectionFailed, setConnectionFailed] = useState(false)
  const [tableChecks, setTableChecks] = useState<TableCheck[]>([])
  const [tablesBusy, setTablesBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [switching, setSwitching] = useState(false)
  const request = useRef<{ generation: number; controller: AbortController | null }>({ generation: 0, controller: null })
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; request.current.generation++; request.current.controller?.abort() }
  }, [])
  useEffect(() => { setTableChecks([]) }, [user?.id])
  const fingerprint = `${url.trim()}\0${publicKey.trim()}`

  const invalidate = () => {
    request.current.generation++
    request.current.controller?.abort()
    setChecking(false)
    setCheckedValue(null)
    setConnectionNotice('')
  }
  const inspectConnection = async () => {
    request.current.controller?.abort()
    const generation = ++request.current.generation
    const controller = new AbortController()
    request.current.controller = controller
    setChecking(true)
    setCheckedValue(null)
    setConnectionNotice('')
    setConnectionFailed(false)
    let timedOut = false
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort() }, 15_000)
    try {
      const candidate = validateCloudConnection({ url, publicKey })
      const result = await testCloudConnection(candidate, { signal: controller.signal })
      if (generation !== request.current.generation || !mounted.current) return
      setCheckedValue(fingerprint)
      setConnectionNotice(result.message)
    } catch (error) {
      if (generation !== request.current.generation || !mounted.current) return
      setConnectionFailed(true)
      setConnectionNotice(timedOut ? '连接检测超时，请检查网络与项目地址后重试。当前配置没有改变。' : error instanceof Error ? error.message : '连接检测失败，请检查地址与公开密钥')
    } finally { window.clearTimeout(timeout); if (generation === request.current.generation && mounted.current) setChecking(false) }
  }
  const activateCloud = () => {
    if (checkedValue !== fingerprint || checking) return
    try {
      assertNoActiveFocus()
      saveCloudConnection(validateCloudConnection({ url, publicKey }))
      setSwitching(true)
      reloadAt('/login')
    } catch (error) {
      setConnectionFailed(true)
      setConnectionNotice(error instanceof Error ? error.message : '配置未能保存，当前存储模式没有改变')
    }
  }
  const activateLocal = () => {
    try {
      assertNoActiveFocus()
      useLocalConnection()
      setSwitching(true)
      reloadAt('/settings')
    } catch (error) {
      setConnectionFailed(true)
      const detail = error instanceof Error ? error.message : '本地模式未能保存，请检查浏览器存储权限'
      setConnectionNotice(detail)
      toast.error('存储模式未切换', detail)
    }
  }
  const inspectTables = async () => {
    const owner = user?.id
    setTablesBusy(true)
    try {
      const result = await checkCloudTables(supabase)
      if (mounted.current && useAuthStore.getState().user?.id === owner) setTableChecks(result)
    } catch (error) {
      toast.error('读表检查未完成', error instanceof Error ? error.message : '请确认登录和网络状态')
    } finally { if (mounted.current) setTablesBusy(false) }
  }
  const exportBackup = async () => {
    setExporting(true)
    try { await exportData() }
    catch (error) { toast.error('备份未能导出', error instanceof Error ? error.message : '请检查当前数据连接') }
    finally { if (mounted.current) setExporting(false) }
  }
  const copySchema = async () => {
    try { await navigator.clipboard.writeText(schemaSql); toast.success('建表 SQL 已复制', '到自己的 Supabase SQL Editor 粘贴并执行') }
    catch { toast.error('剪贴板不可用', '请使用“下载 SQL”，再复制文件内容到 SQL Editor') }
  }
  const copyTaskTimeUpgrade = async () => {
    try { await navigator.clipboard.writeText(TASK_TIME_UPGRADE_SQL); toast.success('任务时间更新 SQL 已复制', '在自己的 Supabase SQL Editor 执行；不需要重复初始化其他表') }
    catch { toast.error('复制失败', '可以使用“复制建表 SQL”或“下载 SQL”更新已有表') }
  }
  const downloadSchema = () => {
    const objectUrl = URL.createObjectURL(new Blob([schemaSql], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = 'nexus-schema.sql'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
  const refresh = async () => {
    try { await refreshCloudData(); toast.success('云端数据刷新完成') }
    catch (error) { toast.error('云端刷新未完成', error instanceof Error ? error.message : '请检查连接状态后重试') }
  }
  let sqlEditorUrl = 'https://supabase.com/dashboard'
  try {
    const host = new URL(url).hostname
    if (/^[a-z0-9-]+\.supabase\.co$/.test(host)) sqlEditorUrl = `https://supabase.com/dashboard/project/${host.split('.')[0]}/sql/new`
  } catch { /* 地址尚未填写时使用通用控制台入口。 */ }

  return <div className="mx-auto flex max-w-5xl flex-col gap-7">
    <div><p className="workspace-kicker">YOUR WORKSPACE</p><h2 className="workspace-title">设置与同步</h2><p className="workspace-description">管理数据连接、外观和备份，让不同设备上的工作衔接起来。</p></div>
    <div className="flex gap-1 overflow-x-auto border-b border-line-2" aria-label="设置分类">
      {SECTIONS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={section === id} onClick={() => setParams({ section: id }, { replace: true })} className={cn('flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent', section === id ? 'border-accent text-accent' : 'border-transparent text-txt-secondary hover:text-txt-primary')}><Icon size={16} />{label}</button>)}
    </div>

    {section === 'cloud' && <div className="flex flex-col gap-5">
      <section className="workspace-panel overflow-hidden" aria-label="当前存储状态">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div className="flex min-w-0 flex-1 items-center gap-3"><span className="rounded-xl bg-accent-soft p-3 text-accent">{isCloudMode ? <Cloud size={23} /> : <HardDrive size={23} />}</span><div className="min-w-0"><h3 className="font-semibold text-txt-primary">{isCloudMode ? 'Supabase 云端空间' : '本机工作空间'}</h3><p className="mt-1 max-w-xs truncate text-xs text-txt-secondary">{isCloudMode ? activeCloudConnection?.url : '数据保存在当前浏览器，连接云端后仍会保留'}</p></div></div><span className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs', status === 'error' || status === 'offline' ? 'border-warn/30 text-warn' : 'border-line-2 text-txt-secondary')}>{status === 'offline' ? <WifiOff size={13} /> : status === 'live' ? <CircleCheck size={13} className="text-success" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}{STATUS_LABELS[status]}</span></div>
        <div className="grid gap-4 border-t border-line-2 bg-surface-1 px-5 py-4 text-xs sm:grid-cols-3 sm:px-6"><div><p className="text-txt-muted">当前账号</p><p className="mt-1 truncate text-txt-secondary">{isCloudMode ? user?.email ?? '尚未登录' : '本地使用，无需登录'}</p></div><div><p className="text-txt-muted">最近数据刷新</p><p className="mt-1 text-txt-secondary">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('zh-CN') : '尚无云端刷新记录'}</p></div><div><p className="text-txt-muted">连接来源</p><p className="mt-1 text-txt-secondary">{connectionSource === 'browser' ? '当前浏览器设置' : connectionSource === 'environment' ? '站点部署配置' : '默认本地模式'}</p></div></div>
        {(syncMessage || connectionError) && <p role="status" className="border-t border-line-2 px-5 py-3 text-xs leading-5 text-warn">{connectionError ?? syncMessage}</p>}
        {connectionError && !isCloudMode && <div className="px-5 pb-4"><Button size="sm" variant="outline" onClick={activateLocal} disabled={switching}>恢复本机模式</Button></div>}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.7fr)]">
        <section className="workspace-panel p-5 sm:p-6">
          <SectionHeading eyebrow="CONNECT IN THREE STEPS" title="连接你自己的云端" description="无需重新部署网站。先创建项目、初始化数据表，再填入公开连接信息。" />
          <ol className="mt-6 flex flex-col gap-6">
            <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-xs text-accent">01</span><div className="min-w-0"><h4 className="text-sm font-medium text-txt-primary">创建 Supabase 项目</h4><p className="mt-1 text-xs leading-5 text-txt-secondary">选择自己的组织与区域。项目费用和额度以控制台显示为准。</p><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:underline">打开 Supabase 控制台<ExternalLink size={12} /></a></div></li>
            <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-xs text-accent">02</span><div className="min-w-0 flex-1"><h4 className="text-sm font-medium text-txt-primary">初始化 NEXUS 数据表</h4><p className="mt-1 text-xs leading-5 text-txt-secondary">新项目运行建表 SQL。已有项目使用任务截止时间前，请先备份并执行“任务时间更新 SQL”；其他表不需要重复初始化。</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void copySchema()}><Copy size={13} />复制建表 SQL</Button><Button size="sm" variant="outline" onClick={() => void copyTaskTimeUpgrade()}><Copy size={13} />复制任务时间更新 SQL</Button><Button size="sm" variant="outline" onClick={downloadSchema}><Download size={13} />下载 SQL</Button><a href={sqlEditorUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 text-xs text-accent hover:underline">SQL Editor<ExternalLink size={11} /></a></div></div></li>
            <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-xs text-accent">03</span><div className="min-w-0 flex-1"><h4 className="text-sm font-medium text-txt-primary">验证连接并启用</h4><p className="mt-1 text-xs leading-5 text-txt-secondary">在项目 Connect / API Keys 中找到 Project URL 和 Publishable key。不要填写 Secret 或 service_role。</p>
              <form onSubmit={event => { event.preventDefault(); void inspectConnection() }} className="mt-4 flex flex-col gap-4">
                <div><label htmlFor="cloud-project-url" className="mb-1.5 block text-xs font-medium text-txt-secondary">Project URL</label><Input id="cloud-project-url" type="url" autoComplete="off" spellCheck={false} placeholder="https://your-project.supabase.co" value={url} disabled={switching} onChange={event => { invalidate(); setUrl(event.target.value) }} /></div>
                <div><label htmlFor="cloud-publishable-key" className="mb-1.5 block text-xs font-medium text-txt-secondary">Publishable key · 公开连接密钥</label><div className="relative"><Input id="cloud-publishable-key" type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false} className="pr-10" placeholder="sb_publishable_…" value={publicKey} disabled={switching} onChange={event => { invalidate(); setPublicKey(event.target.value) }} /><button type="button" onClick={() => setShowKey(value => !value)} aria-label={showKey ? '隐藏公开密钥' : '显示公开密钥'} className="absolute top-0 right-0 flex h-9 w-10 cursor-pointer items-center justify-center rounded-lg text-txt-secondary focus-visible:outline-2 focus-visible:outline-accent">{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
                <div className="flex flex-wrap gap-2"><Button type="submit" variant="outline" disabled={checking || switching || !url.trim() || !publicKey.trim()}>{checking ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}{checking ? '正在检测…' : '检测连接'}</Button>{checking && <Button type="button" variant="ghost" onClick={() => { invalidate(); setConnectionFailed(false); setConnectionNotice('已取消连接检测，当前配置没有改变。') }}>取消检测</Button>}<Button type="button" variant="primary" onClick={activateCloud} disabled={checking || switching || checkedValue !== fingerprint}>{switching ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}保存并进入云端登录</Button></div>
                {connectionNotice && <p role="status" className={cn('break-words rounded-lg border p-3 text-xs leading-5', connectionFailed ? 'border-warn/30 text-warn' : 'border-success/25 text-success')}>{connectionNotice}</p>}
                <p className="text-xs leading-5 text-txt-secondary">连接信息只保存在本浏览器；换设备填写同一项目并登录相同账号，即可取回业务数据。检测仅检查服务可达性，不会写入数据。保存会重新加载应用，请先保存未提交内容；运行或暂停的专注需先重置。切换不会清空本地记录，也不会自动上传。</p>
              </form>
            </div></li>
          </ol>
        </section>
        <aside className="flex flex-col gap-5">
          <section className="workspace-panel p-5"><h3 className="text-sm font-semibold text-txt-primary">连接后可以同步什么</h3><p className="mt-2 text-xs leading-5 text-txt-secondary">以下 11 类业务数据写入当前账号的云端空间，并支持跨设备实时刷新。</p><div className="mt-4 grid grid-cols-2 gap-2">{BACKUP_COLLECTIONS.map(key => <span key={key} className="flex items-center gap-2 text-xs text-txt-secondary"><Check size={13} className="shrink-0 text-accent" />{BACKUP_LABELS[key]}</span>)}</div><p className="mt-4 border-t border-line-2 pt-3 text-xs leading-5 text-txt-secondary">专注历史、工作日志、外观、个人档案和保存视图属于当前设备；其中白名单内容可用 JSON 备份迁移。云端模式离线时不能提交业务修改。</p></section>
          <section className="workspace-panel p-5"><h3 className="text-sm font-semibold text-txt-primary">账号与连接检查</h3>{isCloudMode ? <><p className="mt-2 text-xs leading-5 text-txt-secondary">{ready && user ? '登录后可逐表检查当前账号的读取能力，并重新拉取业务数据。' : '先登录同一个云端项目，再检查数据表。'}</p><div className="mt-4 flex flex-wrap gap-2">{user ? <><Button size="sm" variant="outline" disabled={tablesBusy || refreshing} onClick={() => void inspectTables()}>{tablesBusy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}检查数据表</Button><Button size="sm" variant="outline" disabled={refreshing || tablesBusy} onClick={() => void refresh()}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />刷新云端数据</Button></> : <Link to="/login" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">进入云端登录<ArrowRight size={14} /></Link>}</div>{tableChecks.length > 0 && <div className="mt-4 flex flex-col gap-2" role="status">{tableChecks.map(row => <p key={row.table} className="text-xs leading-5"><span className={row.ok ? 'text-success' : 'text-warn'}>{row.ok ? '✓' : '待处理'} {row.label}</span>{row.error && <span className="block break-words text-txt-secondary">{row.error}</span>}</p>)}<p className="border-t border-line-2 pt-2 text-xs leading-5 text-txt-secondary">只读检查不等于写入或账号隔离的完整验收。</p></div>}<Button size="sm" className="mt-4" variant="ghost" disabled={switching || checking} onClick={activateLocal}><HardDrive size={13} />切回本机工作空间</Button></> : <p className="mt-2 text-xs leading-5 text-txt-secondary">当前可继续完整使用本地功能。完成左侧连接步骤后，再登录并检查云端数据表。</p>}</section>
        </aside>
      </div>
    </div>}

    {section === 'appearance' && <section className="workspace-panel p-5 sm:p-7"><SectionHeading eyebrow="MAKE IT YOURS" title="外观与体验" description="主题和动效偏好保存在当前设备，随时可以调整。" /><div className="mt-7 grid gap-3 sm:grid-cols-2">{([{ value: 'dark', label: '深色海洋', icon: Moon }, { value: 'light', label: '清晰亮色', icon: Sun }] as const).map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => useSettingsStore.getState().setTheme(value)} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-5 text-left focus-visible:outline-2 focus-visible:outline-accent', theme === value ? 'border-accent bg-accent-soft' : 'border-line-2')}><Icon size={22} className={theme === value ? 'text-accent' : 'text-txt-secondary'} /><span className="flex-1 text-sm font-medium text-txt-primary">{label}</span>{theme === value && <Check size={17} className="text-accent" />}</button>)}</div><div className="mt-6 flex items-center justify-between gap-5 border-t border-line-2 py-5"><div><h3 className="text-sm font-medium text-txt-primary">低干扰模式</h3><p className="mt-1 text-xs leading-5 text-txt-secondary">减少粒子、鼠标拖尾、3D 与过场；系统减少动态效果始终优先。</p></div><button type="button" role="switch" aria-checked={calm} aria-label="低干扰模式" onClick={() => { if (!useSettingsStore.getState().setCalmMode(!calm)) toast.error('偏好未能保存', '本次页面已切换，刷新后可能恢复') }} className={cn('relative h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-accent', calm ? 'border-accent bg-accent-solid' : 'border-line-3 bg-surface-3')}><span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]', calm ? 'left-6' : 'left-0.5')} /></button></div><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-1 p-4"><div className="flex items-center gap-3"><Monitor size={18} className="text-accent" /><p className="text-sm text-txt-secondary">首页组件可单独显示、隐藏和排序。</p></div><Link to="/home" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">自定义工作台<ArrowRight size={14} /></Link></div></section>}

    {section === 'data' && <div className="grid items-start gap-5 md:grid-cols-2"><section className="workspace-panel p-5 sm:p-6"><SectionHeading eyebrow="KEEP A COPY" title="备份与迁移" description="把业务记录和白名单本机内容带走，恢复前先预览范围。" /><div className="mt-6 flex flex-wrap gap-3"><Button variant="primary" disabled={exporting || isCloudMode && !user} onClick={() => void exportBackup()}>{exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}导出 JSON 备份</Button><Button variant="outline" disabled={isCloudMode && !user} onClick={requestBackupImport}><Upload size={15} />恢复备份</Button></div><p className="mt-4 text-xs text-txt-secondary">上次请求导出：{lastExportAt ? new Date(lastExportAt).toLocaleString('zh-CN') : '尚未导出'}</p><p className="mt-4 border-t border-line-2 pt-4 text-xs leading-6 text-txt-secondary">本地恢复替换选中集合，云端恢复追加记录。本机补充项默认不选，与数据库分步恢复；活动计时、认证、PIN、缓存和未保存草稿不包含在备份中。</p></section><section className="workspace-panel p-5 sm:p-6"><h3 className="text-sm font-semibold text-txt-primary">数据保留与快捷操作</h3><p className="mt-3 text-sm leading-6 text-txt-secondary">删除的任务和便签先进入回收站，可以恢复。切换本机与云端不会自动迁移记录，先导出再到目标空间预览导入。</p><div className="mt-5 flex flex-col gap-4"><Link to="/trash" className="flex items-center justify-between text-sm text-accent hover:underline">打开回收站<ArrowRight size={14} /></Link><Link to="/stats" className="flex items-center justify-between text-sm text-accent hover:underline">查看数据统计<ArrowRight size={14} /></Link><Link to="/tasks" className="flex items-center justify-between text-sm text-accent hover:underline">管理任务与保存视图<ArrowRight size={14} /></Link></div><div className="mt-6 border-t border-line-2 pt-4 text-xs leading-6 text-txt-secondary"><p>Ctrl / ⌘ + K：搜索记录与命令</p><p>Q：快速捕捉　N：新任务　M：新便签</p><p>1–9 / 0：保留原模块快捷键　?：查看全部</p></div></section></div>}
  </div>
}
