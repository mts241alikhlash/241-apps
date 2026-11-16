<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
    gap?: 'default' | 'none'
    size?: 'default' | 'sm'
  }>(),
  { gap: 'default', size: 'default' },
)
</script>

<template>
  <div
    data-slot="card"
    :data-size="props.size"
    :class="
      cn(
        'group/card bg-card text-card-foreground flex flex-col overflow-hidden rounded-lg border border-border shadow-xs text-control [--ff-label-bg:var(--card)]',
        props.gap === 'default'
          ? props.size === 'sm'
            ? 'gap-3 py-3'
            : 'gap-4 py-4'
          : 'gap-0 py-0',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
