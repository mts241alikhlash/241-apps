<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  standard?: boolean
  variant?: 'default' | 'thin'
}>()
</script>

<template>
  <div
    data-slot="card-footer"
    :class="
      cn(
        props.variant === 'thin'
          ? 'h-1.5 shrink-0 bg-muted/20 p-0'
          : props.standard
            ? 'flex min-h-[var(--control-h-lg,2rem)] items-center justify-end gap-2 border-t bg-muted/30 px-4 py-0.5'
            : 'flex items-center rounded-b-lg px-4 group-data-[size=sm]/card:px-3 [.border-t]:pt-4 group-data-[size=sm]/card:[.border-t]:pt-3',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
