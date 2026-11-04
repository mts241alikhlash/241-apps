<script setup lang="ts">
import type { SidebarProps } from '@mts241alikhlash/ui/sidebar'

import { useAuthSession } from '@/features/platform/auth'
import { useMenuVisibility } from '@/composables/useMenuVisibility'
import NavMain from './NavMain.vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarToggle,
} from '@mts241alikhlash/ui/sidebar'
import { onMounted, ref } from 'vue'

const props = withDefaults(defineProps<SidebarProps>(), {
  variant: 'inset',
  collapsible: 'icon',
})

const { user, syncAuthenticatedUserProfile } = useAuthSession()
const { filteredSections } = useMenuVisibility()

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
  <Sidebar v-bind="props">
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
