<script setup lang="ts">
import { onMounted, ref, useId } from 'vue'
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
import { studentExamService } from '../services/studentExamService'
import { displayTitle } from '../logic/exam'
import type { MyExam } from '../types'

const route = useRoute()
const router = useRouter()
const fieldId = useId()

const scheduleId = String(route.params.scheduleId ?? '')
const exam = ref<MyExam | null>(null)
const code = ref('')
const loading = ref(true)
const submitting = ref(false)
const error = ref<string | null>(null)

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
    error.value =
      cause instanceof Error ? cause.message : 'Ujian gagal dimulai.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-md space-y-4 p-4">
    <Card>
      <CardHeader standard>
        <CardTitle size="lg">Token Ujian</CardTitle>
      </CardHeader>

      <CardContent
        variant="standard"
        class="space-y-4"
      >
        <div class="space-y-1">
          <p
            class="text-[length:var(--text-control,0.75rem)] font-semibold text-muted-foreground"
          >
            Detail ujian
          </p>
          <p class="font-medium">
            {{ exam ? displayTitle(exam) : 'Memuat…' }}
          </p>
          <p
            v-if="exam"
            class="text-[length:var(--text-control)] text-muted-foreground"
          >
            {{ exam.durationMinutes }} menit
          </p>
        </div>

        <FloatingLabelField
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
          v-if="error"
          class="text-[length:var(--text-control)] text-destructive"
        >
          {{ error }}
        </p>

        <Button
          class="w-full"
          :disabled="submitting || loading"
          @click="start"
        >
          {{ submitting ? 'Memulai…' : 'Mulai ujian' }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
