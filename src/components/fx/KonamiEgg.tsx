import { useEffect } from 'react'
import { whaleCall } from '@/lib/whaleCall'
import { celebrate } from '@/components/fx/Burst'
import { checkAchievementsNow } from '@/components/fx/achievements'

/**
 * Konami 秘籍彩蛋(↑↑↓↓←→←→BA):
 * 触发鲸鸣 + 全屏气泡庆祝,并解锁隐藏成就「深海密码」。
 */
const SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

export function KonamiEgg() {
  useEffect(() => {
    let progress = 0
    const onKey = (e: KeyboardEvent) => {
      const target = typingGuard(e) ? null : e.key
      if (target === null) {
        progress = 0
        return
      }
      if (target.toLowerCase() === SEQUENCE[progress].toLowerCase()) {
        progress++
        if (progress === SEQUENCE.length) {
          progress = 0
          // 触发!
          whaleCall()
          setTimeout(celebrate, 260)
          try {
            localStorage.setItem('nexus-konami', '1')
          } catch { /* ignore */ }
          checkAchievementsNow()
        }
      } else {
        progress = target.toLowerCase() === SEQUENCE[0].toLowerCase() ? 1 : 0
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return null
}

/** 输入框里打字不算 */
function typingGuard(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return Boolean(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))
}
