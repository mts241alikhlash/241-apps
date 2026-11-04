<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  variant?: 'default' | 'standard' | 'flush'
}>()
</script>

<template>
  <div
    data-slot="card-content"
    :class="
      cn(
        props.variant === 'standard'
          ? 'p-4'
          : props.variant === 'flush'
            ? 'p-0'
            : 'px-4 group-data-[size=sm]/card:px-3',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
