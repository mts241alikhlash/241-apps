<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { studentExamService } from '../services/studentExamService'
import type { ActiveSebConfig } from '../types'

const SEB_DOWNLOADS = [
  { label: 'Windows', href: 'https://safeexambrowser.org/download_en.html' },
  { label: 'macOS', href: 'https://safeexambrowser.org/download_en.html' },
  { label: 'iOS', href: 'https://safeexambrowser.org/download_en.html' },
] as const

const configs = ref<ActiveSebConfig[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

function sebLink(id: string): string {
  return `sebs://${window.location.host}/public/seb-configs/${id}/file`
}

onMounted(async () => {
  try {
    configs.value = await studentExamService.activeSebConfigs()
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : 'Konfigurasi Safe Exam Browser gagal dimuat.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col items-center justify-center p-4">
    <Card
      gap="none"
      class="w-full max-w-md overflow-hidden"
    >
      <CardHeader variant="muted">
        <CardTitle class="font-semibold"
          >Buka dengan Safe Exam Browser</CardTitle
        >
      </CardHeader>

      <CardContent class="space-y-5 p-4 sm:p-6">
        <p class="text-[length:var(--text-control)]">
          Ujian online hanya bisa dibuka di Safe Exam Browser (SEB). Pasang SEB,
          lalu buka tautan konfigurasi ujian di bawah dari perangkat yang sama.
        </p>

        <section class="space-y-2">
          <h2 class="font-semibold">Unduh Safe Exam Browser</h2>
          <ul class="flex flex-wrap gap-2">
            <li
              v-for="download in SEB_DOWNLOADS"
              :key="download.label"
            >
              <a
                class="inline-flex min-h-11 items-center rounded-md border px-3 text-[length:var(--text-control)] font-medium underline-offset-4 hover:underline"
                :href="download.href"
                target="_blank"
                rel="noopener"
              >
                {{ download.label }}
              </a>
            </li>
          </ul>
          <p class="text-[length:var(--text-control)] text-muted-foreground">
            Di Android, ujian dibuka dengan aplikasi Istiqra.
          </p>
        </section>

        <section class="space-y-2">
          <h2 class="font-semibold">Konfigurasi ujian aktif</h2>
          <p
            v-if="loading"
            class="text-[length:var(--text-control)] text-muted-foreground"
          >
            Memuat konfigurasi…
          </p>
          <p
            v-else-if="error"
            class="text-[length:var(--text-control)] text-destructive"
            role="alert"
          >
            {{ error }}
          </p>
          <p
            v-else-if="configs.length === 0"
            class="text-[length:var(--text-control)] text-muted-foreground"
          >
            Belum ada konfigurasi Safe Exam Browser yang aktif.
          </p>
          <ul
            v-else
            class="divide-y rounded-md border"
          >
            <li
              v-for="config in configs"
              :key="config.id"
              class="flex flex-col gap-1 p-3"
            >
              <span class="font-medium">{{ config.name }}</span>
              <a
                class="min-h-11 text-[length:var(--text-control)] break-all underline underline-offset-4"
                :href="sebLink(config.id)"
              >
                {{ sebLink(config.id) }}
              </a>
            </li>
          </ul>
        </section>
      </CardContent>
    </Card>
  </div>
</template>
