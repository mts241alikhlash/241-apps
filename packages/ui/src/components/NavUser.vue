<script setup lang="ts">
import { ChevronsUpDown, KeyRound, LogOut, UserRound } from '@lucide/vue'
import { computed } from 'vue'

import { Avatar, AvatarFallback, AvatarImage } from '@mts241alikhlash/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@mts241alikhlash/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@mts241alikhlash/ui/sidebar'

const props = defineProps<{
  user: {
    name: string
    email: string
    avatar: string
  }
  compact?: boolean
}>()

const emit = defineEmits<{
  viewProfile: []
  changePassword: []
  logout: []
}>()

const { isMobile } = useSidebar()

const initials = computed(() => {
  return (
    props.user.name
      .split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?'
  )
})
</script>

<template>
  <component :is="compact ? 'div' : SidebarMenu">
    <component :is="compact ? 'div' : SidebarMenuItem">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            v-if="compact"
            type="button"
            class="rounded-full outline-hidden focus-visible:outline-1 focus-visible:outline-solid focus-visible:-outline-offset-1 focus-visible:outline-ring"
          >
            <Avatar class="size-8">
              <AvatarImage
                :src="user.avatar"
                :alt="user.name"
              />
              <AvatarFallback class="bg-muted text-xs">
                {{ initials }}
              </AvatarFallback>
            </Avatar>
            <span class="sr-only">{{ user.name }}</span>
          </button>
          <SidebarMenuButton
            v-else
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar class="h-8 w-8 rounded-md">
              <AvatarImage
                :src="user.avatar"
                :alt="user.name"
              />
              <AvatarFallback class="rounded-md bg-muted">
                {{ initials }}
              </AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">{{ user.name }}</span>
              <span
                class="truncate text-xs text-muted-foreground in-[[data-sidebar=menu-button]:hover]:text-sidebar-accent-foreground in-[[data-sidebar=menu-button][data-state=open]]:text-sidebar-accent-foreground"
                >{{ user.email }}</span
              >
            </div>
            <ChevronsUpDown class="ml-auto size-[var(--icon-control,0.875rem)] text-muted-foreground" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-(--reka-dropdown-menu-trigger-width) min-w-48 rounded-md"
          :side="isMobile || compact ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <DropdownMenuLabel class="font-normal">
            <div class="flex items-center gap-2 text-left text-sm">
              <Avatar class="size-7 rounded-md">
                <AvatarImage
                  :src="user.avatar"
                  :alt="user.name"
                />
                <AvatarFallback class="rounded-md bg-muted text-xs">
                  {{ initials }}
                </AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate text-xs font-medium">{{ user.name }}</span>
                <span class="truncate text-xs text-muted-foreground">{{
                  user.email
                }}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              class="text-xs"
              @click="emit('viewProfile')"
            >
              <UserRound class="size-[var(--icon-control,0.875rem)]" />
              Lihat Profil
            </DropdownMenuItem>
            <DropdownMenuItem
              class="text-xs"
              @click="emit('changePassword')"
            >
              <KeyRound class="size-[var(--icon-control,0.875rem)]" />
              Ganti Password
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            class="text-xs"
            variant="destructive"
            @click="emit('logout')"
          >
            <LogOut class="size-[var(--icon-control,0.875rem)]" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </component>
  </component>
</template>
