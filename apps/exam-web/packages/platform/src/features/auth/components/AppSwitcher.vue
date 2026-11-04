<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { LayoutGrid } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@mts241alikhlash/ui/dropdown-menu'
import { authConfig } from '../config'
import { useSsoApps } from '../composables/useSsoApps'
import { ssoService } from '../services/ssoService'

const { apps, load } = useSsoApps()

const others = computed(() =>
  apps.value.filter((app) => app.key !== authConfig.value.ssoApp),
)
const launcherUrl = ssoService.accountsUrl('/')

onMounted(() => {
  void load()
})
</script>

<template>
  <DropdownMenu v-if="apps.length > 0">
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Aplikasi lain"
      >
        <LayoutGrid class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      class="w-56"
    >
      <DropdownMenuLabel>Aplikasi</DropdownMenuLabel>
      <DropdownMenuItem
        v-for="app in others"
        :key="app.key"
        as-child
      >
        <a :href="app.url">{{ app.label }}</a>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem as-child>
        <a :href="launcherUrl">Semua aplikasi</a>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
