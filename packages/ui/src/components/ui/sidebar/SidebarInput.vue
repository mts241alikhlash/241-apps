<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'
import { Input } from '@mts241alikhlash/ui/input'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Input
    data-slot="sidebar-input"
    data-sidebar="input"
    :class="
      cn(
        'bg-background h-[var(--control-h-md,2rem)] w-full text-control shadow-none',
        props.class,
      )
    "
  >
    <slot />
  </Input>
</template>
