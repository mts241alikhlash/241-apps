<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  variant?: 'legend' | 'label'
}>()
</script>

<template>
  <legend
    data-slot="field-legend"
    :data-variant="variant"
    :class="
      cn(
        'mb-2 font-medium',
        'data-[variant=legend]:text-sm',
        'data-[variant=label]:text-[length:var(--text-control,0.75rem)]',
        props.class,
      )
    "
  >
    <slot />
  </legend>
</template>
