<script lang="ts" setup>
import type { CalendarNextProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronRight } from '@lucide/vue'
import { CalendarNext, useForwardProps } from 'reka-ui'
import { cn } from '@mts241alikhlash/ui/utils'
import { buttonVariants } from '@mts241alikhlash/ui/button'

const props = defineProps<
  CalendarNextProps & { class?: HTMLAttributes['class'] }
>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CalendarNext
    data-slot="calendar-next-button"
    :class="
      cn(
        buttonVariants({ variant: 'outline' }),
        'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        props.class,
      )
    "
    v-bind="forwardedProps"
  >
    <slot>
      <ChevronRight class="size-[var(--icon-control,0.875rem)]" />
    </slot>
  </CalendarNext>
</template>
