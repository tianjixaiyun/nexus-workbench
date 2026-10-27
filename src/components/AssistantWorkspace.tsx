import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, ChevronDown, Copy, Send, Trash2, X } from 'lucide-react'
import { askAssistant, QUICK_QUESTIONS, type AssistantAnswer } from '@/lib/assistant'
import { cn } from '@/lib/utils'
import { useNativeDialog } from './ui/Modal'
import { Button } from './ui/Button'
import { PromptStudio } from './PromptStudio'
import { useSyncStore } from '@/stores/syncStore'

export type AssistantTab = 'analysis' | 'prompts'
interface Message { role:'user'|'assistant'; text:string; result?:AssistantAnswer }
const welcome:Message={role:'assistant',text:'我可以核对当前已载入的任务、习惯、专注和心情记录，并提供来源入口。\n需要任务拆解或开放方案时，切换到提示词工坊，组织后复制给你选择的AI。'}

export function AssistantPanel({open,onClose,onNavigate,initialTab='analysis'}:{open:boolean;onClose:()=>void;onNavigate:(to:string)=>void;initialTab?:AssistantTab}) {
  const [tab,setTab]=useState<AssistantTab>(initialTab)
  const [messages,setMessages]=useState<Message[]>([welcome])
  const [input,setInput]=useState('')
  const [showPrompt,setShowPrompt]=useState<number|null>(null)
  const [notice,setNotice]=useState('')
  const ref=useNativeDialog(open)
  const titleId=useId()
  const bottomRef=useRef<HTMLDivElement>(null)
  const inputRef=useRef<HTMLInputElement>(null)
  const status=useSyncStore(state=>state.status)
  useEffect(()=>{if(open)setTab(initialTab)},[open,initialTab])
  useEffect(()=>{if(open&&tab==='analysis')inputRef.current?.focus()},[open,tab])
  useEffect(()=>{if(open&&tab==='analysis')bottomRef.current?.scrollIntoView({block:'end',behavior:'auto'})},[messages,open,showPrompt,tab])
  const send=(raw:string)=>{
    const query=raw.trim().slice(0,500)
    if(!query)return
    try {
      const result=askAssistant(query)
      setMessages(previous=>[...previous.slice(-37),{role:'user',text:query},{role:'assistant',text:result.answer,result}])
      setInput('');setNotice('');setShowPrompt(null)
    } catch {setNotice('暂时无法分析当前记录，请确认数据载入完成后再试。')}
  }
  const copy=async(text:string)=>{
    try{await navigator.clipboard.writeText(text);setNotice('已复制分析结果。')}
    catch{setNotice('无法自动复制，请在回答中选择文字并手动复制。')}
  }
  const navigate=(to:string)=>{onNavigate(to);onClose()}
  return createPortal(<dialog ref={ref} aria-labelledby={titleId} aria-modal="true" onCancel={event=>{event.preventDefault();onClose()}} onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none justify-end bg-transparent p-0 text-txt-primary backdrop:bg-black/55 open:flex">
    <div className="flex h-full w-full max-w-2xl min-w-0 flex-col border-l border-line-2 bg-ink-900 shadow-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-line-2 px-4 py-3"><div className="flex min-w-0 items-center gap-2"><div className="rounded-xl bg-accent-soft p-2 text-accent"><Bot size={20}/></div><div><h2 id={titleId} className="text-base font-semibold">问问助手</h2><p className="mt-0.5 text-xs text-txt-secondary">本地分析 · 未接入语言模型</p></div></div><button type="button" onClick={onClose} aria-label="关闭助手" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-txt-secondary hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"><X size={18}/></button></header>
      <div className="flex shrink-0 gap-2 border-b border-line-2 p-3" role="group" aria-label="助手工作方式">{[{id:'analysis' as const,label:'本地分析'},{id:'prompts' as const,label:'提示词工坊'}].map(item=><button key={item.id} type="button" aria-pressed={tab===item.id} onClick={()=>setTab(item.id)} className={cn('min-h-9 cursor-pointer rounded-lg border px-4 text-sm focus-visible:outline-2 focus-visible:outline-accent',tab===item.id?'border-accent bg-accent-soft text-accent':'border-line-2 text-txt-secondary')}>{item.label}</button>)}</div>
      <div hidden={tab!=='prompts'} className="min-h-0 flex-1 overflow-y-auto"><PromptStudio/></div>
      <div hidden={tab!=='analysis'} className="min-h-0 flex-1 flex-col open:flex" style={tab==='analysis'?{display:'flex'}:undefined}>
        {(status==='offline'||status==='error'||status==='connecting')&&<p role="status" className="shrink-0 border-b border-warn/30 bg-warn/10 px-4 py-2 text-xs leading-relaxed text-txt-secondary">云端尚未确认最新数据；以下只分析当前已载入记录，请到设置检查同步后重新提问。</p>}
        <div role="log" aria-label="本地分析对话" aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">{messages.map((message,index)=><article key={index} className={cn('flex min-w-0 flex-col gap-2',message.role==='user'?'items-end':'items-start')}>
          <p className={cn('max-w-full rounded-2xl border px-3.5 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words',message.role==='user'?'border-accent/25 bg-accent-soft':'border-line-2 bg-surface-1')}>{message.text}</p>
          {message.result&&<><p className="text-[11px] text-txt-muted">分析时间 {new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(message.result.generatedAt))}</p>
            {message.result.sources.length>0&&<div className="w-full space-y-1 rounded-xl border border-line-2 p-2" aria-label="回答来源"><p className="px-1 text-xs text-txt-secondary">来源记录 · 点击核对</p>{message.result.sources.map(source=><button type="button" key={source.href} onClick={()=>navigate(source.href)} className="block min-h-9 w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"><span className="mr-2 text-txt-muted">{source.kind}</span><span className="break-words">{source.label}</span></button>)}</div>}
            <div className="flex flex-wrap gap-2">{message.result.actions.map(([label,to])=><Button key={label+to} size="sm" variant="outline" onClick={()=>navigate(to)}>{label}</Button>)}</div>
            <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="ghost" onClick={()=>void copy(message.text)}><Copy size={12}/>复制回答</Button><button type="button" aria-expanded={showPrompt===index} onClick={()=>setShowPrompt(showPrompt===index?null:index)} className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs text-txt-secondary focus-visible:outline-2 focus-visible:outline-accent">{showPrompt===index?'收起分析依据':'查看分析依据与提示词'}<ChevronDown size={12}/></button></div>
            {showPrompt===index&&<div className="w-full min-w-0 rounded-xl border border-line-2 bg-surface-1 p-3"><p className="mb-2 text-xs leading-relaxed text-txt-secondary">结论由本地统计规则生成；以下是本次引用的事实与可复用提示词，并未提交给模型。</p><pre className="max-h-80 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-txt-secondary">{message.result.prompt}</pre></div>}
          </>}
        </article>)}<div ref={bottomRef}/></div>
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-line-2 p-3" aria-label="快捷问题">{QUICK_QUESTIONS.map(query=><button type="button" key={query} onClick={()=>send(query)} className="min-h-9 cursor-pointer rounded-lg border border-line-2 bg-surface-1 px-2 py-2 text-left text-xs text-txt-secondary hover:border-accent focus-visible:outline-2 focus-visible:outline-accent">{query}</button>)}</div>
        {notice&&<p role="status" className="px-4 py-2 text-xs text-accent">{notice}</p>}
        <form onSubmit={event=>{event.preventDefault();send(input)}} className="flex shrink-0 items-center gap-2 border-t border-line-2 p-3"><input ref={inputRef} aria-label="向本地助手提问" maxLength={500} value={input} onChange={event=>setInput(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();if(!event.nativeEvent.isComposing&&!event.repeat)send(input)}}} placeholder="例如：今天先做什么，或找 React" className="input-base min-w-0 flex-1"/><button type="submit" disabled={!input.trim()} aria-label="发送" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent-soft text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"><Send size={16}/></button></form>
        <div className="flex shrink-0 justify-between gap-2 px-3 pb-3"><span className="text-[11px] leading-relaxed text-txt-muted">仅保留最近20轮，刷新或切换账号后清空</span><button type="button" onClick={()=>{setMessages([welcome]);setInput('');setShowPrompt(null);setNotice('')}} className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs text-txt-secondary focus-visible:outline-2 focus-visible:outline-accent"><Trash2 size={12}/>清空对话</button></div>
      </div>
    </div>
  </dialog>,document.body)
}
