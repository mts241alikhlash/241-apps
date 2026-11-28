<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Button } from '@mts241alikhlash/ui/button'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { classroomApi } from '@/features/lookup/classroom'
import { examActivityApi } from '../api/examActivityApi'
import type { ClassroomOption, ExamActivityRecord } from '../types'

const props = defineProps<{
  open: boolean
  activity: ExamActivityRecord | null
  assignedIds?: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  assigned: []
}>()

const classrooms = ref<ClassroomOption[]>([])
const classroomIds = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

const available = computed(() =>
  classrooms.value.filter(
    (room) => !(props.assignedIds ?? []).includes(room.id),
  ),
)

async function loadOptions(activity: ExamActivityRecord): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const rooms = await classroomApi.getClassrooms({ page: 1, limit: 200 })
    classrooms.value = rooms.data
      .filter((room) => room.gradeId === activity.gradeId)
      .map((room) => ({
        id: room.id,
        gradeId: room.gradeId,
        label: room.displayName,
      }))
  } catch (err: unknown) {
    error.value = messageOf(err, 'Daftar kelas gagal dimuat.')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.activity],
  () => {
    if (!props.open || props.activity === null) return
    classroomIds.value = []
    void loadOptions(props.activity)
  },
  { immediate: true },
)

function toggleClassroom(id: string, checked: boolean): void {
  classroomIds.value = checked
    ? [...classroomIds.value, id]
    : classroomIds.value.filter((item) => item !== id)
}

async function submit(): Promise<void> {
  const activity = props.activity
  if (activity === null || saving.value || classroomIds.value.length === 0) {
    return
  }
  saving.value = true
  error.value = null
  try {
    await examActivityApi.assignClassrooms(activity.id, {
      classroomIds: [...classroomIds.value],
    })
    toast.success('Kelas ditetapkan dan jadwal kelas dibuat')
    emit('assigned')
    emit('update:open', false)
  } catch (err: unknown) {
    error.value = messageOf(err, 'Kelas gagal ditetapkan.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="(value: boolean) => emit('update:open', value)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Tetapkan Kelas</DialogTitle>
        <DialogDescription>
          Pilih kelas yang ikut kegiatan ini. Jadwal dibuat untuk setiap kelas
          yang dipilih.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <p
          v-if="error !== null"
          role="alert"
          class="text-control text-destructive"
        >
          {{ error }}
        </p>
        <fieldset class="grid gap-1">
          <legend>Kelas yang ikut</legend>
          <p v-if="!loading && available.length === 0">
            Semua kelas pada tingkat ini sudah terjadwal.
          </p>
          <label
            v-for="room in available"
            :key="room.id"
            class="flex items-center gap-2"
          >
            <input
              type="checkbox"
              :value="room.id"
              :checked="classroomIds.includes(room.id)"
              @change="
                toggleClassroom(
                  room.id,
                  ($event.target as HTMLInputElement).checked,
                )
              "
            />
            <span>{{ room.label }}</span>
          </label>
        </fieldset>
      </DialogBody>
      <DialogFooter standard>
        <Button
          variant="outline"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          :disabled="saving || classroomIds.length === 0"
          @click="submit"
        >
          Tetapkan kelas
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
