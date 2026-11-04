<script setup lang="ts">
import type { TabsRootEmits, TabsRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TabsRoot, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@mts241alikhlash/ui/utils'
import { computed, provide } from 'vue'
import { tabsVariantKey, type TabsVariant } from './variant'

const props = defineProps<
  TabsRootProps & { class?: HTMLAttributes['class']; variant?: TabsVariant }
>()
const emits = defineEmits<TabsRootEmits>()

provide(
  tabsVariantKey,
  computed(() => props.variant ?? 'default'),
)

const delegatedProps = reactiveOmit(props, 'class', 'variant')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <TabsRoot
    v-slot="slotProps"
    data-slot="tabs"
    v-bind="forwarded"
    :class="cn('flex flex-col gap-2', props.class)"
  >
    <slot v-bind="slotProps" />
  </TabsRoot>
</template>
