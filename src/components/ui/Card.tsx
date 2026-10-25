import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** 玻璃拟态卡片容器 */
export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('glass-card p-5', className)} {...rest}>
      {children}
    </div>
  )
}
