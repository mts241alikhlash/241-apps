<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <legend
    data-slot="field-legend"
    :class="cn('mb-2 font-medium text-control', props.class)"
  >
    <slot />
  </legend>
</template>
