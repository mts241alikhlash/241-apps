<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
    variant?: 'default' | 'flat'
    gap?: 'default' | 'none'
    size?: 'default' | 'sm'
  }>(),
  { variant: 'default', gap: 'default', size: 'default' },
)
</script>

<template>
  <div
    data-slot="card"
    :data-size="props.size"
    :class="
      cn(
        'group/card bg-card text-card-foreground flex flex-col overflow-hidden rounded-md text-[length:var(--text-control,0.75rem)] ring-1 ring-foreground/10 [--ff-label-bg:var(--card)]',
        props.gap === 'default'
          ? props.size === 'sm'
            ? 'gap-3 py-3'
            : 'gap-4 py-4'
          : 'gap-0 py-0',
        props.variant === 'flat' &&
          'bg-muted shadow-none [--ff-label-bg:var(--muted)]',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
