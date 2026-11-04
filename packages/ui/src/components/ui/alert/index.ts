import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Alert } from './Alert.vue'
export { default as AlertDescription } from './AlertDescription.vue'
export { default as AlertTitle } from './AlertTitle.vue'

export const alertVariants = cva(
  'relative w-full rounded-md border px-2 py-1.5 text-[length:var(--text-control,0.75rem)] grid has-[>svg]:grid-cols-[calc(var(--spacing)*3.5)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-1.5 gap-y-0.5 items-start [&>svg]:size-[var(--icon-control,0.875rem)] [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type AlertVariants = VariantProps<typeof alertVariants>
