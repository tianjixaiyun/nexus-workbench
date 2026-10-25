import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

// 首帧前应用已保存的主题(index.html 里的内联脚本已处理背景色,这里补全 class)
document.documentElement.classList.toggle('light', localStorage.getItem('nexus:settings')?.includes('"light"') ?? false)

// 把未捕获的渲染错误写到标题栏,便于无控制台环境排查(保留)
window.addEventListener('error', (e) => {
  const msg = e.error?.message ?? e.message ?? 'unknown error'
  document.title = `ERR: ${msg}`.slice(0, 120)
})
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message ?? String(e.reason ?? 'unknown rejection')
  document.title = `REJ: ${msg}`.slice(0, 120)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
