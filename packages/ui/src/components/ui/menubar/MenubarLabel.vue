<script setup lang="ts">
import type { MenubarLabelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from '@mts241alikhlash/ui/utils'
import { MenubarLabel } from 'reka-ui'

const props = defineProps<MenubarLabelProps & { class?: HTMLAttributes['class'], inset?: boolean }>()
const delegatedProps = reactiveOmit(props, 'class', 'inset')
</script>

<template>
  <MenubarLabel
    data-slot="menubar-label"
    :data-inset="inset ? '' : undefined"
    v-bind="delegatedProps"
    :class="cn('text-muted-foreground px-2 py-1.5 text-[length:var(--text-control,0.75rem)] data-inset:pl-7.5', props.class)"
  >
    <slot />
  </MenubarLabel>
</template>
