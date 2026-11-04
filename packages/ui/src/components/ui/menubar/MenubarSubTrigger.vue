<script setup lang="ts">
import type { MenubarSubTriggerProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { ChevronRightIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from '@mts241alikhlash/ui/utils'
import { MenubarSubTrigger, useForwardProps } from 'reka-ui'

const props = defineProps<MenubarSubTriggerProps & { class?: HTMLAttributes['class'], inset?: boolean }>()

const delegatedProps = reactiveOmit(props, 'class', 'inset')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <MenubarSubTrigger
    data-slot="menubar-sub-trigger"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="cn(
      'focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground min-h-[var(--control-h-md,1.75rem)] gap-2 rounded-md px-2 py-1 text-[length:var(--text-control,0.75rem)] data-inset:pl-7.5 [&_svg:not([class*=size-])]:size-4 flex cursor-default items-center outline-none select-none',
      props.class,
    )"
  >
    <slot />
    <ChevronRightIcon class="cn-rtl-flip ml-auto size-[var(--icon-control,0.875rem)]" />
  </MenubarSubTrigger>
</template>
