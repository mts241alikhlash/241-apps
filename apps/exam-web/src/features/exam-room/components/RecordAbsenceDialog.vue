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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { examRoomService } from '../services/examRoomService'
import type { RoomMonitorParticipant } from '../types'
import { reasonLabel } from '../types'

const REASONS = ['SICK', 'PERMITTED', 'ABSENT'] as const

const props = defineProps<{
  open: boolean
  roomId: string
  slotId: string
  participant: RoomMonitorParticipant | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const reason = ref<(typeof REASONS)[number]>('SICK')
const note = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

const studentName = computed(() => props.participant?.studentName ?? 'Siswa')

async function submit() {
  const target = props.participant
  if (!target || busy.value) return
  busy.value = true
  error.value = null
  const result = await examRoomService.recordAbsence(
    props.roomId,
    props.slotId,
    {
      studentId: target.studentId,
      scheduleId: target.scheduleId,
      reason: reason.value,
      ...(note.value.trim() === '' ? {} : { note: note.value.trim() }),
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
    reason.value = 'SICK'
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
        <DialogTitle>Catat Ketidakhadiran</DialogTitle>
        <DialogDescription>
          {{ studentName }}. Alasan ini mengalir ke kandidat ujian susulan.
        </DialogDescription>
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
          label="Alasan"
          :for="'absence-reason'"
          floating
        >
          <Select v-model="reason">
            <SelectTrigger
              id="absence-reason"
              class="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in REASONS"
                :key="option"
                :value="option"
              >
                {{ reasonLabel(option) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>
        <FloatingLabelField
          label="Catatan"
          :for="'absence-note'"
          floating
        >
          <Textarea
            id="absence-note"
            v-model="note"
            maxlength="200"
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
          :disabled="busy"
          @click="submit"
        >
          {{ busy ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
