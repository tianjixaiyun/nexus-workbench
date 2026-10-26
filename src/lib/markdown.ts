import { marked } from 'marked'
import { isSafeUrl } from './utils'

marked.setOptions({ gfm: true, breaks: true })

/**
 * 安全渲染 Markdown:
 * 先把原始文本里的 HTML 字符全部转义(用户输入不产生真实标签),
 * 再让 marked 只负责解析 Markdown 语法,链接统一新窗口打开。
 */
export function renderMarkdown(src: string): string {
  if (!src.trim()) return ''
  const escaped = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = marked.parse(escaped, { async: false })
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('a').forEach((a) => {
      // 协议净化:javascript:/data: 等危险协议一律摘除 href(导入他人备份时也安全)
      if (!isSafeUrl(a.getAttribute('href') ?? '')) a.removeAttribute('href')
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    })
    doc.querySelectorAll('img').forEach((img) => {
      // 图片允许 data:image/(作品集图片本地压缩存储),其余非白名单协议摘除 src
      const src = img.getAttribute('src') ?? ''
      if (!isSafeUrl(src) && !/^data:image\//i.test(src)) img.removeAttribute('src')
    })
    return doc.body.innerHTML
  } catch {
    return html
  }
}
