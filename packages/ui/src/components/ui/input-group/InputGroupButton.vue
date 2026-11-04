<script setup lang="ts">
import type { InputGroupButtonProps } from '.'
import { cn } from '@mts241alikhlash/ui/utils'
import { Button } from '@mts241alikhlash/ui/button'
import { inputGroupButtonVariants } from '.'

const props = withDefaults(defineProps<InputGroupButtonProps>(), {
  size: 'xs',
  variant: 'ghost',
})
</script>

<template>
  <Button
    type="button"
    :data-size="props.size"
    :variant="props.variant"
    :class="cn(inputGroupButtonVariants({ size: props.size }), props.class)"
  >
    <slot />
  </Button>
</template>
