<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@mts241alikhlash/ui/utils'
import { NumberFieldInput } from 'reka-ui'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <NumberFieldInput
    data-slot="input"
    :class="cn(
      'bg-transparent dark:bg-input/30 border-input focus-visible:border-ring aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-[var(--control-h-md,1.75rem)] rounded-md border px-2 py-0.5 text-sm transition-colors file:h-[var(--control-h-sm,1.5rem)] file:text-[length:var(--text-control,0.75rem)] leading-relaxed file:font-medium md:text-[length:var(--text-control,0.75rem)] leading-relaxed w-full min-w-0 text-center outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
  />
</template>
