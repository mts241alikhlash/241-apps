<script setup lang="ts">
import { Check } from '@lucide/vue'
import { computed } from 'vue'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@mts241alikhlash/ui/dropdown-menu'

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

const current = computed(
  () => props.apps.find((app) => app.key === props.currentKey) ?? props.apps[0],
)
</script>

<template>
  <DropdownMenu v-if="current">
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="hover:bg-accent data-[state=open]:bg-accent flex items-center gap-2 rounded-md p-1 outline-hidden focus-visible:outline-1 focus-visible:outline-solid focus-visible:-outline-offset-1 focus-visible:outline-ring"
      >
        <img
          :src="current.logo"
          :alt="current.name"
          class="size-7 rounded-md object-contain"
        />
        <span class="text-sm font-medium max-md:hidden">{{
          current.name
        }}</span>
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
