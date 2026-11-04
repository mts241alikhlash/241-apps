<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useAuthSession } from '@/features/platform/auth'
import ItemGradeCard from '../components/ItemGradeCard.vue'
import { examGradingService } from '../services/examGradingService'
import type { GradingDetail, GradingItem } from '../types'

const route = useRoute()
const router = useRouter()
const sessionId = computed(() => String(route.params.sessionId ?? ''))
const scheduleId = computed(() => String(route.params.scheduleId ?? ''))

const { hasPermission } = useAuthSession()
const examTitle = computed(() =>
  typeof route.query.judul === 'string' && route.query.judul !== ''
    ? route.query.judul
    : 'Daftar Siswa',
)
const sessionsLocation = computed(() => ({
  path: `/exam/grading/${scheduleId.value}`,
  query: route.query,
}))
const detail = ref<GradingDetail | null>(null)
let request = 0
const loading = ref(true)
const error = ref<string | null>(null)

const studentLabel = computed(() =>
  detail.value
    ? [
        detail.value.session.studentName ?? 'Siswa',
        detail.value.session.studentNis,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Siswa',
)
const finished = computed(() => detail.value?.session.status !== 'IN_PROGRESS')
const canGrade = computed(
  () => hasPermission('exam-grading.grade') && finished.value,
)
const waiting = computed(
  () => detail.value?.items.filter((item) => item.needsGrading).length ?? 0,
)

useBreadcrumbs(() => [
  { title: 'Penilaian Ujian', href: '/exam/grading' },
  {
    title: examTitle.value,
    href: router.resolve(sessionsLocation.value).href,
  },
  { title: studentLabel.value },
])

async function load() {
  const current = ++request
  loading.value = true
  const result = await examGradingService.loadSession(sessionId.value)
  if (current !== request) return
  loading.value = false
  if (result.success) {
    detail.value = result.data
    error.value = null
  } else {
    detail.value = null
    error.value = result.error
  }
}

async function onGraded(item: GradingItem) {
  if (!detail.value) return
  detail.value = {
    ...detail.value,
    items: detail.value.items.map((row) =>
      row.questionId === item.questionId ? item : row,
    ),
  }
  const current = ++request
  const result = await examGradingService.loadSession(sessionId.value)
  if (current === request && result.success) detail.value = result.data
}

watch(sessionId, load)
onMounted(load)
</script>

<template>
  <div class="space-y-4 px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card gap="none">
      <CardHeader standard>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <BackButton
              label="Kembali ke Daftar Siswa"
              @click="router.push(sessionsLocation)"
            />
            <CardTitle size="lg">{{ studentLabel }}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent
        v-if="detail"
        variant="standard"
      >
        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          {{
            waiting > 0
              ? `${waiting} jawaban belum dinilai`
              : detail.session.rawScore !== null
                ? `Nilai: ${detail.session.rawScore} / ${detail.session.maxScore}`
                : 'Semua jawaban sudah dinilai'
          }}
        </p>
      </CardContent>
    </Card>

    <p v-if="loading">Memuat…</p>
    <div
      v-else-if="error"
      class="space-y-3 rounded-md border p-4"
      role="alert"
    >
      <p>{{ error }}</p>
      <Button
        variant="outline"
        @click="load"
      >
        Coba lagi
      </Button>
    </div>
    <template v-else-if="detail">
      <p v-if="detail.items.length === 0">
        Ujian ini tidak punya soal isian singkat atau uraian.
      </p>
      <p
        v-if="!finished"
        class="rounded-md border p-3"
      >
        Siswa ini masih mengerjakan. Jawaban bisa dinilai setelah ujian selesai.
      </p>
      <p
        v-else-if="!hasPermission('exam-grading.grade')"
        class="rounded-md border p-3"
      >
        Anda hanya bisa melihat jawaban; menilai butuh izin penilaian.
      </p>
      <ItemGradeCard
        v-for="item in detail.items"
        :key="item.questionId"
        :session-id="detail.session.sessionId"
        :item="item"
        :can-grade="canGrade"
        @graded="onGraded"
      />
    </template>
  </div>
</template>
