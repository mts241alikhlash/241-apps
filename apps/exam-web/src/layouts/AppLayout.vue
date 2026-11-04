<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue'
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
import ChangePasswordSection from '@/features/platform/profile/components/ChangePasswordSection.vue'
import { NavUser } from '@mts241alikhlash/ui'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@mts241alikhlash/ui/sidebar'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import HeaderAppSwitcher from '@/components/layout/HeaderAppSwitcher.vue'
import { useAuthSession } from '@/features/platform/auth'
import { menuSections } from '@/config/menuConfig'
import { Menu, Search } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import type { BreadcrumbItemType } from '@mts241alikhlash/web-shared/types/breadcrumb.types'
import { provideBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { computed, ref } from 'vue'

const { user, logoutUser } = useAuthSession()
const router = useRouter()
const openSearch = ref(false)

const isPasswordDialogOpen = ref(false)
const scrolled = ref(false)

function handleScroll(event: Event) {
  scrolled.value = (event.target as HTMLElement).scrollTop > 0
}

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
  }>(),
  {
    breadcrumbs: () => [],
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
  return menuSections.flatMap((section) =>
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
    class="h-svh pt-12"
    style="--sidebar-offset: 3rem; --sidebar-width: 11rem"
  >
    <header
      data-app-topbar
      class="fixed inset-x-0 top-0 z-20 flex h-12 items-center gap-2 bg-background px-3"
    >
      <SidebarTrigger
        class="size-8 shrink-0 md:hidden"
        aria-label="Buka menu"
      >
        <Menu class="size-4" />
      </SidebarTrigger>
      <div class="max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2">
        <HeaderAppSwitcher />
      </div>
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
    <TooltipProvider :delay-duration="100">
      <AppSidebar />
      <SidebarInset
        class="h-[calc(100svh-3rem-0.5rem)] overflow-hidden peer-data-[variant=inset]:mt-0"
      >
        <header
          class="flex h-8 min-w-0 shrink-0 items-center gap-2 border-b px-4 transition-colors sm:px-6"
          :class="scrolled ? 'border-border' : 'border-transparent'"
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
        </header>
        <div
          data-app-scroll
          class="min-h-0 min-w-0 flex-1 overflow-auto"
          @scroll="handleScroll"
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
