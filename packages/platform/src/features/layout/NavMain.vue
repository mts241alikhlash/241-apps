<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@mts241alikhlash/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@mts241alikhlash/ui/dropdown-menu'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@mts241alikhlash/ui/sidebar'
import type {
  MenuItem,
  MenuSection,
  SubMenuItem,
} from '@mts241alikhlash/web-shared/types/menu.types'
import { ChevronRight } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  sections: MenuSection[]
}>()

const route = useRoute()
const { t } = useI18n()
const { isMobile, setOpenMobile, state } = useSidebar()

const iconOnly = computed(() => state.value === 'collapsed' && !isMobile.value)

function handleLinkClick() {
  if (isMobile.value) {
    setOpenMobile(false)
  }
}

const activeItems = computed(() => {
  const set = new Set<string>()

  for (const section of props.sections) {
    for (const item of section.items) {
      if (item.items?.some((sub: SubMenuItem) => isSubActive(sub, item))) {
        set.add(item.title)
      }
    }
  }

  return set
})

function isItemActive(item: MenuItem): boolean {
  return activeItems.value.has(item.title)
}

function isSubActive(sub: SubMenuItem, parentItem: MenuItem): boolean {
  if (sub.url === '#') return false
  const path = route.path

  const hasBetterSiblingMatch = parentItem.items?.some((sibling) => {
    if (sibling.url === sub.url || sibling.url === '#') return false
    return sibling.url.length > sub.url.length && path.startsWith(sibling.url)
  })

  if (hasBetterSiblingMatch) return false

  return path === sub.url || path.startsWith(sub.url + '/')
}
</script>

<template>
  <SidebarGroup
    v-for="section in sections"
    :key="section.label"
  >
    <SidebarGroupLabel>{{ t(section.label) }}</SidebarGroupLabel>
    <SidebarMenu>
      <template
        v-for="item in section.items"
        :key="item.title"
      >
        <SidebarMenuItem v-if="!item.items?.length">
          <SidebarMenuButton
            as-child
            :tooltip="t(item.title)"
            :is-active="route.path === item.url"
          >
            <RouterLink
              :to="item.url"
              @click="handleLinkClick"
            >
              <component :is="item.icon" />
              <span>{{ t(item.title) }}</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem v-else-if="iconOnly">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton
                :tooltip="t(item.title)"
                :is-active="isItemActive(item)"
                :aria-label="t(item.title)"
              >
                <component :is="item.icon" />
                <span>{{ t(item.title) }}</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="start"
              class="min-w-48"
            >
              <DropdownMenuLabel>{{ t(item.title) }}</DropdownMenuLabel>
              <DropdownMenuItem
                v-for="subItem in item.items"
                :key="subItem.title"
                as-child
              >
                <RouterLink
                  :to="subItem.url"
                  :aria-current="
                    isSubActive(subItem, item) ? 'page' : undefined
                  "
                  @click="handleLinkClick"
                >
                  {{ t(subItem.title) }}
                </RouterLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>

        <Collapsible
          v-else
          as-child
          :default-open="isItemActive(item)"
          class="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger as-child>
              <SidebarMenuButton
                :tooltip="t(item.title)"
                :is-active="isItemActive(item)"
              >
                <component :is="item.icon" />
                <span>{{ t(item.title) }}</span>
                <ChevronRight
                  class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem
                  v-for="subItem in item.items"
                  :key="subItem.title"
                >
                  <SidebarMenuSubButton
                    as-child
                    :is-active="isSubActive(subItem, item)"
                  >
                    <RouterLink
                      :to="subItem.url"
                      @click="handleLinkClick"
                    >
                      <span>{{ t(subItem.title) }}</span>
                    </RouterLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </template>
    </SidebarMenu>
  </SidebarGroup>
</template>
