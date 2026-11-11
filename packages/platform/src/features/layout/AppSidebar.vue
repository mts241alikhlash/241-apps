<script setup lang="ts">
import type { SidebarProps } from '@mts241alikhlash/ui/sidebar'

import type { MenuSection } from '@mts241alikhlash/web-shared/types/menu.types'
import { useAuthSession } from '../auth'
import { useMenuVisibility } from './useMenuVisibility'
import NavMain from './NavMain.vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarToggle,
  useSidebar,
} from '@mts241alikhlash/ui/sidebar'
import { computed, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<
    SidebarProps & {
      menuSections: MenuSection[]
      permissionsFor?: (codes: string[]) => string[]
    }
  >(),
  {
    variant: 'floating',
    collapsible: 'icon',
    permissionsFor: (codes: string[]) => codes,
  },
)

const { user, syncAuthenticatedUserProfile } = useAuthSession()
const { state: sidebarState } = useSidebar()
const isCollapsed = computed(() => sidebarState.value === 'collapsed')
const { filteredSections } = useMenuVisibility(
  props.menuSections,
  props.permissionsFor,
)

const scrollContainer = ref<HTMLDivElement | null>(null)
const STORAGE_KEY = 'sidebar-scroll-position'

onMounted(() => {
  if (user.value) {
    void syncAuthenticatedUserProfile()
  }

  const saved = sessionStorage.getItem(STORAGE_KEY)
  if (saved && scrollContainer.value) {
    scrollContainer.value.scrollTop = parseInt(saved, 10)
  }
})

function handleScroll(e: Event) {
  const target = e.target as HTMLDivElement
  sessionStorage.setItem(STORAGE_KEY, String(target.scrollTop))
}
</script>

<template>
  <Sidebar
    :variant="props.variant"
    :collapsible="props.collapsible"
  >
    <SidebarHeader
      class="flex h-12 flex-row items-center"
      :class="isCollapsed ? 'justify-center px-0' : 'justify-start px-2'"
    >
      <slot name="header" />
    </SidebarHeader>
    <SidebarContent>
      <div
        ref="scrollContainer"
        class="h-full w-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
        @scroll="handleScroll"
      >
        <NavMain :sections="filteredSections" />
      </div>
    </SidebarContent>
    <SidebarFooter>
      <SidebarToggle />
    </SidebarFooter>
  </Sidebar>
</template>
