<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="card-footer"
    :class="
      cn(
        'flex min-h-[2.5rem] items-center justify-end gap-2 border-t bg-muted/30 px-4 py-0.5',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
