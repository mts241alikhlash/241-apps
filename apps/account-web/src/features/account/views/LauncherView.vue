<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useSsoApps } from '@mts241alikhlash/platform/auth'

const LABELS: Record<string, string> = {
  academic: 'Akademik',
  admin: 'Administrasi',
  admission: 'PPDB',
  assessment: 'Penilaian',
  exam: 'Ujian',
  hr: 'Kepegawaian',
  inventory: 'Inventaris',
  portal: 'Portal',
}

const route = useRoute()
const { apps, load } = useSsoApps()
const loaded = ref(false)

const denied = computed(() => {
  const key = route.query.denied
  return typeof key === 'string' ? (LABELS[key] ?? key) : null
})

onMounted(async () => {
  await load()
  loaded.value = true
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
    <p
      v-if="denied"
      class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
      role="alert"
    >
      Anda tidak punya akses ke {{ denied }}.
    </p>
    <h1 class="text-2xl font-bold tracking-tight">Aplikasi</h1>
    <div
      v-if="apps.length"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <a
        v-for="app in apps"
        :key="app.key"
        :href="app.url"
        class="rounded-md border bg-card p-6 font-semibold transition hover:border-primary/40"
      >
        {{ app.label }}
      </a>
    </div>
    <p
      v-else-if="loaded"
      class="text-sm text-muted-foreground"
    >
      Belum ada aplikasi untuk akun Anda. Hubungi admin.
    </p>
  </div>
</template>
