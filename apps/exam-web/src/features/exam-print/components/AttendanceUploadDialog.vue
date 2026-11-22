<script setup lang="ts">
import { watch } from 'vue'
import { FileDropzone } from '@mts241alikhlash/ui'
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
import { REPORT_FILE_ACCEPT } from '@/features/exam-room/composables/reportFile'
import type { AttendanceKind, AttendanceTarget } from '../attendanceFileTypes'
import { useAttendanceUpload } from '../composables/useAttendanceUpload'
import { attendanceFileService } from '../services/attendanceFileService'

const props = defineProps<{
  open: boolean
  eventId: string
  kind: AttendanceKind
  title: string
  targets: AttendanceTarget[]
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  done: []
}>()

const upload = useAttendanceUpload({
  upload: (target, file) =>
    attendanceFileService.uploadAttendanceFile(
      props.eventId,
      props.kind,
      target,
      file,
    ),
})
const {
  confirm,
  done,
  failures,
  files,
  finished,
  problems,
  ready,
  retryFailed,
  running,
  runTotal,
  setFile,
  succeeded,
  targets: queue,
} = upload

watch(
  () => props.open,
  (open) => {
    if (open) upload.start(props.targets)
  },
  { immediate: true },
)

watch(finished, (value) => {
  if (value && failures.value.length === 0) close()
})

function close() {
  if (succeeded.value > 0) emit('done')
  emit('update:open', false)
}

function pick(key: string, event: Event) {
  setFile(key, (event.target as HTMLInputElement).files?.[0] ?? null)
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="
      (value) => !running && (value ? emit('update:open', true) : close())
    "
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>
          Unggah daftar hadir yang sudah ditandatangani dan dipindai (PDF, JPG,
          atau PNG, maks. 10 MB). Berkas yang sudah ada akan diganti.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-3">
        <ul
          v-if="!finished || failures.length === 0"
          class="space-y-3"
        >
          <li
            v-for="target in queue"
            :key="target.key"
            class="space-y-1"
          >
            <p class="text-control font-medium">{{ target.label }}</p>
            <FileDropzone
              :accept="REPORT_FILE_ACCEPT"
              :file-name="files[target.key]?.name"
              clearable
              :invalid="problems[target.key] !== undefined"
              :disabled="running"
              :aria-label="`Pilih berkas ${target.label}`"
              hint="PDF, JPG, atau PNG, maks. 10 MB"
              @change="pick(target.key, $event)"
              @clear="setFile(target.key, null)"
            />
            <p
              v-if="problems[target.key]"
              class="text-control text-destructive"
              role="alert"
            >
              {{ problems[target.key] }}
            </p>
          </li>
        </ul>
        <p
          v-if="running"
          class="text-control text-muted-foreground"
          role="status"
        >
          {{ done }} dari {{ runTotal }}
        </p>
        <template v-if="finished && failures.length > 0">
          <p class="text-control">
            {{ succeeded }} dari {{ succeeded + failures.length }} berkas
            terunggah.
          </p>
          <ul
            class="space-y-1 text-control text-destructive"
            role="alert"
          >
            <li
              v-for="item in failures"
              :key="item.key"
            >
              {{ item.label }}: {{ item.error }}
            </li>
          </ul>
        </template>
      </DialogBody>
      <DialogFooter standard>
        <Button
          v-if="!finished"
          variant="outline"
          :disabled="running"
          @click="close"
        >
          Batal
        </Button>
        <Button
          v-if="finished && failures.length > 0"
          :disabled="running"
          @click="retryFailed"
        >
          Coba lagi yang gagal
        </Button>
        <Button
          v-else
          :disabled="!ready || running"
          @click="confirm"
        >
          {{ running ? 'Mengunggah...' : 'Unggah' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
