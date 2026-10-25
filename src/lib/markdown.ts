import { marked } from 'marked'

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
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    })
    return doc.body.innerHTML
  } catch {
    return html
  }
}
