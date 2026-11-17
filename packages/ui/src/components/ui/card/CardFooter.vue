<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  plain?: boolean
}>()
</script>

<template>
  <div
    data-slot="card-footer"
    :data-plain="plain ? 'true' : undefined"
    :class="
      cn(
        props.plain
          ? 'flex h-1 shrink-0'
          : 'flex min-h-[calc(var(--control-h-md,2rem)+1rem)] items-center justify-end gap-2 border-t bg-muted/30 px-4 py-0.5',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
