<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  size?: 'md' | 'lg'
}>()
</script>

<template>
  <h3
    data-slot="card-title"
    :class="
      cn(
        'text-[length:var(--text-control,0.75rem)] leading-none font-medium',
        props.size === 'md' && 'text-[length:var(--text-control,0.75rem)]',
        props.size === 'lg' && 'text-xl font-semibold',
        props.class,
      )
    "
  >
    <slot />
  </h3>
</template>
