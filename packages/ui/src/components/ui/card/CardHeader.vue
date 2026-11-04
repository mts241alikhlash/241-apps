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
    data-slot="card-header"
    :class="
      cn(
        props.standard
          ? 'flex min-h-[var(--control-h-lg,2rem)] flex-row items-center justify-between gap-3 border-b bg-muted/30 px-4 py-0.5'
          : '@container/card-header grid auto-rows-min items-start gap-1 rounded-t-lg px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
