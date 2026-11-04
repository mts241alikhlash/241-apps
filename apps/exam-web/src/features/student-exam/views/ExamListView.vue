<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import { RefreshCw } from '@lucide/vue'
import { studentExamService } from '../services/studentExamService'
import {
  GROUP_LABEL,
  displayTitle,
  groupExams,
  type ExamGroup,
} from '../logic/exam'
import type { MyExam } from '../types'

const router = useRouter()
const exams = ref<MyExam[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const groups = computed(() => {
  const grouped = groupExams(exams.value)
  return (Object.keys(grouped) as ExamGroup[])
    .map((key) => ({ key, label: GROUP_LABEL[key], items: grouped[key] }))
    .filter((group) => group.items.length > 0)
})

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
      return 'Dibuka · Mulai'
    case 'IN_PROGRESS':
      return 'Sedang berlangsung · Lanjutkan'
    case 'UPCOMING':
      return 'Belum dibuka'
    default:
      return 'Selesai'
  }
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
  <div class="mx-auto w-full max-w-3xl space-y-4 p-4">
    <Card>
      <CardHeader standard>
        <CardTitle size="lg">Daftar Ujian</CardTitle>
        <Button
          variant="outline"
          size="sm"
          :disabled="loading"
          @click="load"
        >
          <RefreshCw class="mr-1 size-4" />
          Muat ulang
        </Button>
      </CardHeader>

      <CardContent
        variant="standard"
        class="space-y-4"
      >
        <p class="text-[length:var(--text-control)] text-muted-foreground">
          Ujian yang tersedia untuk kelas Anda.
        </p>

        <div
          v-if="loading"
          class="space-y-2"
        >
          <Skeleton class="h-20 w-full" />
          <Skeleton class="h-20 w-full" />
        </div>

        <div
          v-else-if="error"
          class="space-y-3"
        >
          <p class="text-[length:var(--text-control)] text-destructive">
            {{ error }}
          </p>
          <Button
            size="sm"
            @click="load"
            >Coba lagi</Button
          >
        </div>

        <p
          v-else-if="exams.length === 0"
          class="py-10 text-center text-[length:var(--text-control)] text-muted-foreground"
        >
          Belum ada ujian. Ujian muncul di sini setelah guru menjadwalkannya.
        </p>

        <div
          v-else
          class="space-y-4"
        >
          <section
            v-for="group in groups"
            :key="group.key"
            class="space-y-2"
          >
            <h2
              class="text-[length:var(--text-control,0.75rem)] font-semibold text-muted-foreground"
            >
              {{ group.label }}
            </h2>

            <ul class="divide-y rounded-md border">
              <li
                v-for="exam in group.items"
                :key="exam.id"
                class="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ displayTitle(exam) }}</p>
                  <p
                    class="text-[length:var(--text-control)] text-muted-foreground"
                  >
                    {{ windowLabel(exam) }}
                  </p>
                  <p
                    class="text-[length:var(--text-control)] text-muted-foreground"
                  >
                    {{ exam.durationMinutes }} menit ·
                    {{ statusLabel(exam) }}
                  </p>
                </div>
                <Button
                  v-if="canStart(exam)"
                  size="sm"
                  class="shrink-0 self-start sm:self-auto"
                  @click="open(exam)"
                >
                  {{ exam.status === 'IN_PROGRESS' ? 'Lanjutkan' : 'Mulai' }}
                </Button>
              </li>
            </ul>
          </section>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
