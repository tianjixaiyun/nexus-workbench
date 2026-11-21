import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

/**
 * 顶栏「安装应用」入口:浏览器派发 beforeinstallprompt 时才渲染(Chrome/Edge 桌面 + 安卓)。
 * iOS Safari 不派发该事件,用户按文档《装成手机 App》手动添加,按钮自动隐藏不占位。
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallButton() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      // 阻止浏览器默认迷你横幅,改用顶栏按钮承载安装入口
      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!event) return null

  const install = () => {
    void event
      .prompt()
      .then(() => event.userChoice)
      .then(() => setEvent(null))
      .catch(() => setEvent(null))
  }

  return (
    <button
      type="button"
      onClick={install}
      aria-label="安装为桌面应用"
      title="把工作台安装成桌面 App"
      className="cursor-pointer rounded-xl border border-line-2 bg-surface-1 p-2 text-txt-muted hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Download size={16} />
    </button>
  )
}
