<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuRoot,
} from 'reka-ui'
import { Menu } from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@mts241alikhlash/ui/sheet'

const isMenuOpen = ref(false)

const props = withDefaults(
  defineProps<{ ready?: boolean; showStories?: boolean }>(),
  { ready: true, showStories: true },
)

const navigationItems = computed(() => [
  { label: 'Mengenal', id: 'kehidupan' },
  { label: 'Gelombang', id: 'gelombang' },
  { label: 'Alur Daftar', id: 'alur' },
  { label: 'Persyaratan', id: 'persyaratan' },
  ...(props.showStories ? [{ label: 'Cerita', id: 'cerita' }] : []),
  { label: 'FAQ', id: 'faq' },
])

const activeId = ref<string | null>(null)
let observer: IntersectionObserver | null = null

function closeMenu() {
  isMenuOpen.value = false
}

function observeSections() {
  observer?.disconnect()
  observer = null
  activeId.value = null
  if (typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activeId.value = entry.target.id
        else if (activeId.value === entry.target.id) activeId.value = null
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  )
  for (const item of navigationItems.value) {
    const section = document.getElementById(item.id)
    if (section) observer.observe(section)
  }
}

onMounted(() => {
  if (props.ready) observeSections()
})

watch(
  () => [props.ready, props.showStories],
  () => {
    if (props.ready) observeSections()
  },
  { flush: 'post' },
)

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95">
    <div
      class="mx-auto grid h-14 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-8"
    >
      <div class="col-start-1 row-start-1 flex items-center lg:hidden">
        <Sheet v-model:open="isMenuOpen">
          <SheetTrigger as-child>
            <button
              type="button"
              class="inline-flex min-h-11 w-fit items-center gap-2 rounded-md px-1 text-sm font-semibold text-[#203f73] hover:text-[#162d53] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203f73] lg:hidden"
              aria-label="Buka menu"
            >
              <Menu
                class="size-5"
                aria-hidden="true"
              />
              <span class="hidden sm:inline">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            class="w-72 max-w-[85vw]"
          >
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription class="sr-only">
                Navigasi halaman pendaftaran
              </SheetDescription>
            </SheetHeader>
            <nav
              class="grid gap-1 px-4"
              aria-label="Navigasi halaman"
            >
              <a
                v-for="item in navigationItems"
                :key="item.id"
                :href="`#${item.id}`"
                :aria-current="activeId === item.id ? 'true' : undefined"
                class="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary aria-[current=true]:bg-slate-50 aria-[current=true]:text-primary"
                @click="closeMenu"
              >
                {{ item.label }}
              </a>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      <NavigationMenuRoot
        class="col-start-2 row-start-1 hidden lg:block"
        aria-label="Navigasi halaman"
      >
        <NavigationMenuList class="flex items-center gap-4">
          <NavigationMenuItem
            v-for="item in navigationItems"
            :key="item.id"
          >
            <NavigationMenuLink as-child>
              <a
                :href="`#${item.id}`"
                :aria-current="activeId === item.id ? 'true' : undefined"
                class="inline-flex min-h-11 items-center border-b-2 border-transparent px-2 text-sm font-semibold text-[#203f73] hover:border-[#836d29] focus-visible:border-[#836d29] aria-[current=true]:border-[#836d29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203f73]"
              >
                {{ item.label }}
              </a>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenuRoot>
      <RouterLink
        to="/"
        class="col-start-2 row-start-1 flex h-11 items-center justify-center rounded-lg px-1 outline-none lg:col-start-1 lg:justify-self-start focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="PSB 241, kembali ke halaman utama"
        @click="closeMenu"
      >
        <picture>
          <source
            media="(min-width: 640px)"
            srcset="/logo-name.webp"
          />
          <img
            src="/logo.webp"
            alt="Logo MTs Persis 241 Al-Ikhlash"
            class="h-9 w-auto object-contain"
          />
        </picture>
      </RouterLink>

      <RouterLink
        to="/login"
        class="col-start-3 row-start-1 inline-flex min-h-11 items-center justify-center justify-self-end border-b-2 border-transparent px-2 text-sm font-semibold text-[#203f73] hover:border-[#836d29] focus-visible:border-[#836d29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203f73]"
        aria-label="Masuk atau daftar"
        @click="closeMenu"
        ><span class="sm:hidden">Masuk</span
        ><span class="hidden sm:inline">Masuk / Daftar</span></RouterLink
      >
    </div>
  </header>
</template>
