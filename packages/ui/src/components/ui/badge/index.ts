import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

export const badgeVariants = cva(
  'gap-1.5 text-control font-medium leading-none whitespace-nowrap inline-flex w-fit shrink-0 items-center justify-center [&>svg]:pointer-events-none [&>svg]:size-[var(--icon-control,0.875rem)] [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'text-primary',
        secondary: 'text-muted-foreground',
        outline: 'text-foreground',
        ghost: 'text-muted-foreground',
        success: 'text-success',
        warning: 'text-warning',
        info: 'text-info',
        destructive: 'text-destructive',
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'outline',
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
