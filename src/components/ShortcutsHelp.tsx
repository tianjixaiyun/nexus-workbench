import { Modal } from '@/components/ui/Modal'

const GROUPS: { title: string; items: { keys: string; desc: string }[] }[] = [
  {
    title: '全局',
    items: [
      { keys: 'Ctrl K', desc: '打开命令面板(搜索一切)' },
      { keys: '/', desc: '打开命令面板' },
      { keys: '1 - 9', desc: '切换到第 1~9 个页面' },
      { keys: '0', desc: '云鲸圣域(3D 梦境)' },
      { keys: '?', desc: '显示本帮助' },
      { keys: 'Esc', desc: '关闭弹窗 / 面板' },
    ],
  },
  {
    title: '快速创建',
    items: [
      { keys: 'Q', desc: '快速捕捉(flomo 式秒记)' },
      { keys: 'A', desc: '问问助手(基于你的数据分析)' },
      { keys: 'N', desc: '新建任务' },
      { keys: 'M', desc: '新建便签' },
    ],
  },
  {
    title: '命令面板内',
    items: [
      { keys: '↑ ↓', desc: '选择结果' },
      { keys: 'Enter', desc: '执行选中项' },
      { keys: 'g / bd / gh / b + 空格', desc: '外部搜索:Google / 百度 / GitHub / B站' },
    ],
  },
]

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="键盘快捷键" className="max-w-md">
      <div className="flex flex-col gap-5">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-[11px] tracking-wider text-txt-muted">{group.title}</p>
            <div className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <div key={item.keys} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-txt-secondary">{item.desc}</span>
                  <kbd className="shrink-0 rounded-lg border border-line-3 bg-surface-2 px-2 py-1 font-mono text-[11px] text-txt-secondary">
                    {item.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="border-t border-line-2 pt-4">
          <button
            type="button"
            onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('nexus:open-palette')) }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line-2 px-3 py-2 text-xs text-txt-secondary transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            去命令面板直接运行
            <kbd className="rounded border border-line-3 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
          </button>
        </div>
      </div>
    </Modal>
  )
}
