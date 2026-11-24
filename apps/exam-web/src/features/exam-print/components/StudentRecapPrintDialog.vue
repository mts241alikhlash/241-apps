<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { Printer } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@mts241alikhlash/ui/button'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { RadioGroup, RadioGroupItem } from '@mts241alikhlash/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { GradingSchedule } from '@/features/exam-grading/types'
import {
  compareClassroom,
  gradeOfClassroom,
} from '@/features/exam-shared/classroomName'
import {
  gradingSheetService,
  type SessionPerson,
} from '../services/gradingSheetService'
import type {
  RecapDocType,
  RecapPrintConfirmPayload,
} from '../documents/studentScoreRecap'

const props = defineProps<{
  open: boolean
  schedules: GradingSchedule[]
  initialGrade?: string
  knownScheduleId?: string
  knownPeople?: SessionPerson[]
  subjectOf: (schedule: GradingSchedule) => string
  printing?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [payload: RecapPrintConfirmPayload]
}>()

const scoreDocId = useId()
const detailDocId = useId()
const subjectFieldId = useId()
const gradeFieldId = useId()
const classFieldId = useId()
const allStudentsId = useId()
const selectedStudentsId = useId()

const docType = ref<RecapDocType>('score')
const selectedSubject = ref('ALL')
const selectedGrade = ref('ALL')
const selectedClassId = ref('ALL')
const studentScope = ref<'all' | 'selected'>('all')
const selectedStudentIds = ref<string[]>([])
const loadedPeopleBySchedule = ref<Record<string, SessionPerson[]>>({})
const loadingStudents = ref(false)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    docType.value = 'score'
    selectedSubject.value = 'ALL'
    selectedGrade.value = props.initialGrade ?? 'ALL'
    selectedClassId.value = 'ALL'
    studentScope.value = 'all'
    selectedStudentIds.value = []
  },
  { immediate: true },
)

const subjectOptions = computed<string[]>(() => {
  const seen = new Set<string>()
  for (const schedule of props.schedules) {
    seen.add(props.subjectOf(schedule))
  }
  return [...seen].sort((left, right) => left.localeCompare(right, 'id'))
})

const schedulesAfterSubject = computed<GradingSchedule[]>(() => {
  const list =
    selectedSubject.value === 'ALL'
      ? props.schedules
      : props.schedules.filter(
          (schedule) => props.subjectOf(schedule) === selectedSubject.value,
        )
  return [...list].sort(
    (left, right) =>
      compareClassroom(left.classroomName, right.classroomName) ||
      props.subjectOf(left).localeCompare(props.subjectOf(right), 'id'),
  )
})

const gradeOptions = computed<string[]>(() => {
  const seen = new Set<string>()
  const list: string[] = []
  for (const schedule of schedulesAfterSubject.value) {
    const grade = gradeOfClassroom(schedule.classroomName)
    if (grade !== '-' && !seen.has(grade)) {
      seen.add(grade)
      list.push(grade)
    }
  }
  return list
})

const schedulesAfterGrade = computed<GradingSchedule[]>(() => {
  if (selectedGrade.value === 'ALL') return schedulesAfterSubject.value
  return schedulesAfterSubject.value.filter(
    (schedule) =>
      gradeOfClassroom(schedule.classroomName) === selectedGrade.value,
  )
})

const resolvedSchedules = computed<GradingSchedule[]>(() => {
  if (selectedClassId.value === 'ALL') return schedulesAfterGrade.value
  return schedulesAfterGrade.value.filter(
    (schedule) => schedule.id === selectedClassId.value,
  )
})

const singleSchedule = computed<GradingSchedule | null>(() =>
  resolvedSchedules.value.length === 1 ? resolvedSchedules.value[0] : null,
)

watch(selectedSubject, () => {
  selectedGrade.value = 'ALL'
  selectedClassId.value = 'ALL'
})

watch(selectedGrade, () => {
  selectedClassId.value = 'ALL'
})

watch(singleSchedule, () => {
  studentScope.value = 'all'
  selectedStudentIds.value = []
})

const activePeople = computed<SessionPerson[]>(() => {
  const target = singleSchedule.value
  if (target === null) return []
  if (target.id === props.knownScheduleId && props.knownPeople !== undefined) {
    return props.knownPeople
  }
  return loadedPeopleBySchedule.value[target.id] ?? []
})

watch(
  [() => props.open, docType, studentScope, singleSchedule],
  async ([isOpen, nextDocType, scope, target]) => {
    if (
      !isOpen ||
      nextDocType !== 'detail' ||
      scope !== 'selected' ||
      target === null
    ) {
      return
    }
    if (
      target.id === props.knownScheduleId &&
      props.knownPeople !== undefined
    ) {
      return
    }
    if (loadedPeopleBySchedule.value[target.id] !== undefined) return
    loadingStudents.value = true
    try {
      const rows = await gradingSheetService.loadPeople(target)
      loadedPeopleBySchedule.value = {
        ...loadedPeopleBySchedule.value,
        [target.id]: rows,
      }
    } catch {
      toast.error('Gagal memuat daftar siswa.')
    } finally {
      loadingStudents.value = false
    }
  },
  { immediate: true },
)

const totalSessionCount = computed(() =>
  resolvedSchedules.value.reduce((sum, schedule) => sum + schedule.sessions, 0),
)

const classOptionLabel = (schedule: GradingSchedule): string => {
  const room = schedule.classroomName ?? '-'
  return subjectOptions.value.length > 1
    ? `${props.subjectOf(schedule)} · ${room}`
    : room
}

const isStudentChecked = (studentId: string): boolean =>
  selectedStudentIds.value.includes(studentId)

function toggleStudent(studentId: string, checked: boolean | 'indeterminate') {
  const nextChecked = checked === true
  if (nextChecked && !selectedStudentIds.value.includes(studentId)) {
    selectedStudentIds.value = [...selectedStudentIds.value, studentId]
    return
  }
  if (!nextChecked) {
    selectedStudentIds.value = selectedStudentIds.value.filter(
      (id) => id !== studentId,
    )
  }
}

function selectAllStudents() {
  selectedStudentIds.value = activePeople.value.map(
    (person) => person.studentId,
  )
}

function clearStudents() {
  selectedStudentIds.value = []
}

const canPickStudents = computed(
  () => docType.value === 'detail' && singleSchedule.value !== null,
)

const canSubmit = computed(() => {
  if (resolvedSchedules.value.length === 0) return false
  if (canPickStudents.value && studentScope.value === 'selected') {
    return selectedStudentIds.value.length > 0
  }
  return true
})

const summaryText = computed(() => {
  if (resolvedSchedules.value.length === 0) {
    return 'Tidak ada jadwal ujian yang sesuai filter.'
  }
  if (docType.value === 'score') {
    return `Akan mencetak ${resolvedSchedules.value.length} lembar rekap nilai kelas (${totalSessionCount.value} siswa).`
  }
  if (canPickStudents.value && studentScope.value === 'selected') {
    return `Akan mencetak ${selectedStudentIds.value.length} lembar detail soal & jawaban siswa.`
  }
  return `Akan mencetak ${totalSessionCount.value} lembar detail soal & jawaban siswa (${resolvedSchedules.value.length} kelas).`
})

function submit() {
  if (!canSubmit.value || props.printing) return
  emit('confirm', {
    docType: docType.value,
    schedules: resolvedSchedules.value,
    studentIds:
      canPickStudents.value && studentScope.value === 'selected'
        ? [...selectedStudentIds.value]
        : undefined,
  })
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Cetak Rekap</DialogTitle>
        <DialogDescription>
          Pilih jenis dokumen dan cakupan data ujian yang akan dicetak.
        </DialogDescription>
      </DialogHeader>

      <DialogBody class="space-y-3">
        <div class="space-y-2">
          <p class="text-xs font-medium text-muted-foreground">Jenis Dokumen</p>
          <RadioGroup
            v-model="docType"
            class="gap-2"
          >
            <label
              :for="scoreDocId"
              class="flex cursor-pointer items-start gap-2 rounded-md border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem
                :id="scoreDocId"
                value="score"
                class="mt-0.5"
              />
              <span class="space-y-0.5">
                <span class="block text-sm font-medium">Rekap Nilai Siswa</span>
                <span class="block text-xs text-muted-foreground">
                  Tabel ringkas nilai per jenis soal dan total nilai per kelas.
                </span>
              </span>
            </label>
            <label
              :for="detailDocId"
              class="flex cursor-pointer items-start gap-2 rounded-md border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem
                :id="detailDocId"
                value="detail"
                class="mt-0.5"
              />
              <span class="space-y-0.5">
                <span class="block text-sm font-medium">
                  Detail Soal &amp; Jawaban (Per Siswa)
                </span>
                <span class="block text-xs text-muted-foreground">
                  Lembar soal, kunci jawaban, dan jawaban masing-masing siswa.
                </span>
              </span>
            </label>
          </RadioGroup>
        </div>

        <FloatingLabelField
          v-if="subjectOptions.length > 1"
          label="Mata Pelajaran"
          :for="subjectFieldId"
          class="w-full"
          floating
        >
          <Select v-model="selectedSubject">
            <SelectTrigger
              :id="subjectFieldId"
              class="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Mata Pelajaran</SelectItem>
              <SelectItem
                v-for="subject in subjectOptions"
                :key="subject"
                :value="subject"
              >
                {{ subject }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>

        <FloatingLabelField
          v-if="gradeOptions.length > 1"
          label="Tingkat"
          :for="gradeFieldId"
          class="w-full"
          floating
        >
          <Select v-model="selectedGrade">
            <SelectTrigger
              :id="gradeFieldId"
              class="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Tingkat</SelectItem>
              <SelectItem
                v-for="grade in gradeOptions"
                :key="grade"
                :value="grade"
              >
                {{ grade }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>

        <FloatingLabelField
          v-if="schedulesAfterGrade.length > 1"
          label="Kelas"
          :for="classFieldId"
          class="w-full"
          floating
        >
          <Select v-model="selectedClassId">
            <SelectTrigger
              :id="classFieldId"
              class="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                Semua Kelas ({{ schedulesAfterGrade.length }})
              </SelectItem>
              <SelectItem
                v-for="schedule in schedulesAfterGrade"
                :key="schedule.id"
                :value="schedule.id"
              >
                {{ classOptionLabel(schedule) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>

        <div
          v-if="canPickStudents"
          class="space-y-2"
        >
          <p class="text-xs font-medium text-muted-foreground">Cakupan Siswa</p>
          <RadioGroup
            v-model="studentScope"
            class="gap-2"
          >
            <label
              :for="allStudentsId"
              class="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
            >
              <RadioGroupItem
                :id="allStudentsId"
                value="all"
              />
              <span>Semua siswa ({{ totalSessionCount }})</span>
            </label>
            <label
              :for="selectedStudentsId"
              class="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
            >
              <RadioGroupItem
                :id="selectedStudentsId"
                value="selected"
              />
              <span>Pilih siswa tertentu</span>
            </label>
          </RadioGroup>

          <div
            v-if="studentScope === 'selected'"
            class="space-y-2 rounded-md border p-2"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground tabular-nums">
                {{ selectedStudentIds.length }} dipilih
              </span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="text-primary hover:underline"
                  @click="selectAllStudents"
                >
                  Pilih semua
                </button>
                <button
                  type="button"
                  class="text-muted-foreground hover:underline"
                  @click="clearStudents"
                >
                  Kosongkan
                </button>
              </div>
            </div>
            <p
              v-if="loadingStudents"
              class="py-2 text-xs text-muted-foreground"
            >
              Memuat daftar siswa…
            </p>
            <p
              v-else-if="activePeople.length === 0"
              class="py-2 text-xs text-muted-foreground"
            >
              Belum ada siswa yang menyelesaikan ujian ini.
            </p>
            <div
              v-else
              class="max-h-48 space-y-1.5 overflow-y-auto"
            >
              <label
                v-for="person in activePeople"
                :key="person.studentId"
                class="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted/50"
              >
                <Checkbox
                  :model-value="isStudentChecked(person.studentId)"
                  @update:model-value="toggleStudent(person.studentId, $event)"
                />
                <span class="flex-1 truncate">
                  {{ person.studentName ?? '-' }}
                </span>
                <span class="text-xs text-muted-foreground tabular-nums">
                  {{ person.participantNumber ?? '-' }}
                </span>
              </label>
            </div>
          </div>
        </div>

        <p
          class="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
        >
          {{ summaryText }}
        </p>
      </DialogBody>

      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          variant="outline"
          :disabled="printing"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          :disabled="!canSubmit || printing"
          @click="submit"
        >
          <Printer class="size-4" />
          {{ printing ? 'Menyiapkan…' : 'Cetak' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
