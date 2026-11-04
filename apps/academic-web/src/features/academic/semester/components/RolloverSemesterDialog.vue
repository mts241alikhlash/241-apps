<script setup lang="ts">
import type {
  RolloverSemesterPayload,
  RolloverSummary,
  RolloverSummaryRow,
  Semester,
} from '../types'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import { ArrowRight, CheckCircle2, Copy, Loader2 } from '@lucide/vue'
import { computed, reactive, watch } from 'vue'
import { resolveDefaultRolloverPair } from '../logic/rolloverSemesters'

const props = defineProps<{
  open: boolean
  semesters: Semester[]
  isRollingOver: boolean
  rolloverSummary: RolloverSummary | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  rollover: [payload: RolloverSemesterPayload]
}>()

const open = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const formData = reactive({
  sourceSemesterId: '',
  targetSemesterId: '',
})

function getSemesterLabel(semester: Semester) {
  const ayName = semester.academicYear?.name ?? '-'
  const typeUpper = semester.type?.name?.toUpperCase()
  const typeName =
    typeUpper === 'ODD'
      ? 'Ganjil'
      : typeUpper === 'EVEN'
        ? 'Genap'
        : (semester.type?.name ?? '-')
  return `${typeName} – ${ayName}`
}

const sourceSemester = computed(() =>
  props.semesters.find((s) => s.id === formData.sourceSemesterId),
)

const targetSemester = computed(() =>
  props.semesters.find((s) => s.id === formData.targetSemesterId),
)

const totalCreated = computed(() => {
  if (!props.rolloverSummary) return 0
  const s = props.rolloverSummary
  return (
    s.classes.created +
    s.enrollments.created +
    s.supervisors.created +
    s.teachingAssignments.created +
    s.schedules.created
  )
})

const totalSkipped = computed(() => {
  if (!props.rolloverSummary) return 0
  const s = props.rolloverSummary
  return (
    s.classes.skipped +
    s.enrollments.skipped +
    s.supervisors.skipped +
    s.teachingAssignments.skipped +
    s.schedules.skipped
  )
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      const pair = resolveDefaultRolloverPair(props.semesters)
      formData.sourceSemesterId = pair.sourceSemesterId
      formData.targetSemesterId = pair.targetSemesterId
    }
  },
)

function handleConfirmRollover() {
  emit('rollover', { ...formData })
}

const summaryRows = computed((): RolloverSummaryRow[] => {
  if (!props.rolloverSummary) return []
  const s = props.rolloverSummary
  return [
    { label: 'Kelas', created: s.classes.created, skipped: s.classes.skipped },
    {
      label: 'Enrollment Siswa',
      created: s.enrollments.created,
      skipped: s.enrollments.skipped,
    },
    {
      label: 'Wali Kelas',
      created: s.supervisors.created,
      skipped: s.supervisors.skipped,
    },
    {
      label: 'Penugasan Guru',
      created: s.teachingAssignments.created,
      skipped: s.teachingAssignments.skipped,
    },
    {
      label: 'Jadwal',
      created: s.schedules.created,
      skipped: s.schedules.skipped,
    },
  ]
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>Salin Data Semester</DialogTitle>
        <DialogDescription class="sr-only"></DialogDescription>
      </DialogHeader>

      <ScrollArea class="flex-1 min-h-0">
        <div
          v-if="rolloverSummary"
          class="space-y-4 px-6 py-4"
        >
          <Alert
            variant="default"
            class="border-emerald-200 bg-emerald-50 text-emerald-800"
          >
            <CheckCircle2 class="size-4 text-emerald-600" />
            <AlertDescription class="font-medium">
              Penyalinan berhasil! {{ totalCreated }} data disalin,
              {{ totalSkipped }} data dilewati.
            </AlertDescription>
          </Alert>

          <div class="rounded-lg border overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b bg-muted/50">
                  <th
                    class="px-4 py-2.5 text-left font-medium text-muted-foreground"
                  >
                    Entitas Data
                  </th>
                  <th
                    class="px-4 py-2.5 text-center font-medium text-muted-foreground"
                  >
                    Disalin
                  </th>
                  <th
                    class="px-4 py-2.5 text-center font-medium text-muted-foreground"
                  >
                    Dilewati
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr
                  v-for="row in summaryRows"
                  :key="row.label"
                  class="bg-background transition-colors hover:bg-muted/50"
                >
                  <td class="px-4 py-3 font-medium">{{ row.label }}</td>
                  <td class="px-4 py-3 text-center">
                    <Badge
                      v-if="row.created > 0"
                      variant="default"
                      class="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                    >
                      +{{ row.created }}
                    </Badge>
                    <span
                      v-else
                      class="text-muted-foreground font-medium"
                      >0</span
                    >
                  </td>
                  <td class="px-4 py-3 text-center">
                    <Badge
                      v-if="row.skipped > 0"
                      variant="secondary"
                      class="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"
                    >
                      {{ row.skipped }}
                    </Badge>
                    <span
                      v-else
                      class="text-muted-foreground font-medium"
                      >0</span
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          v-else
          class="space-y-4 px-6 py-5"
        >
          <div class="rounded-lg bg-muted/30 border py-4 px-5">
            <div class="flex items-center justify-between gap-3 mb-3">
              <span
                class="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex-1 text-center"
              >
                Dari
              </span>
              <div class="shrink-0 w-8" />
              <span
                class="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex-1 text-center"
              >
                Ke
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <Badge
                variant="outline"
                class="px-3 py-1.5 text-sm bg-background flex-1 justify-center truncate"
              >
                {{
                  sourceSemester
                    ? getSemesterLabel(sourceSemester)
                    : 'Tidak ada semester ganjil'
                }}
              </Badge>
              <div
                class="flex items-center justify-center shrink-0 text-muted-foreground bg-muted p-1.5 rounded-full border"
              >
                <ArrowRight class="size-4" />
              </div>
              <Badge
                variant="outline"
                class="px-3 py-1.5 text-sm bg-background border-primary/20 text-primary flex-1 justify-center truncate"
              >
                {{
                  targetSemester
                    ? getSemesterLabel(targetSemester)
                    : 'Tidak ada tujuan'
                }}
              </Badge>
            </div>
          </div>

          <p
            v-if="sourceSemester && !targetSemester"
            class="text-xs text-amber-600 dark:text-amber-400 text-center"
          >
            Semester Genap untuk tahun ajaran ini belum dibuat.
          </p>
        </div>
      </ScrollArea>

      <DialogFooter
        class="px-6 py-4 border-t shrink-0 flex sm:justify-between w-full bg-background mt-auto"
      >
        <template v-if="rolloverSummary">
          <div />
          <Button
            type="button"
            @click="open = false"
          >
            Selesai
          </Button>
        </template>
        <template v-else>
          <Button
            type="button"
            variant="outline"
            :disabled="isRollingOver"
            @click="open = false"
          >
            Batal
          </Button>
          <Button
            type="button"
            :disabled="isRollingOver || !sourceSemester || !targetSemester"
            @click="handleConfirmRollover"
          >
            <Loader2
              v-if="isRollingOver"
              class="size-4 mr-1.5 animate-spin"
            />
            <Copy
              v-else
              class="size-4 mr-1.5"
            />
            {{ isRollingOver ? 'Memproses...' : 'Mulai Salin' }}
          </Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
