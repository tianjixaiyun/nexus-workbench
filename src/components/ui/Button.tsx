import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'icon'
  children?: ReactNode
}

const variants = {
  primary:
    'neon-gradient-bg btn-shine text-white font-medium hover:opacity-90 hover:glow-cyan disabled:opacity-50',
  ghost: 'text-txt-secondary hover:text-txt-primary hover:bg-surface-2',
  outline: 'border border-line-3 text-txt-secondary hover:border-accent hover:text-txt-primary',
  danger: 'text-danger hover:bg-rose-500/10',
} as const

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-4 text-sm rounded-xl',
  icon: 'h-9 w-9 rounded-xl justify-center',
} as const

export function Button({ variant = 'ghost', size = 'md', className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 transition-all duration-150 select-none disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
