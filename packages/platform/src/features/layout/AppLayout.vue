<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@mts241alikhlash/ui/breadcrumb'
import { Button } from '@mts241alikhlash/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@mts241alikhlash/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { ChangePasswordSection } from '../profile'
import { NavUser } from '@mts241alikhlash/ui'
import { SidebarInset, SidebarProvider } from '@mts241alikhlash/ui/sidebar'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import { useAuthSession } from '../auth'
import type { MenuSection } from '@mts241alikhlash/web-shared/types/menu.types'
import { Search } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import type { BreadcrumbItemType } from '@mts241alikhlash/web-shared/types/breadcrumb.types'
import { provideBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { computed, ref } from 'vue'

const { user, logoutUser } = useAuthSession()
const router = useRouter()
const openSearch = ref(false)

const isPasswordDialogOpen = ref(false)

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrator',
  TEACHER: 'Guru',
  STUDENT: 'Siswa',
}

const displayName = computed(() => {
  const currentUser = user.value
  return (
    currentUser?.profile?.name?.trim() ??
    currentUser?.name?.trim() ??
    'Pengguna'
  )
})

const displayRole = computed(() => {
  const roles = user.value?.roles ?? []
  if (roles.length === 0) return 'Akun'
  return roles.map((r) => ROLE_LABELS[r] ?? r).join(', ')
})

const userData = computed(() => ({
  name: displayName.value,
  email: displayRole.value,
  avatar: user.value?.profile?.avatar ?? '',
}))

function openPasswordDialog() {
  isPasswordDialogOpen.value = true
}

async function handleLogout() {
  await logoutUser()
  await router.push({ name: 'login' })
}

function handleViewProfile() {
  void router.push({ name: 'profile-view' })
}

const props = withDefaults(
  defineProps<{
    breadcrumbs?: BreadcrumbItemType[]
    menuSections: MenuSection[]
    permissionsFor?: (codes: string[]) => string[]
  }>(),
  {
    breadcrumbs: () => [],
    permissionsFor: (codes: string[]) => codes,
  },
)

const route = useRoute()
const breadcrumbOverride = provideBreadcrumbs()

const resolvedBreadcrumbs = computed<BreadcrumbItemType[]>(() =>
  props.breadcrumbs.length > 0
    ? props.breadcrumbs
    : (breadcrumbOverride.value ?? route.meta.breadcrumbs ?? []),
)

const searchGroups = computed(() => {
  return props.menuSections.flatMap((section) =>
    section.items.map((group) => ({
      heading: group.title,
      items: group.items
        ? group.items.map((item) => ({ title: item.title, url: item.url }))
        : [{ title: group.title, url: group.url }],
    })),
  )
})
</script>

<template>
  <SidebarProvider
    class="h-svh"
    style="--sidebar-width: 11rem"
  >
    <TooltipProvider :delay-duration="100">
      <AppSidebar
        :menu-sections="menuSections"
        :permissions-for="permissionsFor"
      >
        <template #header>
          <slot name="app-switcher" />
        </template>
      </AppSidebar>
      <SidebarInset class="flex h-svh min-w-0 flex-1 flex-col overflow-hidden">
        <header
          class="mx-2 mt-2 mb-2 flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-card/85 px-3 shadow-xs backdrop-blur-md"
        >
          <slot name="breadcrumb">
            <Breadcrumb class="min-w-0">
              <BreadcrumbList class="min-w-0 flex-nowrap">
                <template v-if="resolvedBreadcrumbs.length > 0">
                  <template
                    v-for="(item, index) in resolvedBreadcrumbs"
                    :key="index"
                  >
                    <BreadcrumbItem
                      :class="{
                        'hidden md:block':
                          index < resolvedBreadcrumbs.length - 1,
                      }"
                    >
                      <BreadcrumbPage
                        v-if="index === resolvedBreadcrumbs.length - 1"
                        class="block max-w-28 truncate sm:max-w-xs"
                      >
                        {{ item.title }}
                      </BreadcrumbPage>
                      <BreadcrumbLink
                        v-else-if="item.href"
                        :href="item.href"
                        class="block max-w-40 truncate"
                      >
                        {{ item.title }}
                      </BreadcrumbLink>
                      <span v-else>{{ item.title }}</span>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator
                      v-if="index < resolvedBreadcrumbs.length - 1"
                      class="hidden md:block"
                    />
                  </template>
                </template>
              </BreadcrumbList>
            </Breadcrumb>
          </slot>
          <div class="ml-auto flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cari halaman"
              class="hidden size-8 rounded-full bg-muted transition-colors hover:bg-muted/80 md:inline-flex"
              @click="openSearch = true"
            >
              <Search class="size-4" />
            </Button>

            <CommandDialog v-model:open="openSearch">
              <CommandInput placeholder="Ketik pencarian..." />
              <CommandList>
                <CommandEmpty>Tidak ada hasil yang ditemukan.</CommandEmpty>
                <CommandGroup
                  v-for="group in searchGroups"
                  :key="group.heading"
                  :heading="group.heading"
                >
                  <CommandItem
                    v-for="item in group.items"
                    :key="item.title"
                    :value="item.title"
                    @select="
                      () => {
                        router.push(item.url)
                        openSearch = false
                      }
                    "
                  >
                    {{ item.title }}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </CommandDialog>

            <NavUser
              compact
              :user="userData"
              @view-profile="handleViewProfile"
              @change-password="openPasswordDialog"
              @logout="handleLogout"
            />
          </div>
        </header>
        <div
          data-app-scroll
          class="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-2 pb-2"
        >
          <slot><RouterView /></slot>
        </div>
      </SidebarInset>
    </TooltipProvider>
  </SidebarProvider>

  <Dialog v-model:open="isPasswordDialogOpen">
    <DialogContent class="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Ganti Password</DialogTitle>
        <DialogDescription
          >Masukkan password saat ini dan password baru untuk akun
          Anda.</DialogDescription
        >
      </DialogHeader>

      <ChangePasswordSection v-if="isPasswordDialogOpen" />
    </DialogContent>
  </Dialog>
</template>
