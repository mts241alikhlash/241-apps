<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import { SebOutdatedError } from '@/shared/seb'
import istiqraSymbol from '@/assets/istiqra-symbol.webp'
import {
  ExamApiError,
  studentExamService,
} from '../services/studentExamService'
import { displayTitle } from '../logic/exam'
import type { MyExam, StoredExamSession } from '../types'
import StudentBrandHero from '../components/StudentBrandHero.vue'
import SebRequiredView from './SebRequiredView.vue'

const route = useRoute()
const router = useRouter()
const fieldId = useId()

const scheduleId = String(route.params.scheduleId ?? '')
const resumeSessionId =
  typeof route.query.resume === 'string' ? route.query.resume : null
const exam = ref<MyExam | null>(null)
const code = ref('')
const loading = ref(true)
const submitting = ref(false)
const error = ref<string | null>(null)
const sebRequired = ref(false)
const showSebGuide = ref(false)

const heroTitle = computed(() =>
  exam.value ? displayTitle(exam.value) : 'Masukkan token ujian',
)

onMounted(async () => {
  try {
    const exams = await studentExamService.listExams()
    exam.value = exams.find((row) => row.id === scheduleId) ?? null
    if (!exam.value) error.value = 'Ujian tidak ditemukan.'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Ujian gagal dimuat.'
  } finally {
    loading.value = false
  }
})

function storeSession(sessionId: string, fields: Partial<StoredExamSession>) {
  const key = `cbt:deadline:${sessionId}`
  const previous = JSON.parse(
    window.sessionStorage.getItem(key) ?? 'null',
  ) as StoredExamSession | null
  window.sessionStorage.setItem(key, JSON.stringify({ ...previous, ...fields }))
}

async function start() {
  if (code.value.trim().length === 0 || submitting.value) return
  submitting.value = true
  error.value = null
  try {
    if (resumeSessionId) {
      const resumed = await studentExamService.resume(
        resumeSessionId,
        code.value,
      )
      storeSession(resumeSessionId, {
        deadline: Date.parse(resumed.deadline),
        serverTime: Date.parse(resumed.serverTime),
        scheduleId,
      })
      await router.replace({
        name: 'student-exam-sheet',
        params: { sessionId: resumeSessionId },
      })
      return
    }
    const session = await studentExamService.startSession(
      scheduleId,
      code.value,
    )
    storeSession(session.sessionId, {
      deadline: session.deadline,
      serverTime: session.serverTime,
      scheduleId,
      examTitle: exam.value ? displayTitle(exam.value) : null,
      durationMinutes: exam.value?.durationMinutes ?? null,
      heartbeatIntervalMs: session.policy.heartbeatIntervalMs,
    })
    await router.replace({
      name: 'student-exam-sheet',
      params: { sessionId: session.sessionId },
    })
  } catch (cause) {
    if (cause instanceof SebOutdatedError) {
      error.value = 'Perbarui Safe Exam Browser ke versi terbaru.'
    } else {
      sebRequired.value =
        cause instanceof ExamApiError && cause.code === 'SEB_REQUIRED'
      error.value =
        cause instanceof Error ? cause.message : 'Ujian gagal dimulai.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <SebRequiredView v-if="showSebGuide" />
  <div
    v-else
    class="flex min-h-0 flex-1 flex-col bg-background"
  >
    <StudentBrandHero
      class="md:hidden"
      eyebrow="Ujian digital"
      :title="heroTitle"
    />

    <div class="flex flex-1 flex-col items-center p-4 md:justify-center">
      <div class="relative w-full max-w-md">
        <img
          v-if="!loading"
          :src="istiqraSymbol"
          alt="Logo Istiqra"
          class="relative z-10 mx-auto -mt-10 size-18 rounded-full border border-border bg-card p-3 md:hidden"
        />
        <Card
          gap="none"
          class="overflow-hidden"
        >
          <CardHeader variant="muted">
            <CardTitle class="font-semibold">{{
              resumeSessionId ? 'Masukkan Token Kembali' : 'Token Ujian'
            }}</CardTitle>
          </CardHeader>

          <CardContent class="space-y-4 p-4 sm:p-6">
            <div
              v-if="loading"
              class="space-y-2"
            >
              <Skeleton class="h-3.5 w-20" />
              <Skeleton class="h-5 w-3/4" />
              <Skeleton class="h-3.5 w-24" />
            </div>
            <div
              v-else-if="exam"
              class="space-y-1"
            >
              <p class="font-medium">{{ displayTitle(exam) }}</p>
              <p
                class="text-[length:var(--text-control)] text-muted-foreground"
              >
                {{ exam.durationMinutes }} menit
              </p>
            </div>
            <div
              v-else-if="error && !exam"
              class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
              role="alert"
            >
              {{ error }}
            </div>

            <p class="text-[length:var(--text-control)] text-muted-foreground">
              {{
                resumeSessionId
                  ? 'Anda keluar dari aplikasi. Minta token terbaru kepada pengawas ruangan untuk melanjutkan.'
                  : 'Minta token kepada pengawas ruangan, lalu masukkan di bawah ini.'
              }}
            </p>

            <FloatingLabelField
              v-if="!error || exam"
              label="Token ujian"
              :for="fieldId"
              floating
            >
              <Input
                :id="fieldId"
                v-model="code"
                class="min-h-11"
                :disabled="submitting || loading"
                autocomplete="off"
                autocapitalize="characters"
                placeholder="Enam huruf/angka"
                @keyup.enter="start"
              />
            </FloatingLabelField>

            <p
              v-if="error && exam"
              class="text-[length:var(--text-control)] text-destructive"
            >
              {{ error }}
            </p>

            <Button
              v-if="sebRequired"
              variant="outline"
              class="min-h-11 w-full"
              @click="showSebGuide = true"
            >
              Panduan Safe Exam Browser
            </Button>

            <Button
              v-if="!error || exam"
              class="min-h-11 w-full"
              :disabled="submitting || loading || !code.trim()"
              @click="start"
            >
              {{
                submitting
                  ? 'Memulai…'
                  : resumeSessionId
                    ? 'Lanjutkan Ujian'
                    : 'Mulai Ujian'
              }}
            </Button>

            <p
              class="text-center text-[length:var(--text-control)] text-muted-foreground"
            >
              Layar dikunci selama ujian berlangsung.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
