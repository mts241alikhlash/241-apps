<script setup lang="ts">
import { onMounted, ref, useId } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import { SebOutdatedError } from '@/shared/seb'
import {
  ExamApiError,
  studentExamService,
} from '../services/studentExamService'
import { displayTitle } from '../logic/exam'
import type { MyExam } from '../types'
import SebRequiredView from './SebRequiredView.vue'

const route = useRoute()
const router = useRouter()
const fieldId = useId()

const scheduleId = String(route.params.scheduleId ?? '')
const exam = ref<MyExam | null>(null)
const code = ref('')
const loading = ref(true)
const submitting = ref(false)
const error = ref<string | null>(null)
const sebRequired = ref(false)
const showSebGuide = ref(false)

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

async function start() {
  if (code.value.trim().length === 0 || submitting.value) return
  submitting.value = true
  error.value = null
  try {
    const session = await studentExamService.startSession(
      scheduleId,
      code.value,
    )
    window.sessionStorage.setItem(
      `cbt:deadline:${session.sessionId}`,
      JSON.stringify({
        deadline: session.deadline,
        serverTime: session.serverTime,
        examTitle: exam.value ? displayTitle(exam.value) : null,
        durationMinutes: exam.value?.durationMinutes ?? null,
      }),
    )
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
    class="flex min-h-0 flex-1 flex-col items-center justify-center p-4"
  >
    <Card
      gap="none"
      class="w-full max-w-md overflow-hidden"
    >
      <CardHeader variant="muted">
        <CardTitle class="font-semibold">Token Ujian</CardTitle>
      </CardHeader>

      <CardContent class="p-4 sm:p-6 space-y-4">
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
          <p
            class="text-[length:var(--text-control,0.75rem)] font-semibold text-muted-foreground"
          >
            Detail ujian
          </p>
          <p class="font-medium">
            {{ displayTitle(exam) }}
          </p>
          <p class="text-[length:var(--text-control)] text-muted-foreground">
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

        <FloatingLabelField
          v-if="!error || exam"
          label="Token ujian"
          :for="fieldId"
          floating
        >
          <Input
            :id="fieldId"
            v-model="code"
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
          class="w-full"
          @click="showSebGuide = true"
        >
          Panduan Safe Exam Browser
        </Button>

        <Button
          v-if="!error || exam"
          class="w-full"
          :disabled="submitting || loading || !code.trim()"
          @click="start"
        >
          {{ submitting ? 'Memulai…' : 'Mulai ujian' }}
        </Button>
      </CardContent>
      <CardFooter variant="thin" />
    </Card>
  </div>
</template>
