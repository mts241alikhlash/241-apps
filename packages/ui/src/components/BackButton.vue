<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@mts241alikhlash/ui/tooltip'

defineOptions({ inheritAttrs: false })

defineProps<{
  label: string
}>()
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
          class="-ml-1 size-[var(--control-h-md,2rem)] shrink-0"
          :aria-label="label"
        >
          <ArrowLeft />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {{ label }}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
