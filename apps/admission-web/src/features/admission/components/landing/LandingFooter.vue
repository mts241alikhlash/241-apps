<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = withDefaults(
  defineProps<{
    showDownloads?: boolean
    showInfo?: boolean
    showStories?: boolean
  }>(),
  { showStories: true },
)

const currentYear = new Date().getFullYear()

const navigationItems = computed(() => [
  { label: 'Mengenal', id: 'kehidupan' },
  { label: 'Gelombang', id: 'gelombang' },
  ...(props.showInfo ? [{ label: 'Informasi PPDB', id: 'informasi' }] : []),
  { label: 'Alur Daftar', id: 'alur' },
  { label: 'Persyaratan', id: 'persyaratan' },
  ...(props.showDownloads ? [{ label: 'Unduhan', id: 'unduhan' }] : []),
  ...(props.showStories ? [{ label: 'Cerita', id: 'cerita' }] : []),
  { label: 'FAQ', id: 'faq' },
])

const linkClass =
  'inline-flex min-h-9 items-center text-sm font-medium text-[#203f73] decoration-[#836d29] decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203f73]'
</script>

<template>
  <footer class="border-t border-[#203f73]/20 bg-[#f5f2e9]">
    <div class="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 lg:px-8">
      <div
        class="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr] lg:text-left"
      >
        <img
          src="/logo-name.webp"
          alt="MTs Persis 241 Al-Ikhlash"
          width="1200"
          height="329"
          class="mx-auto h-12 w-auto object-contain sm:col-span-2 lg:col-span-1 lg:mx-0"
        />
        <nav aria-labelledby="footer-pages">
          <h2
            id="footer-pages"
            class="text-xs font-semibold tracking-wide text-slate-600 uppercase"
          >
            Halaman
          </h2>
          <ul class="mt-2 grid gap-0.5">
            <li
              v-for="item in navigationItems"
              :key="item.id"
            >
              <a
                :href="`#${item.id}`"
                :class="linkClass"
                >{{ item.label }}</a
              >
            </li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-account">
          <h2
            id="footer-account"
            class="text-xs font-semibold tracking-wide text-slate-600 uppercase"
          >
            Akun
          </h2>
          <ul class="mt-2 grid gap-0.5">
            <li>
              <RouterLink
                to="/login"
                :class="linkClass"
                >Masuk / Daftar</RouterLink
              >
            </li>
          </ul>
        </nav>
      </div>
      <p
        class="mt-8 border-t border-[#203f73]/15 pt-6 text-xs text-slate-700 lg:text-left"
      >
        © {{ currentYear }} MTs Persis 241 Al-Ikhlash
      </p>
    </div>
  </footer>
</template>
