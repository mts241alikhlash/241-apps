<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  standard?: boolean
  plain?: boolean
}>()
</script>

<template>
  <div
    data-slot="card-header"
    :data-plain="plain ? 'true' : undefined"
    :class="
      cn(
        props.plain
          ? 'flex min-h-0 flex-row items-center justify-between gap-3 border-b-0 bg-transparent px-0 pb-3 pt-0 sm:px-0 [&_[data-slot=card-title]]:min-w-0 [&_[data-slot=card-title]]:truncate'
          : props.standard
            ? 'flex min-h-[calc(var(--control-h-md,2rem)+1rem)] shrink-0 flex-row items-center justify-between gap-3 border-b bg-muted/30 px-4 py-0.5 has-[[data-slot=card-title][data-size=md]]:not-has-[[data-slot=button]]:min-h-[calc(var(--control-h-md,2rem)+0.5rem)] [&_[data-slot=card-title]]:min-w-0 [&_[data-slot=card-title]]:truncate'
            : '@container/card-header grid auto-rows-min items-start gap-1 rounded-t-lg px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
