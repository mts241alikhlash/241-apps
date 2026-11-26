<script setup lang="ts">
import { computed, toRefs } from 'vue'
import type { AcceptableValue } from '@mts241alikhlash/ui/select'
import type { TeachingAssignment } from '@/features/lookup/teaching-assignment/types'
import { useAssessmentItemForm } from '../composables/useAssessmentItemForm'
import type { AssessmentItem } from '../types'
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
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
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { AlertCircle, AlertTriangle, Loader2 } from '@lucide/vue'

interface ClassroomOption {
  id: string
  code?: string
  name: string | null
  gradeId?: string
  grade?: { level: number; name: string } | null
  classroomLevelId?: string
  classroomLevel?: { level?: number; name: string } | null
}

const props = defineProps<{
  open: boolean
  assignments: TeachingAssignment[]
  classrooms: ClassroomOption[]
  subjects: { id: string; name: string }[]
  initialClassroomId: string | null
  initialSubjectId: string | null
  editData?: AssessmentItem | null
  allowedTypes?: AssessmentItem['type'][]
  defaultType?: AssessmentItem['type']
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save-success': []
}>()

const open = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const { editData } = toRefs(props)

const allAssessmentTypeOptions: {
  value: AssessmentItem['type']
  label: string
}[] = [
  { value: 'DAILY', label: 'Harian' },
  { value: 'ASSIGNMENT', label: 'Tugas' },
  { value: 'PRACTICAL', label: 'Praktikum' },
  { value: 'MIDTERM', label: 'UTS' },
  { value: 'FINAL', label: 'UAS' },
]

const assessmentTypeOptions = computed(() => {
  if (!props.allowedTypes?.length) return allAssessmentTypeOptions
  return allAssessmentTypeOptions.filter((opt) =>
    props.allowedTypes?.includes(opt.value),
  )
})

const isExamOnly = computed(
  () =>
    Boolean(props.allowedTypes?.length) &&
    props.allowedTypes!.every((t) => t === 'MIDTERM' || t === 'FINAL'),
)

function gradeIdOf(classroom: ClassroomOption): string {
  return classroom.gradeId ?? classroom.classroomLevelId ?? ''
}

function gradeIdForClassroom(classroomId: string | null): string | null {
  if (!classroomId) {
    return gradeOptions.value.length === 1 ? gradeOptions.value[0].value : null
  }
  const classroom = props.classrooms.find((c) => c.id === classroomId)
  if (!classroom) return null
  return gradeIdOf(classroom) || null
}

const assignedClassroomIds = computed(
  () => new Set(props.assignments.map((a) => a.classroomId)),
)

const gradeOptions = computed(() => {
  const grades = new Map<
    string,
    { value: string; label: string; level: number }
  >()
  for (const classroom of props.classrooms) {
    if (!assignedClassroomIds.value.has(classroom.id)) continue
    const id = gradeIdOf(classroom)
    if (!id || grades.has(id)) continue
    const label = classroom.grade?.name ?? classroom.classroomLevel?.name ?? '-'
    const level = classroom.grade?.level ?? classroom.classroomLevel?.level ?? 0
    grades.set(id, { value: id, label, level })
  }
  return [...grades.values()].sort(
    (a, b) => a.level - b.level || a.label.localeCompare(b.label, 'id'),
  )
})

function classroomOptionsFor(gradeId: string) {
  return props.classrooms
    .filter(
      (c) =>
        assignedClassroomIds.value.has(c.id) &&
        (!gradeId || gradeIdOf(c) === gradeId),
    )
    .map((c) => ({ value: c.id, label: c.code ?? c.name ?? '-' }))
}

function subjectOptionsFor(classroomId: string) {
  const allowed = new Set(
    props.assignments
      .filter((a) => !classroomId || a.classroomId === classroomId)
      .map((a) => a.subjectId),
  )
  return props.subjects
    .filter((s) => allowed.has(s.id))
    .map((s) => ({ value: s.id, label: s.name }))
}

const itemForm = useAssessmentItemForm({
  assignments: () => props.assignments,
  gradeIdForClassroom,
  initialClassroomId: () => props.initialClassroomId,
  initialSubjectId: () => props.initialSubjectId,
  editData: () => editData.value ?? null,
  isOpen: () => props.open,
  defaultType: () =>
    props.defaultType ?? assessmentTypeOptions.value[0]?.value ?? 'DAILY',
  onSuccess: () => {
    emit('save-success')
    open.value = false
  },
})

function handleGradeChange(nextGradeId: AcceptableValue) {
  const value = typeof nextGradeId === 'string' ? nextGradeId : ''
  itemForm.form.setFieldValue('gradeId', value)
  const validClassrooms = classroomOptionsFor(value)
  if (validClassrooms.length === 1) {
    handleClassroomChange(validClassrooms[0].value)
    return
  }
  const currentClassroom = itemForm.form.values.classroomId
  if (
    currentClassroom &&
    !validClassrooms.some((c) => c.value === currentClassroom)
  ) {
    itemForm.form.setFieldValue('classroomId', '')
    itemForm.form.setFieldValue('subjectId', '')
  }
}

function handleClassroomChange(nextClassroomId: AcceptableValue) {
  const value = typeof nextClassroomId === 'string' ? nextClassroomId : ''
  itemForm.form.setFieldValue('classroomId', value)
  const validSubjects = subjectOptionsFor(value)
  const currentSubject = itemForm.form.values.subjectId
  if (validSubjects.length === 1) {
    itemForm.form.setFieldValue('subjectId', validSubjects[0].value)
    return
  }
  if (
    currentSubject &&
    !validSubjects.some((subject) => subject.value === currentSubject)
  ) {
    itemForm.form.setFieldValue('subjectId', '')
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      size="md"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>{{
          itemForm.isEditing.value
            ? isExamOnly
              ? 'Ubah Ujian'
              : 'Ubah Tugas'
            : isExamOnly
              ? 'Tambah Ujian'
              : 'Tambah Tugas'
        }}</DialogTitle>
        <DialogDescription>
          {{
            itemForm.isEditing.value
              ? 'Perbarui informasi butir penilaian. Klik simpan untuk menerapkan.'
              : 'Tambahkan butir penilaian baru untuk mata pelajaran ini.'
          }}
        </DialogDescription>
      </DialogHeader>

      <DialogBody>
        <form
          id="assessment-item-form"
          class="space-y-4"
          @submit.prevent="itemForm.onSubmit"
        >
          <template v-if="!itemForm.isEditing.value">
            <div class="grid gap-4 sm:grid-cols-2">
              <FloatingField
                v-slot="{ value }"
                name="gradeId"
                label="Tingkat"
                required
              >
                <div class="content-start">
                  <Select
                    :model-value="value || undefined"
                    @update:model-value="handleGradeChange"
                  >
                    <FormControl>
                      <SelectTrigger class="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem
                        v-for="grade in gradeOptions"
                        :key="grade.value"
                        :value="grade.value"
                      >
                        {{ grade.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FloatingField>

              <FloatingField
                v-slot="{ value }"
                name="classroomId"
                label="Kelas"
                required
              >
                <div class="content-start">
                  <Select
                    :model-value="value || undefined"
                    :disabled="!itemForm.form.values.gradeId"
                    @update:model-value="handleClassroomChange"
                  >
                    <FormControl>
                      <SelectTrigger class="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem
                        v-for="cls in classroomOptionsFor(
                          itemForm.form.values.gradeId,
                        )"
                        :key="cls.value"
                        :value="cls.value"
                      >
                        {{ cls.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FloatingField>
            </div>
          </template>

          <div
            :class="
              !itemForm.isEditing.value ? 'grid gap-4 sm:grid-cols-2' : ''
            "
          >
            <FloatingField
              v-if="!itemForm.isEditing.value"
              v-slot="{ value, handleChange }"
              name="subjectId"
              label="Mata Pelajaran"
              required
            >
              <div class="content-start">
                <Select
                  :model-value="value || undefined"
                  :disabled="!itemForm.form.values.classroomId"
                  @update:model-value="handleChange"
                >
                  <FormControl>
                    <SelectTrigger class="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem
                      v-for="sub in subjectOptionsFor(
                        itemForm.form.values.classroomId,
                      )"
                      :key="sub.value"
                      :value="sub.value"
                    >
                      {{ sub.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="type"
              label="Tipe"
              required
            >
              <div class="content-start">
                <Select
                  :model-value="value"
                  @update:model-value="handleChange"
                >
                  <FormControl>
                    <SelectTrigger class="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem
                      v-for="opt in assessmentTypeOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FloatingField>
          </div>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="name"
            :label="isExamOnly ? 'Nama Ujian' : 'Nama Tugas'"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input
                  :model-value="value"
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>

          <Alert
            v-if="itemForm.showRenameWarning.value"
            class="border-warning/30 bg-warning/10 text-warning"
          >
            <AlertTriangle class="size-4" />
            <AlertDescription class="text-warning">
              Nama ini dipakai sebagai nama TP/LM di RDM. Kalau sudah dikirim ke
              RDM, mengganti nama akan membuat TP/LM baru di sana. Nama untuk
              RDM maksimal 50 karakter.
            </AlertDescription>
          </Alert>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="material"
            label="Ringkasan TP/Lingkup Materi"
          >
            <div class="content-start space-y-1">
              <FormControl>
                <Textarea
                  rows="3"
                  maxlength="500"
                  :model-value="value ?? ''"
                  @update:model-value="(v) => handleChange(String(v))"
                />
              </FormControl>
              <p class="text-right text-control text-muted-foreground">
                Opsional · {{ String(value ?? '').length }}/500
              </p>
            </div>
          </FloatingField>

          <div class="grid gap-4 sm:grid-cols-2">
            <FloatingField
              v-slot="{ value, handleChange }"
              name="weight"
              label="Bobot (%)"
            >
              <div class="content-start">
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    :model-value="value"
                    @update:model-value="(v) => handleChange(Number(v))"
                  />
                </FormControl>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="maxScore"
              label="Skor Maksimal"
            >
              <div class="content-start">
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="1000"
                    :model-value="value"
                    @update:model-value="(v) => handleChange(Number(v))"
                  />
                </FormControl>
              </div>
            </FloatingField>
          </div>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="kktp"
            label="Nilai Batas Ketercapaian (KKTP)"
          >
            <div class="content-start space-y-1">
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  :model-value="value ?? ''"
                  @update:model-value="
                    (v) =>
                      handleChange(
                        v === '' || v === null || v === undefined
                          ? null
                          : Number(v),
                      )
                  "
                />
              </FormControl>
              <p class="text-control text-muted-foreground">
                Opsional, bilangan bulat 0–100.
              </p>
            </div>
          </FloatingField>

          <Alert
            v-if="itemForm.formError.value"
            variant="destructive"
          >
            <AlertCircle class="size-4" />
            <AlertTitle>Kesalahan Sistem</AlertTitle>
            <AlertDescription>{{ itemForm.formError.value }}</AlertDescription>
          </Alert>
        </form>
      </DialogBody>

      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="itemForm.isSaving.value"
          @click="open = false"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="assessment-item-form"
          :disabled="itemForm.isSaving.value"
        >
          <Loader2
            v-if="itemForm.isSaving.value"
            class="size-4 animate-spin"
          />
          {{ itemForm.isSaving.value ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
