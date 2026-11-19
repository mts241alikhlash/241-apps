<script setup lang="ts">
import { Button } from '@mts241alikhlash/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@mts241alikhlash/ui/tooltip'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    label: string
    side?: 'top' | 'right' | 'bottom' | 'left'
  }>(),
  { side: 'top' },
)
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          v-bind="$attrs"
          type="button"
          variant="ghost"
          size="icon"
          :aria-label="label"
        >
          <slot />
        </Button>
      </TooltipTrigger>
      <TooltipContent :side="side">
        <slot name="label">{{ label }}</slot>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
