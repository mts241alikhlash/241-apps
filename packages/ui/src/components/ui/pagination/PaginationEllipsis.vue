<script setup lang="ts">
import type { PaginationEllipsisProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { MoreHorizontal } from '@lucide/vue'
import { PaginationEllipsis } from 'reka-ui'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<
  PaginationEllipsisProps & { class?: HTMLAttributes['class'] }
>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <PaginationEllipsis
    data-slot="pagination-ellipsis"
    v-bind="delegatedProps"
    :class="cn('flex size-[var(--control-h-md,1.75rem)] items-center justify-center', props.class)"
  >
    <slot>
      <MoreHorizontal class="size-[var(--icon-control,0.875rem)]" />
      <span class="sr-only">More pages</span>
    </slot>
  </PaginationEllipsis>
</template>
