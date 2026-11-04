<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <span
    :class="cn(
      'text-muted-foreground gap-2 text-[length:var(--text-control,0.75rem)] leading-relaxed [&_svg:not([class*=size-])]:size-4 flex items-center [&_svg]:pointer-events-none',
      props.class,
    )"
  >
    <slot />
  </span>
</template>
