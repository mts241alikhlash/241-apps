<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
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
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>()

const category = ref('')
const note = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

const chosenId = ref<string | null>('')
const studentOptions = computed(() =>
  (props.participants ?? []).map((row) => ({
    value: row.studentId,
    label: row.studentName ?? 'Siswa tidak ditemukan',
  })),
)
const target = computed(
  () =>
    props.participant ??
    props.participants?.find((row) => row.studentId === chosenId.value) ??
    null,
)
const studentName = computed(() => target.value?.studentName ?? 'Pilih peserta')
const valid = computed(
  () =>
    target.value !== null &&
    category.value.trim().length > 0 &&
    note.value.trim().length > 0,
)

async function submit() {
  const chosen = target.value
  if (!chosen || !valid.value || busy.value) return
  busy.value = true
  error.value = null
  const sessionId = chosen.session?.sessionId
  const result = await examRoomService.recordFieldNote(
    props.roomId,
    props.slotId,
    {
      studentId: chosen.studentId,
      ...(sessionId === undefined ? {} : { sessionId }),
      category: category.value.trim(),
      note: note.value.trim(),
    },
  )
  busy.value = false
  if (result.success) {
    emit('saved')
    emit('update:open', false)
  } else {
    error.value = result.error
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    chosenId.value = ''
    category.value = ''
    note.value = ''
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
        <DialogTitle>Catat Pelanggaran Fisik</DialogTitle>
        <DialogDescription>{{ studentName }}</DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <Alert
          v-if="error"
          variant="destructive"
          role="alert"
        >
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
        <FloatingLabelField
          v-if="!participant"
          label="Peserta"
          for="field-note-student"
          floating
        >
          <AppCombobox
            v-model="chosenId"
            :options="studentOptions"
            placeholder="Pilih peserta"
            search-placeholder="Cari nama peserta..."
            empty-text="Peserta tidak ditemukan."
          />
        </FloatingLabelField>
        <FloatingLabelField
          label="Kategori"
          :for="'field-note-category'"
          floating
        >
          <Input
            id="field-note-category"
            v-model="category"
            maxlength="50"
            placeholder="Membawa catatan, berbicara, alat komunikasi"
          />
        </FloatingLabelField>
        <FloatingLabelField
          label="Catatan"
          :for="'field-note-note'"
          floating
        >
          <Textarea
            id="field-note-note"
            v-model="note"
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
          :disabled="busy || !valid"
          @click="submit"
        >
          {{ busy ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
