<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { AppCombobox } from '@mts241alikhlash/ui'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
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
import type { RoomMonitorParticipant } from '../types'

const props = defineProps<{
  open: boolean
  roomId: string
  slotId: string
  participant: RoomMonitorParticipant | null
  participants?: RoomMonitorParticipant[]
  place?: (studentId: string) => { roomId: string; slotId: string } | null
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>()

const formSchema = toTypedSchema(
  z
    .object({
      studentId: z.string(),
      category: z.string().trim().min(1, 'Kategori wajib diisi').max(50),
      note: z
        .string()
        .trim()
        .min(1, 'Catatan wajib diisi')
        .max(300, 'Catatan maksimal 300 karakter'),
    })
    .superRefine((value, ctx) => {
      if (props.participant === null && value.studentId === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['studentId'],
          message: 'Peserta wajib dipilih',
        })
      }
    }),
)

const { handleSubmit, isSubmitting, values, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: { studentId: '', category: '', note: '' },
})

const error = ref<string | null>(null)

const studentOptions = computed(() =>
  (props.participants ?? []).map((row) => ({
    value: row.studentId,
    label: row.studentName ?? 'Siswa tidak ditemukan',
  })),
)
const target = computed(
  () =>
    props.participant ??
    props.participants?.find((row) => row.studentId === values.studentId) ??
    null,
)
const studentName = computed(() => target.value?.studentName ?? 'Pilih peserta')

const onSubmit = handleSubmit(async (form) => {
  const chosen = target.value
  if (chosen === null) return
  error.value = null
  const sessionId = chosen.session?.sessionId
  const where = props.place?.(chosen.studentId) ?? {
    roomId: props.roomId,
    slotId: props.slotId,
  }
  if (where.slotId === '') {
    error.value = 'Slot pengawas ruangan belum tersedia.'
    return
  }
  const result = await examRoomService.recordFieldNote(
    where.roomId,
    where.slotId,
    {
      studentId: chosen.studentId,
      ...(sessionId === undefined ? {} : { sessionId }),
      category: form.category.trim(),
      note: form.note.trim(),
    },
  )
  if (result.success) {
    toast.success('Catatan disimpan.')
    emit('saved')
    emit('update:open', false)
  } else {
    error.value = result.error
  }
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetForm({ values: { studentId: '', category: '', note: '' } })
    error.value = null
  },
)
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent
      size="md"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>Catat Pelanggaran Fisik</DialogTitle>
        <DialogDescription>{{ studentName }}</DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <Alert
          v-if="error"
          variant="destructive"
        >
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
        <form
          id="field-note-form"
          class="grid gap-4"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-if="!participant"
            v-slot="{ value, handleChange }"
            name="studentId"
            label="Peserta"
            required
            always-float
          >
            <div class="content-start">
              <FormControl>
                <AppCombobox
                  :model-value="value"
                  :options="studentOptions"
                  placeholder="Pilih peserta"
                  search-placeholder="Cari nama peserta..."
                  empty-text="Peserta tidak ditemukan."
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>
          <FloatingField
            v-slot="{ componentField }"
            name="category"
            label="Kategori"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="50"
                />
              </FormControl>
            </div>
          </FloatingField>
          <FloatingField
            v-slot="{ componentField }"
            name="note"
            label="Catatan"
            required
          >
            <div class="content-start">
              <FormControl>
                <Textarea
                  v-bind="componentField"
                  maxlength="300"
                  rows="3"
                />
              </FormControl>
            </div>
          </FloatingField>
        </form>
      </DialogBody>
      <DialogFooter standard>
        <Button
          type="button"
          variant="outline"
          :disabled="isSubmitting"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="field-note-form"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
