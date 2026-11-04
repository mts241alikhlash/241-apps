<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { DialogClose } from 'reka-ui'
import { cn } from '@mts241alikhlash/ui/utils'
import { Button } from '@mts241alikhlash/ui/button'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
    showCloseButton?: boolean
    standard?: boolean
  }>(),
  {
    showCloseButton: false,
  },
)
</script>

<template>
  <div
    data-slot="dialog-footer"
    :class="
      cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        props.standard && 'min-h-[var(--control-h-lg,2rem)] shrink-0 flex-row items-center border-t bg-muted/30 px-4 py-0.5',
        props.class,
      )
    "
  >
    <slot />
    <DialogClose
      v-if="showCloseButton"
      as-child
    >
      <Button variant="outline"> Close </Button>
    </DialogClose>
  </div>
</template>
