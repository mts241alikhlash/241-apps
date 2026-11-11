<script setup lang="ts">
import { Check } from '@lucide/vue'
import { computed } from 'vue'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@mts241alikhlash/ui/dropdown-menu'
import { useSidebar } from './ui/sidebar/utils'

export interface AppSwitcherItem {
  key: string
  name: string
  logo: string
}

const props = defineProps<{
  apps: AppSwitcherItem[]
  currentKey: string
}>()

const emit = defineEmits<{
  select: [app: AppSwitcherItem]
}>()

let sidebar: ReturnType<typeof useSidebar> | null = null
try {
  sidebar = useSidebar()
} catch {
  sidebar = null
}

const isCollapsed = computed(() => sidebar?.state.value === 'collapsed')

const current = computed(
  () => props.apps.find((app) => app.key === props.currentKey) ?? props.apps[0],
)
</script>

<template>
  <DropdownMenu v-if="current">
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="hover:bg-accent data-[state=open]:bg-accent flex items-center rounded-md outline-hidden focus-visible:outline-1 focus-visible:outline-solid focus-visible:-outline-offset-1 focus-visible:outline-ring"
        :class="
          isCollapsed
            ? 'size-8 justify-center p-0 mx-auto'
            : 'w-full justify-start gap-2 px-1.5 py-1 text-left max-md:size-8 max-md:justify-center max-md:p-0'
        "
      >
        <img
          :src="current.logo"
          :alt="current.name"
          class="size-7 shrink-0 rounded-md object-contain"
        />
        <span
          v-if="!isCollapsed"
          class="max-md:hidden truncate text-left text-sm font-medium"
        >
          {{ current.name }}
        </span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="start"
      :side-offset="4"
      class="min-w-48 rounded-md"
    >
      <DropdownMenuItem
        v-for="app in apps"
        :key="app.key"
        class="text-xs"
        @click="emit('select', app)"
      >
        <img
          :src="app.logo"
          :alt="''"
          class="size-5 rounded-md object-contain"
        />
        {{ app.name }}
        <Check
          v-if="app.key === current.key"
          class="ml-auto size-3.5"
        />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
