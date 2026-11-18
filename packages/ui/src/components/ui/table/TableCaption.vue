<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <caption
    data-slot="table-caption"
    :class="cn('text-muted-foreground mt-4 text-control', props.class)"
  >
    <slot />
  </caption>
</template>
