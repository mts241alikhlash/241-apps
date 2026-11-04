<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { NavUser } from '@mts241alikhlash/ui'
import { SidebarProvider } from '@mts241alikhlash/ui/sidebar'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import ChangePasswordSection from '@/features/platform/profile/components/ChangePasswordSection.vue'
import { authService, useAuthStore, useSsoApps } from '@/features/platform/auth'
import { LayoutGrid, UserRound } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const store = useAuthStore()
const { apps, load } = useSsoApps()
void load()

const isPasswordDialogOpen = ref(false)

const backTo = computed(() =>
  apps.value.find((app) => app.key === route.query.from),
)

const userData = computed(() => ({
  name: store.user?.name?.trim() || store.user?.identifier || 'Pengguna',
  email: store.user?.identifier ?? '',
  avatar: '',
}))

function openPasswordDialog() {
  isPasswordDialogOpen.value = true
}

function handleViewProfile() {
  void router.push({ name: 'profile-view' })
}

async function handleLogout() {
  await authService.logoutUser()
  window.location.assign('/login')
}
</script>

<template>
  <SidebarProvider class="min-h-svh bg-muted/30">
    <div class="flex min-h-svh w-full flex-col">
      <header
        data-app-topbar
        class="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background px-3"
      >
        <RouterLink
          to="/"
          class="flex items-center gap-2 rounded-md px-1.5 py-1 font-semibold tracking-tight"
        >
          <img
            src="/logo.webp"
            alt="241 Akun"
            class="size-6 object-contain"
          />
          <span class="text-[length:var(--text-control,0.75rem)]"
            >241 Akun</span
          >
        </RouterLink>

        <nav class="flex items-center gap-1">
          <Button
            as-child
            variant="ghost"
            size="sm"
          >
            <RouterLink to="/">
              <LayoutGrid class="size-4" />
              Aplikasi
            </RouterLink>
          </Button>
          <Button
            as-child
            variant="ghost"
            size="sm"
          >
            <RouterLink to="/profile">
              <UserRound class="size-4" />
              Profil
            </RouterLink>
          </Button>
          <Button
            v-if="backTo"
            as-child
            variant="ghost"
            size="sm"
          >
            <a :href="backTo.url">Kembali ke {{ backTo.label }}</a>
          </Button>
        </nav>

        <div class="ml-auto flex shrink-0 items-center gap-2">
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
        <main class="min-w-0 flex-1">
          <slot><RouterView /></slot>
        </main>
      </TooltipProvider>
    </div>
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
