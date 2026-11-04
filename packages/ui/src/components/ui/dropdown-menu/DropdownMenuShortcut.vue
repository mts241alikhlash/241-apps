<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <span
    data-slot="dropdown-menu-shortcut"
    :class="
      cn('text-muted-foreground ml-auto text-[0.625rem] tracking-widest', props.class)
    "
  >
    <slot />
  </span>
</template>
