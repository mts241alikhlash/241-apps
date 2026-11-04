<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { PanelLeft } from '@lucide/vue'
import { cn } from '@mts241alikhlash/ui/utils'
import { Button } from '@mts241alikhlash/ui/button'
import { useSidebar } from './utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const { toggleSidebar } = useSidebar()
</script>

<template>
  <Button
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="icon"
    :class="cn('h-[var(--control-h-md,1.75rem)] w-[var(--control-h-md,1.75rem)]', props.class)"
    @click="toggleSidebar"
  >
    <slot>
      <PanelLeft />
    </slot>
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
