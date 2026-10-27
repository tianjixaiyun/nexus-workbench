import { useRef, useState } from 'react'
import { Copy, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { buildWorkspacePrompt, PROMPT_SCENARIOS, type PromptScenario } from '@/lib/promptBuilder'
import { buildAssistantSnapshot } from '@/lib/assistant'
import { cn } from '@/lib/utils'
import { useTaskStore } from '@/stores/taskStore'
import { useHabitStore } from '@/stores/habitStore'
import { useDailyStore } from '@/stores/dailyStore'

export function PromptStudio() {
  const tasks=useTaskStore(state=>state.tasks), habits=useHabitStore(state=>state.habits), dailies=useDailyStore(state=>state.dailies)
  const [scenario,setScenario]=useState<PromptScenario>('day-plan')
  const [goal,setGoal]=useState<string>(PROMPT_SCENARIOS[0].goal)
  const [constraints,setConstraints]=useState('')
  const [includeContext,setIncludeContext]=useState(false)
  const [taskId,setTaskId]=useState('')
  const [preview,setPreview]=useState('')
  const [generated,setGenerated]=useState('')
  const [sources,setSources]=useState({tasks,habits,dailies})
  const [notice,setNotice]=useState('')
  const textRef=useRef<HTMLTextAreaElement>(null)
  const signature=JSON.stringify({scenario,goal,constraints,includeContext,taskId})
  const stale=Boolean(preview)&&(generated!==signature || includeContext&&(sources.tasks!==tasks || scenario==='weekly-review'&&(sources.habits!==habits||sources.dailies!==dailies)))
  const generate=()=>{
    try {
      setPreview(buildWorkspacePrompt({scenario,goal,constraints,includeContext,taskId},buildAssistantSnapshot()))
      setGenerated(signature);setSources({tasks,habits,dailies});setNotice('已在本机生成，请核对预览后使用。')
    } catch(cause){setNotice(cause instanceof Error?cause.message:'生成失败，请检查输入。')}
  }
  const copy=async()=>{
    try {await navigator.clipboard.writeText(preview);setNotice('提示词已复制。请自行粘贴到你选择的AI，当前应用没有发送数据。')}
    catch {textRef.current?.focus();textRef.current?.select();setNotice('无法自动复制，已选中预览，可按 Ctrl / ⌘ + C 手动复制。')}
  }
  const download=()=>{
    try {
      const url=URL.createObjectURL(new Blob([preview],{type:'text/markdown;charset=utf-8'}))
      const link=document.createElement('a');link.href=url;link.download=`NEXUS-${scenario}-提示词.md`;link.click()
      window.setTimeout(()=>URL.revokeObjectURL(url),1000)
      setNotice('已发起 Markdown 下载。若浏览器阻止下载，可复制上方预览内容。')
    } catch {setNotice('无法下载，请复制预览内容。')}
  }
  return <div className="space-y-4 p-4">
    <p className="text-xs leading-relaxed text-txt-secondary">选场景、补目标，再生成一份可编辑的提示词。本机整理，不调用模型、不自动发送记录。</p>
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="提示词场景">{PROMPT_SCENARIOS.map(item=><button type="button" key={item.id} aria-pressed={scenario===item.id} onClick={()=>{setScenario(item.id);setGoal(item.goal);setNotice('')}} className={cn('min-w-0 cursor-pointer rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-accent',scenario===item.id?'border-accent bg-accent-soft':'border-line-2 bg-surface-1')}><span className="block text-sm font-medium text-txt-primary">{item.label}</span><span className="mt-1 block text-xs leading-relaxed text-txt-secondary">{item.hint}</span></button>)}</div>
    <label className="block text-sm text-txt-secondary">目标与背景<Textarea aria-label="提示词目标与背景" className="mt-2" rows={3} maxLength={2000} value={goal} onChange={event=>setGoal(event.target.value)} /></label>
    <label className="block text-sm text-txt-secondary">时间、资源或其他约束<Input aria-label="提示词约束" className="mt-2" maxLength={1000} value={constraints} onChange={event=>setConstraints(event.target.value)} placeholder="例如：每天30分钟，本周五前完成" /></label>
    <div className="rounded-xl border border-line-2 bg-surface-1 p-3"><label className="flex cursor-pointer items-start gap-2 text-sm text-txt-primary"><input type="checkbox" className="mt-1 accent-accent" checked={includeContext} onChange={event=>setIncludeContext(event.target.checked)} />附带工作台上下文</label><p className="mt-2 text-xs leading-relaxed text-txt-secondary">默认关闭。开启后包含当前统计和有限任务标题、标签、截止日；不包含笔记正文、任务描述、联系人或账目。复制到外部AI前请核对。</p>
      {includeContext&&scenario==='task-breakdown'&&<label className="mt-3 block text-xs text-txt-secondary">只选择一条任务<Select aria-label="拆解的任务" className="mt-1 w-full" value={taskId} onChange={event=>setTaskId(event.target.value)}><option value="">请选择任务</option>{tasks.filter(task=>!task.deletedAt).map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</Select></label>}
    </div>
    <Button variant="primary" onClick={generate} disabled={!goal.trim()}><RefreshCw size={14} />{preview?'重新生成预览':'生成提示词预览'}</Button>
    {preview&&<section className="space-y-2" aria-label="生成的提示词"><label className="block text-sm text-txt-secondary">提示词预览（可以编辑）<textarea ref={textRef} aria-label="提示词预览" rows={13} maxLength={30000} value={preview} onChange={event=>setPreview(event.target.value)} className="input-base mt-2 w-full resize-y font-mono text-xs leading-relaxed" /></label>{stale&&<p role="status" className="text-xs leading-relaxed text-warn">设置或上下文已变化，请重新生成再复制；重新生成会替换当前预览。</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={stale||!preview.trim()} onClick={()=>void copy()}><Copy size={14} />复制提示词</Button><Button variant="outline" disabled={stale||!preview.trim()} onClick={download}><Download size={14} />下载 Markdown</Button></div></section>}
    {notice&&<p role="status" className="rounded-lg border border-line-2 bg-surface-1 p-3 text-xs leading-relaxed text-txt-primary">{notice}</p>}
    <p className="text-xs leading-relaxed text-txt-muted">上下文为生成时的数据快照，更新记录后请重新生成。表单与预览仅保留在当前应用会话，刷新或切换账号后清空。</p>
  </div>
}
