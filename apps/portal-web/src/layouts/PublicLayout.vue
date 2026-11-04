<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import { navigationService, usePageStore } from '@/features/page'
import { ssoService } from '@/features/platform/auth'

const pageStore = usePageStore()

onMounted(() => void navigationService.fetchPublic())

const FALLBACK_NAV = [
  { id: 'home', label: 'Beranda', href: '/', isExternal: false },
  { id: 'berita', label: 'Berita', href: '/news', isExternal: false },
  { id: 'artikel', label: 'Artikel', href: '/articles', isExternal: false },
]

const nav = computed(() =>
  pageStore.publicNav.length > 0 ? pageStore.publicNav : FALLBACK_NAV,
)

const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="flex min-h-svh flex-col bg-background">
    <header class="border-b">
      <div
        class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4"
      >
        <RouterLink
          to="/"
          class="flex items-center gap-3"
        >
          <img
            src="/logo.webp"
            alt="Logo MTs Persis 241 Al-Ikhlash"
            class="h-10 w-10 object-contain"
          />
          <div>
            <p class="font-semibold leading-tight">Portal 241</p>
            <p class="text-xs text-muted-foreground">
              MTs Persis 241 Al-Ikhlash
            </p>
          </div>
        </RouterLink>

        <nav class="flex flex-wrap items-center gap-1">
          <template
            v-for="item in nav"
            :key="item.id"
          >
            <a
              v-if="item.isExternal"
              :href="item.href"
              rel="noopener"
              class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {{ item.label }}
            </a>
            <RouterLink
              v-else
              :to="item.href"
              class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              active-class="text-foreground font-medium"
            >
              {{ item.label }}
            </RouterLink>
          </template>

          <a
            :href="ssoService.accountsUrl('/')"
            class="ml-2"
          >
            <Button variant="outline">Masuk</Button>
          </a>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <RouterView />
    </main>

    <footer class="border-t py-6 text-center text-sm text-muted-foreground">
      &copy; {{ currentYear }} MTs Persis 241 Al-Ikhlash
    </footer>
  </div>
</template>
