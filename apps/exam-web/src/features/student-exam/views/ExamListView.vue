<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import { categoryOf, type ExamCategory } from '@/features/exam-shared/examType'
import { studentExamService } from '../services/studentExamService'
import { displayTitle } from '../logic/exam'
import type { MyExam } from '../types'

const SECTION_LABEL: Record<ExamCategory, string> = {
  EXAM: 'Ujian',
  NON_EXAM: 'Tugas & Ulangan',
}

const router = useRouter()
const exams = ref<MyExam[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const sections = computed(() =>
  (Object.keys(SECTION_LABEL) as ExamCategory[])
    .map((category) => ({
      category,
      label: SECTION_LABEL[category],
      items: exams.value.filter(
        (exam) => (exam.category ?? categoryOf(exam.type)) === category,
      ),
    }))
    .filter((section) => section.items.length > 0),
)

function windowLabel(exam: MyExam): string {
  const format = new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${format.format(new Date(exam.startsAt))} – ${format.format(new Date(exam.endsAt))}`
}

function statusLabel(exam: MyExam): string {
  switch (exam.status) {
    case 'OPEN':
      return 'Sedang dibuka'
    case 'IN_PROGRESS':
      return 'Sedang berlangsung'
    case 'UPCOMING':
      return 'Belum dibuka'
    default:
      return 'Selesai'
  }
}

function actionLabel(exam: MyExam): string {
  return exam.status === 'IN_PROGRESS' ? 'Lanjutkan Ujian' : 'Mulai Ujian'
}

function canStart(exam: MyExam): boolean {
  return exam.status === 'OPEN' || exam.status === 'IN_PROGRESS'
}

function open(exam: MyExam) {
  if (!canStart(exam)) return
  void router.push({
    name: 'student-exam-token',
    params: { scheduleId: exam.id },
  })
}

async function load() {
  loading.value = true
  error.value = null
  try {
    exams.value = await studentExamService.listExams()
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : 'Daftar ujian gagal dimuat.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col bg-background">
    <header
      class="flex h-[54px] shrink-0 items-center border-b border-border bg-card px-4"
    >
      <img
        src="/logo-name.webp"
        alt="241 Exam"
        class="h-7 w-auto"
        decoding="async"
      />
    </header>

    <main
      class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-6"
    >
      <h1 class="text-lg font-semibold">Daftar Ujian</h1>

      <div
        v-if="loading"
        class="space-y-3"
      >
        <Skeleton class="h-24 w-full" />
        <Skeleton class="h-24 w-full" />
      </div>

      <div
        v-else-if="error"
        class="space-y-3"
      >
        <p class="text-[length:var(--text-control)] text-destructive">
          {{ error }}
        </p>
        <Button
          class="min-h-11"
          @click="load"
          >Coba Lagi</Button
        >
      </div>

      <p
        v-else-if="exams.length === 0"
        class="py-10 text-center text-[length:var(--text-control)] text-muted-foreground"
      >
        Belum ada ujian. Ujian muncul di sini setelah guru menjadwalkannya.
      </p>

      <template v-else>
        <section
          v-for="section in sections"
          :key="section.category"
          class="space-y-2"
        >
          <h2
            class="text-[length:var(--text-control)] font-semibold text-muted-foreground"
          >
            {{ section.label }}
          </h2>
          <ul class="space-y-3">
            <li
              v-for="exam in section.items"
              :key="exam.id"
            >
              <article
                class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="min-w-0 space-y-1">
                  <h3 class="font-semibold">{{ displayTitle(exam) }}</h3>
                  <p
                    class="text-[length:var(--text-control)] text-muted-foreground"
                  >
                    {{ windowLabel(exam) }} · {{ exam.durationMinutes }} menit
                  </p>
                  <p class="text-[length:var(--text-control)] font-medium">
                    <span class="text-muted-foreground">Status</span>
                    {{ statusLabel(exam) }}
                  </p>
                </div>
                <Button
                  class="min-h-11 shrink-0"
                  :disabled="!canStart(exam)"
                  @click="open(exam)"
                >
                  {{ canStart(exam) ? actionLabel(exam) : 'Belum Dibuka' }}
                </Button>
              </article>
            </li>
          </ul>
        </section>
      </template>
    </main>
  </div>
</template>
