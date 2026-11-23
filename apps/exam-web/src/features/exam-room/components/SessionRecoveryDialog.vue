<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
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
import { FloatingField, FormControl } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { examRoomService } from '../services/examRoomService'
import type { RecoveryAction } from '../types'

const props = withDefaults(
  defineProps<{
    open: boolean
    roomId: string
    studentId: string | null
    studentName: string | null
    sessionId: string | null
    action: RecoveryAction
    maxExtendMinutes?: number | null
    windowOpen?: boolean
  }>(),
  { maxExtendMinutes: null, windowOpen: true },
)

const emit = defineEmits<{ 'update:open': [value: boolean]; done: [] }>()

const busy = ref(false)
const error = ref<string | null>(null)

const titles = {
  release: 'Lepas Perangkat',
  reopen: 'Buka Kembali Sesi',
  reset: 'Reset Ulang Sesi',
  'extend-time': 'Tambah Waktu Ujian',
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
  'allow-late':
    'Siswa boleh memulai ujian melewati batas toleransi keterlambatan.',
} as const

const title = computed(() => titles[props.action])
const description = computed(() => descriptions[props.action])
const destructive = computed(() => props.action === 'reset')
const extendLimit = computed(() => Math.min(props.maxExtendMinutes ?? 120, 120))
const windowClosed = computed(
  () =>
    (props.action === 'extend-time' && extendLimit.value === 0) ||
    (props.action === 'reopen' && !props.windowOpen),
)

const schema = computed(() =>
  toTypedSchema(
    z.object({
      reason: z
        .string()
        .trim()
        .min(5, 'Alasan minimal 5 karakter')
        .max(300, 'Alasan maksimal 300 karakter'),
      minutes:
        props.action === 'extend-time'
          ? z
              .number({ invalid_type_error: 'Tambahan menit wajib diisi' })
              .int('Tambahan menit harus bilangan bulat')
              .min(1, 'Tambahan menit minimal 1')
              .max(
                Math.max(extendLimit.value, 1),
                `Tambahan menit maksimal ${extendLimit.value}`,
              )
          : z.number().optional(),
    }),
  ),
)

const { handleSubmit, resetForm } = useForm({
  validationSchema: schema,
  initialValues: { reason: '', minutes: 10 },
})

const subject = computed(() => props.studentName ?? 'Siswa')
const needsSession = computed(() => props.action !== 'allow-late')
const canAct = computed(
  () =>
    (!needsSession.value ||
      (props.sessionId !== null && props.sessionId !== '')) &&
    (!props.action.startsWith('allow-') || props.studentId !== null) &&
    !windowClosed.value,
)

async function dispatch(
  sessionId: string,
  studentId: string,
  text: string,
  minutes: number,
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
    return examRoomService.extendTime(sessionId, minutes, text)
  }
  return examRoomService.allowLate(props.roomId, studentId, text)
}

const submit = handleSubmit(async (values) => {
  if (!canAct.value || busy.value) return
  busy.value = true
  error.value = null
  const done = await dispatch(
    props.sessionId ?? '',
    props.studentId ?? '',
    values.reason.trim(),
    values.minutes ?? 0,
  )
  busy.value = false
  if (done) {
    emit('done')
    emit('update:open', false)
  } else {
    error.value = 'Tindakan ditolak server.'
  }
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetForm({ values: { reason: '', minutes: 10 } })
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
        <DialogDescription>{{ subject }} · {{ description }}</DialogDescription>
      </DialogHeader>
      <DialogBody>
        <form
          id="recovery-form"
          class="space-y-4"
          @submit.prevent="submit"
        >
          <div
            v-if="error"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-control text-destructive"
            role="alert"
          >
            {{ error }}
          </div>
          <p
            v-if="windowClosed"
            class="text-control text-destructive"
          >
            Jendela ujian sudah habis. Ubah jam selesai Kegiatan terlebih dahulu
            agar waktu bisa ditambah.
          </p>
          <FloatingField
            v-if="action === 'extend-time'"
            v-slot="{ componentField }"
            name="minutes"
            label="Tambahan menit"
            required
          >
            <FormControl>
              <Input
                v-bind="componentField"
                type="number"
                min="1"
                :max="extendLimit"
                :disabled="extendLimit === 0"
              />
            </FormControl>
          </FloatingField>
          <FloatingField
            v-slot="{ componentField }"
            name="reason"
            label="Alasan"
            required
          >
            <FormControl>
              <Textarea
                v-bind="componentField"
                maxlength="300"
                rows="3"
              />
            </FormControl>
          </FloatingField>
        </form>
      </DialogBody>
      <DialogFooter standard>
        <Button
          variant="outline"
          :disabled="busy"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="recovery-form"
          :variant="destructive ? 'destructive' : 'default'"
          :disabled="busy || !canAct"
        >
          {{ busy ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
