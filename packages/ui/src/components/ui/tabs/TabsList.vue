<script setup lang="ts">
import type { TabsListProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { inject, computed } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TabsList } from 'reka-ui'
import { cn } from '@mts241alikhlash/ui/utils'
import { tabsVariantKey } from './variant'

const props = defineProps<TabsListProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const variant = inject(tabsVariantKey, computed(() => 'default' as const))

const LINE_CLASSES =
  'text-muted-foreground flex h-auto items-center justify-start gap-0 overflow-x-auto overflow-y-hidden rounded-none border-b bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
const DEFAULT_CLASSES =
  'text-muted-foreground inline-flex h-8 w-fit items-center justify-center rounded-md bg-muted p-[3px]'
</script>

<template>
  <TabsList
    data-slot="tabs-list"
    v-bind="delegatedProps"
    :class="cn(variant === 'line' ? LINE_CLASSES : DEFAULT_CLASSES, props.class)"
  >
    <slot />
  </TabsList>
</template>
