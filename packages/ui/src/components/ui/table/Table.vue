<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="table-container"
    class="relative w-full"
  >
    <table
      data-slot="table"
      :class="cn('w-full caption-bottom text-[length:var(--text-control,0.75rem)]', props.class)"
    >
      <slot />
    </table>
  </div>
</template>
