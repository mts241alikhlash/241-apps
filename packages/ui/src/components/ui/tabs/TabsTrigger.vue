<script setup lang="ts">
import type { TabsTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TabsTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@mts241alikhlash/ui/utils'

const props = defineProps<
  TabsTriggerProps & { class?: HTMLAttributes['class'] }
>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)

const CLASSES =
  "text-muted-foreground hover:text-foreground focus-visible:inset-ring-ring/50 focus-visible:outline-ring relative inline-flex min-h-[var(--control-h-lg,2rem)] flex-none items-center justify-center gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2 text-control font-medium whitespace-nowrap shadow-none transition-colors focus-visible:inset-ring-[3px] focus-visible:outline-1 focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:border-primary dark:data-[state=active]:bg-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[var(--icon-control,0.875rem)]"
</script>

<template>
  <TabsTrigger
    data-slot="tabs-trigger"
    :class="cn(CLASSES, props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </TabsTrigger>
</template>
