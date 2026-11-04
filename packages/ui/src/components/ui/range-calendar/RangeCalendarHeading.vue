<script lang="ts" setup>
import { cn } from '@mts241alikhlash/ui/utils'
import { reactiveOmit } from '@vueuse/core'
import type { RangeCalendarHeadingProps } from 'reka-ui'
import { RangeCalendarHeading, useForwardProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'

const props = defineProps<
  RangeCalendarHeadingProps & { class?: HTMLAttributes['class'] }
>()

defineSlots<{
  default: (props: { headingValue: string }) => void
}>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RangeCalendarHeading
    v-slot="{ headingValue }"
    data-slot="range-calendar-heading"
    :class="cn('text-[length:var(--text-control,0.75rem)] font-medium', props.class)"
    v-bind="forwardedProps"
  >
    <slot :heading-value>
      {{ headingValue }}
    </slot>
  </RangeCalendarHeading>
</template>
