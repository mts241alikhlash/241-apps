<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="dialog-body"
    :class="cn('dialog-body min-h-0 flex-1 overflow-y-auto', props.class)"
  >
    <slot />
  </div>
</template>
