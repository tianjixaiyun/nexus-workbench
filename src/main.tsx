import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

// 首帧前应用已保存的主题(index.html 里的内联脚本已处理背景色,这里补全 class)
document.documentElement.classList.toggle('light', localStorage.getItem('nexus:settings')?.includes('"light"') ?? false)

// 未捕获错误只进控制台,不写 document.title(污染标题栏且误导排查)
window.addEventListener('error', (e) => {
  const msg = e.error?.message ?? e.message ?? 'unknown error'
  console.error('[nexus] uncaught error:', msg, e.error)
})
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message ?? String(e.reason ?? 'unknown rejection')
  console.error('[nexus] unhandled rejection:', msg, e.reason)
})

// PWA:应用内注册 Service Worker(替代生成的 registerSW.js),
// 失败只降级为在线模式,不再产生 unhandled rejection 污染页面
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((err) => {
        console.warn('[PWA] SW 注册失败，已降级为在线模式', err)
      })
  })
}

// 版本更新后旧页面引用的懒加载 chunk 文件名会变化:预载失败时整页刷新一次
// (每次会话只自动刷新一次,避免异常环境下无限循环;启动时重置保护标记)
sessionStorage.removeItem('nexus:preload-reloaded')
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('nexus:preload-reloaded')) {
    sessionStorage.setItem('nexus:preload-reloaded', '1')
    window.location.reload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
