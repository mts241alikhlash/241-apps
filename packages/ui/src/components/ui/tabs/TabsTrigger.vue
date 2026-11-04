<script setup lang="ts">
import type { TabsTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { inject, computed } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TabsTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@mts241alikhlash/ui/utils'
import { tabsVariantKey } from './variant'

const props = defineProps<
  TabsTriggerProps & { class?: HTMLAttributes['class'] }
>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)

const variant = inject(tabsVariantKey, computed(() => 'default' as const))

const LINE_CLASSES =
  "text-muted-foreground hover:text-foreground focus-visible:inset-ring-ring/50 focus-visible:outline-ring relative inline-flex min-h-[var(--control-h-lg,2rem)] flex-none items-center justify-center gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2 text-[length:var(--text-control,0.75rem)] font-medium whitespace-nowrap shadow-none transition-colors focus-visible:inset-ring-[3px] focus-visible:outline-1 focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:border-primary dark:data-[state=active]:bg-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[var(--icon-control,0.875rem)]"
const DEFAULT_CLASSES =
  "text-foreground/60 hover:text-foreground focus-visible:ring-ring/50 focus-visible:outline-ring relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-[length:var(--text-control,0.75rem)] font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-input/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[var(--icon-control,0.875rem)]"
</script>

<template>
  <TabsTrigger
    data-slot="tabs-trigger"
    :class="cn(variant === 'line' ? LINE_CLASSES : DEFAULT_CLASSES, props.class)"
    v-bind="forwardedProps"
  >
    <slot />
  </TabsTrigger>
</template>
