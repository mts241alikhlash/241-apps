<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  standard?: boolean
}>()
</script>

<template>
  <div
    data-slot="dialog-header"
    :class="
      cn(
        'flex flex-col gap-1',
        props.standard && 'min-h-[var(--control-h-lg,2rem)] shrink-0 justify-center border-b bg-muted/30 px-4 py-0.5 pr-12',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
