import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** 玻璃拟态卡片容器 */
export function Card({ className, spotlight, children, ...rest }: HTMLAttributes<HTMLDivElement> & { spotlight?: boolean }) {
  return (
    <div className={cn('glass-card p-5', spotlight && 'spotlight-card', className)} {...rest}>
      {children}
    </div>
  )
}
