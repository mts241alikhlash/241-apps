<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ArrowLeftToLine, ArrowRightToLine } from '@lucide/vue'
import { cn } from '@mts241alikhlash/ui/utils'
import SidebarMenu from './SidebarMenu.vue'
import SidebarMenuButton from './SidebarMenuButton.vue'
import SidebarMenuItem from './SidebarMenuItem.vue'
import { useSidebar } from './utils'

const props = withDefaults(
  defineProps<{
    collapseLabel?: string
    expandLabel?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    collapseLabel: 'Collapse sidebar',
    expandLabel: 'Expand sidebar',
  },
)

const { state, toggleSidebar } = useSidebar()
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton
        data-slot="sidebar-toggle"
        :class="cn(props.class)"
        :tooltip="state === 'collapsed' ? expandLabel : collapseLabel"
        @click="toggleSidebar"
      >
        <ArrowRightToLine v-if="state === 'collapsed'" />
        <ArrowLeftToLine v-else />
        <span>{{ state === 'collapsed' ? expandLabel : collapseLabel }}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
