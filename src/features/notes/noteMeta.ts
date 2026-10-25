import type { NoteColor } from '@/lib/data/types'

/** 便签 6 色的展示样式映射 */
export const NOTE_COLOR_META: Record<NoteColor, { stripe: string; tint: string; dot: string }> = {
  cyan: { stripe: 'border-l-accent', tint: 'bg-accent-solid/[0.04]', dot: 'bg-accent-solid' },
  violet: { stripe: 'border-l-violet-400/60', tint: 'bg-violet-400/[0.04]', dot: 'bg-violet-400' },
  amber: { stripe: 'border-l-amber-400/60', tint: 'bg-amber-400/[0.04]', dot: 'bg-amber-400' },
  emerald: { stripe: 'border-l-emerald-400/60', tint: 'bg-emerald-400/[0.04]', dot: 'bg-emerald-400' },
  rose: { stripe: 'border-l-rose-400/60', tint: 'bg-rose-400/[0.04]', dot: 'bg-rose-400' },
  slate: { stripe: 'border-l-slate-400/60', tint: 'bg-slate-400/[0.03]', dot: 'bg-slate-400' },
}
