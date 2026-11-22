<script setup lang="ts">
import { ref, watch } from 'vue'
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
import { examPackageApi } from '@/features/exam-package/api/examPackageApi'
import { classroomApi } from '@/features/lookup/classroom'
import { examActivityApi } from '../api/examActivityApi'
import type {
  ClassroomOption,
  ExamActivityRecord,
  PackageOption,
} from '../types'

const props = defineProps<{
  open: boolean
  activity: ExamActivityRecord | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  attached: []
}>()

const packages = ref<PackageOption[]>([])
const classrooms = ref<ClassroomOption[]>([])
const packageId = ref('')
const classroomIds = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

async function loadOptions(activity: ExamActivityRecord): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [packs, rooms] = await Promise.all([
      examPackageApi.getPackages({
        page: 1,
        limit: 200,
        subjectId: activity.subjectId,
        gradeId: activity.gradeId,
      }),
      classroomApi.getClassrooms({ page: 1, limit: 200 }),
    ])
    packages.value = packs.data
      .filter((item) => item.status === 'APPROVED' || item.status === 'LOCKED')
      .map((item) => ({
        id: item.id,
        subjectId: item.subjectId,
        label: item.title,
      }))
    classrooms.value = rooms.data
      .filter((room) => room.gradeId === activity.gradeId)
      .map((room) => ({
        id: room.id,
        gradeId: room.gradeId,
        label: room.displayName,
      }))
  } catch (err: unknown) {
    error.value = messageOf(err, 'Daftar paket dan kelas gagal dimuat.')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.activity],
  () => {
    if (!props.open || props.activity === null) return
    packageId.value = ''
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
  if (
    activity === null ||
    saving.value ||
    packageId.value === '' ||
    classroomIds.value.length === 0
  ) {
    return
  }
  saving.value = true
  try {
    await examActivityApi.attachPackage(activity.id, {
      packageId: packageId.value,
      classroomIds: [...classroomIds.value],
    })
    toast.success('Paket soal dipasang dan jadwal kelas dibuat')
    emit('attached')
    emit('update:open', false)
  } catch (err: unknown) {
    toast.error(messageOf(err, 'Paket soal gagal dipasang.'))
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
        <DialogTitle>Pasang Paket Soal</DialogTitle>
        <DialogDescription>
          Pilih paket yang sudah disetujui untuk mata pelajaran dan tingkat
          kegiatan ini.
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
        <label class="grid gap-1">
          <span>Paket soal</span>
          <select
            id="attach-package"
            v-model="packageId"
            :disabled="loading"
          >
            <option value="">Pilih paket</option>
            <option
              v-for="item in packages"
              :key="item.id"
              :value="item.id"
            >
              {{ item.label }}
            </option>
          </select>
        </label>
        <fieldset class="grid gap-1">
          <legend>Kelas yang ikut</legend>
          <p v-if="!loading && classrooms.length === 0">
            Belum ada kelas aktif pada tingkat ini.
          </p>
          <label
            v-for="room in classrooms"
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
          :disabled="saving || packageId === '' || classroomIds.length === 0"
          @click="submit"
        >
          Pasang paket
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
