<script lang="ts" setup>
import type { DrawerTitleProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from '@mts241alikhlash/ui/utils'
import { DrawerTitle } from 'reka-ui'

const props = defineProps<DrawerTitleProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <DrawerTitle
    data-slot="drawer-title"
    v-bind="delegatedProps"
    :class="cn('text-foreground text-sm font-medium cn-font-heading', props.class)"
  >
    <slot />
  </DrawerTitle>
</template>
