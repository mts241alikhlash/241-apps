<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { examRoomService } from '../services/examRoomService'
import type { RecoveryAction } from '../types'

const props = defineProps<{
  open: boolean
  roomId: string
  studentId: string | null
  studentName: string | null
  sessionId: string | null
  action: RecoveryAction
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  done: []
}>()

const reason = ref('')
const minutes = ref(10)
const busy = ref(false)
const error = ref<string | null>(null)

const titles = {
  release: 'Lepas Perangkat',
  reopen: 'Buka Kembali Sesi',
  reset: 'Reset Ulang Sesi',
  'extend-time': 'Tambah Waktu Ujian',
  'allow-web': 'Izinkan Mode Web',
  'allow-late': 'Izinkan Masuk Terlambat',
} as const

const descriptions = {
  release:
    'Perangkat siswa dilepas dan siswa masuk lagi dengan token; jawaban yang sudah tersimpan tetap ada dan sisa waktunya tidak berubah.',
  reopen:
    'Jawaban siswa tetap tersimpan dan sesi dilanjutkan dari waktu tersisa.',
  reset:
    'Semua jawaban siswa dihapus dan sesi dimulai dari awal. Tindakan ini permanen.',
  'extend-time': 'Tambahan waktu hanya berlaku untuk sesi siswa ini.',
  'allow-web':
    'Siswa boleh melanjutkan ujian lewat peramban di iPhone atau laptop.',
  'allow-late':
    'Siswa boleh memulai ujian melewati batas toleransi keterlambatan.',
} as const

const title = computed(() => titles[props.action])
const description = computed(() => descriptions[props.action])
const destructive = computed(() => props.action === 'reset')
const valid = computed(
  () =>
    reason.value.trim().length >= 5 &&
    (props.action !== 'extend-time' ||
      (minutes.value >= 1 && minutes.value <= 120)),
)

const subject = computed(() => props.studentName ?? 'Siswa')
const needsSession = computed(
  () => props.action !== 'allow-web' && props.action !== 'allow-late',
)
const canAct = computed(
  () =>
    valid.value &&
    (!needsSession.value ||
      (props.sessionId !== null && props.sessionId !== '')) &&
    (!props.action.startsWith('allow-') || props.studentId !== null),
)

async function dispatch(
  sessionId: string,
  studentId: string,
  text: string,
): Promise<boolean> {
  if (props.action === 'release') {
    return examRoomService.releaseSession(sessionId, text)
  }
  if (props.action === 'reopen') {
    return examRoomService.reopenSession(sessionId, text)
  }
  if (props.action === 'reset') {
    return examRoomService.resetSession(sessionId, text)
  }
  if (props.action === 'extend-time') {
    return examRoomService.extendTime(sessionId, minutes.value, text)
  }
  if (props.action === 'allow-web') {
    return examRoomService.allowWeb(props.roomId, studentId, text)
  }
  return examRoomService.allowLate(props.roomId, studentId, text)
}

async function submit() {
  if (!canAct.value || busy.value) return
  busy.value = true
  error.value = null
  const text = reason.value.trim()
  const done = await dispatch(
    props.sessionId ?? '',
    props.studentId ?? '',
    text,
  )
  busy.value = false
  if (done) {
    emit('done')
    emit('update:open', false)
  } else {
    error.value = 'Tindakan ditolak server.'
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    reason.value = ''
    minutes.value = 10
    error.value = null
  },
)
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ subject }} — {{ description }}</DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)] text-destructive"
          role="alert"
        >
          {{ error }}
        </div>
        <FloatingLabelField
          v-if="action === 'extend-time'"
          label="Tambahan menit"
          :for="'extend-minutes'"
          floating
        >
          <Input
            id="extend-minutes"
            v-model.number="minutes"
            type="number"
            min="1"
            max="120"
            class="tabular-nums"
          />
        </FloatingLabelField>
        <FloatingLabelField
          label="Alasan"
          :for="'recovery-reason'"
          floating
        >
          <Textarea
            id="recovery-reason"
            v-model="reason"
            maxlength="300"
            rows="3"
          />
        </FloatingLabelField>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          variant="outline"
          :disabled="busy"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          :variant="destructive ? 'destructive' : 'default'"
          :disabled="busy || !canAct"
          @click="submit"
        >
          {{ busy ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
