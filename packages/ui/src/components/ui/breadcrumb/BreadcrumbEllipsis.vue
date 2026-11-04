<script lang="ts" setup>
import type { HTMLAttributes } from 'vue'
import { MoreHorizontal } from '@lucide/vue'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <span
    data-slot="breadcrumb-ellipsis"
    role="presentation"
    aria-hidden="true"
    :class="cn('flex size-4 items-center justify-center', props.class)"
  >
    <slot>
      <MoreHorizontal class="size-3.5" />
    </slot>
    <span class="sr-only">More</span>
  </span>
</template>
