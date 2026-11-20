<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Printer } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import type { ExamCategory } from '@/features/exam-shared/examType'
import { examActivityApi } from '../api/examActivityApi'
import { buildTimetable, timetableHtml } from '../utils/buildTimetable'
import type { ExamActivityRecord } from '../types'

const props = defineProps<{ category: ExamCategory | undefined }>()

const activities = ref<ExamActivityRecord[]>([])
const error = ref(false)

const days = computed(() => buildTimetable(activities.value))

async function load() {
  error.value = false
  try {
    activities.value = await examActivityApi.list(
      props.category ? { category: props.category } : undefined,
    )
  } catch {
    error.value = true
  }
}

function print() {
  const page = window.open('', '_blank')
  if (page === null) return
  page.document.write(timetableHtml(days.value, 'Jadwal Ujian'))
  page.document.close()
  page.focus()
  page.print()
}

onMounted(load)
</script>

<template>
  <section
    v-if="days.length > 0"
    class="mb-4 space-y-3 rounded-md border p-4"
  >
    <div class="flex items-center justify-between gap-3">
      <h3 class="font-semibold">Jadwal mapel</h3>
      <Button
        variant="outline"
        @click="print"
      >
        <Printer class="size-4" />
        Cetak jadwal
      </Button>
    </div>
    <div
      v-for="day in days"
      :key="day.key"
      class="space-y-1"
    >
      <p class="text-control font-medium">{{ day.label }}</p>
      <ul class="divide-y rounded-md border text-control">
        <li
          v-for="slot in day.slots"
          :key="slot.startsAt"
          class="flex flex-col gap-1 p-2 sm:flex-row sm:gap-4"
        >
          <span class="w-32 shrink-0 font-medium tabular-nums">
            {{ slot.time }}
          </span>
          <span>
            <span
              v-for="entry in slot.entries"
              :key="entry.subject"
              class="block"
            >
              {{ entry.subject }}
              <span class="text-muted-foreground">
                ({{ entry.grades.join(', ') }})
              </span>
            </span>
          </span>
        </li>
      </ul>
    </div>
  </section>
  <p
    v-else-if="error"
    class="mb-4 text-control text-muted-foreground"
  >
    Jadwal mapel tidak dapat dimuat.
  </p>
</template>
