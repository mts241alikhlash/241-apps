<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { DatePicker, FormattedNumberInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
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
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { ExamPackageSummary } from '@/features/exam-package/types'
import type { Classroom } from '@/features/lookup/classroom'
import type { ExamEvent } from '@/features/exam-event/types'
import {
  EXAM_TYPES,
  categoryOf,
  examTypeLabel,
  type ExamCategory,
} from '@/features/exam-shared/examType'
import { useScheduleForm } from '../composables/useScheduleForm'
import { examScheduleService } from '../services/examScheduleService'
import type { ExamSchedule, ExamType } from '../types'

const props = defineProps<{
  open: boolean
  schedule?: ExamSchedule | null
  category?: ExamCategory
  packageId?: string
  packageGradeId?: string
  packageTitle?: string
}>()

const allowedTypes = computed(() =>
  props.category
    ? EXAM_TYPES.filter((item) => categoryOf(item) === props.category)
    : EXAM_TYPES,
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [type: ExamType]
}>()

const isEdit = computed(() => Boolean(props.schedule))
const form = useScheduleForm(
  props.schedule
    ? { mode: 'edit', schedule: props.schedule }
    : { mode: 'create' },
)
const {
  packageId: chosenPackageId,
  classroomId,
  eventId,
  type,
  date,
  startTime,
  endTime,
  durationMinutes,
} = form

const packages = ref<ExamPackageSummary[]>([])
const classrooms = ref<Classroom[]>([])
const events = ref<ExamEvent[]>([])
const NO_EVENT = '__none__'
const classroomsLoaded = ref(false)
let classroomRequest = 0

const chosenPackage = computed(() =>
  packages.value.find((item) => item.id === chosenPackageId.value),
)

const packageName = computed(
  () => chosenPackage.value?.title ?? props.packageTitle ?? '',
)

const fieldId = useId()

function gradeOf(id: string): string | undefined {
  if (id === props.packageId && props.packageGradeId) {
    return props.packageGradeId
  }
  return packages.value.find((item) => item.id === id)?.gradeId
}

watch(chosenPackageId, async (id) => {
  const request = ++classroomRequest
  classrooms.value = []
  classroomsLoaded.value = false
  const gradeId = gradeOf(id)
  if (!gradeId) return
  const loaded = await examScheduleService.loadClassrooms(gradeId)
  if (request !== classroomRequest) return
  classrooms.value = loaded
  classroomsLoaded.value = true
})

onMounted(async () => {
  void examScheduleService.loadEvents().then((rows) => {
    events.value = rows
  })
  if (isEdit.value) return
  if (props.packageId && props.packageGradeId) {
    chosenPackageId.value = props.packageId
    return
  }
  packages.value = await examScheduleService.loadPackages()
  if (props.packageId) chosenPackageId.value = props.packageId
})

async function save() {
  const saved = await form.submit()
  if (saved) {
    emit('saved', type.value as ExamType)
    emit('update:open', false)
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent :size="isEdit ? 'md' : 'xl'">
      <DialogHeader standard>
        <DialogTitle>{{
          isEdit ? 'Ubah Jadwal' : 'Tambah Jadwal'
        }}</DialogTitle>
        <DialogDescription class="sr-only">
          Atur paket, kelas, waktu, dan durasi ujian.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <div
          v-if="form.error.value"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
          role="alert"
        >
          {{ form.error.value }}
        </div>

        <p
          v-if="isEdit"
          class="text-[length:var(--text-control,0.75rem)]"
        >
          {{ schedule?.packageTitle }} · {{ schedule?.classroomName ?? '-' }}
        </p>

        <div class="grid gap-5 sm:grid-cols-2">
          <template v-if="!isEdit">
            <p
              v-if="props.packageId"
              class="self-center text-[length:var(--text-control,0.75rem)] sm:col-span-2"
            >
              {{ packageName }}
            </p>
            <FloatingLabelField
              v-else
              label="Paket"
              :for="`${fieldId}-package`"
              floating
            >
              <Select v-model="chosenPackageId">
                <SelectTrigger
                  :id="`${fieldId}-package`"
                  class="w-full"
                >
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="item in packages"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.title }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
            <FloatingLabelField
              label="Kelas"
              :for="`${fieldId}-classroom`"
              floating
            >
              <Select
                v-model="classroomId"
                :disabled="!chosenPackageId"
              >
                <SelectTrigger
                  :id="`${fieldId}-classroom`"
                  class="w-full"
                >
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="classroom in classrooms"
                    :key="classroom.id"
                    :value="classroom.id"
                  >
                    {{ classroom.displayName }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
            <p
              v-if="classroomsLoaded && classrooms.length === 0"
              class="text-[length:var(--text-control,0.75rem)] text-muted-foreground sm:col-span-2"
            >
              Tidak ada kelas aktif untuk tingkat ini. Pastikan semester aktif
              sudah diatur.
            </p>
          </template>

          <FloatingLabelField
            label="Kegiatan ujian"
            :for="`${fieldId}-event`"
            class="sm:col-span-2"
            floating
          >
            <Select
              :model-value="eventId || NO_EVENT"
              @update:model-value="
                eventId = $event === NO_EVENT ? '' : String($event)
              "
            >
              <SelectTrigger
                :id="`${fieldId}-event`"
                class="w-full"
              >
                <SelectValue placeholder="Tanpa ruangan (Ulangan Harian)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="NO_EVENT">
                  Tanpa kegiatan (Ulangan Harian atau Tugas di kelas)
                </SelectItem>
                <SelectItem
                  v-for="item in events"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>

          <FloatingLabelField
            label="Jenis ujian"
            :for="`${fieldId}-type`"
            floating
          >
            <Select
              v-model="type"
              :disabled="form.typeLocked"
            >
              <SelectTrigger
                :id="`${fieldId}-type`"
                class="w-full"
              >
                <SelectValue placeholder="Pilih jenis ujian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in allowedTypes"
                  :key="option"
                  :value="option"
                >
                  {{ examTypeLabel(option) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            label="Tanggal"
            :for="`${fieldId}-date`"
            floating
          >
            <DatePicker
              :id="`${fieldId}-date`"
              v-model="date"
              allow-future-dates
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Durasi"
            :for="`${fieldId}-duration`"
            floating
          >
            <FormattedNumberInput
              :id="`${fieldId}-duration`"
              v-model="durationMinutes"
              numeric
              suffix=" menit"
              :max-digits="4"
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Jam mulai"
            :for="`${fieldId}-start`"
            floating
          >
            <Input
              :id="`${fieldId}-start`"
              v-model="startTime"
              type="time"
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Jam selesai"
            :for="`${fieldId}-end`"
            floating
          >
            <Input
              :id="`${fieldId}-end`"
              v-model="endTime"
              type="time"
            />
          </FloatingLabelField>
        </div>

        <p
          v-if="form.problem.value"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          {{ form.problem.value }}
        </p>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="button"
          :disabled="form.problem.value !== null || form.saving.value"
          @click="save"
        >
          {{ form.saving.value ? 'Menyimpan…' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
