<script setup lang="ts">
import { onMounted, ref, useId } from 'vue'
import { FormattedNumberInput } from '@mts241alikhlash/ui'
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
import { examEventService } from '../services/examEventService'
import { useRoomForm } from '../composables/useRoomForm'
import type { ExamRoom, UserOption } from '../types'

const props = defineProps<{
  open: boolean
  eventId: string
  room?: ExamRoom | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const form = useRoomForm(
  () => props.eventId,
  () => props.room ?? null,
)
const technicians = ref<UserOption[]>([])
const NOBODY = '__none__'
const fieldId = useId()

async function save() {
  const saved = await form.submit()
  if (saved) {
    emit('saved')
    emit('update:open', false)
  }
}

onMounted(async () => {
  technicians.value = await examEventService.loadStaff('EXAM_TECHNICIAN')
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>{{
          room ? 'Ubah Ruangan' : 'Tambah Ruangan'
        }}</DialogTitle>
        <DialogDescription class="sr-only">
          Atur kode, nama, gedung, kapasitas, dan teknisi ruangan.
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

        <FloatingLabelField
          label="Kode ruangan"
          :for="`${fieldId}-code`"
          floating
        >
          <Input
            :id="`${fieldId}-code`"
            v-model="form.code.value"
            maxlength="30"
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="Nama ruangan"
          :for="`${fieldId}-name`"
          floating
        >
          <Input
            :id="`${fieldId}-name`"
            v-model="form.name.value"
            maxlength="100"
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="Gedung"
          :for="`${fieldId}-building`"
          floating
        >
          <Input
            :id="`${fieldId}-building`"
            v-model="form.building.value"
            maxlength="100"
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="Kapasitas"
          :for="`${fieldId}-capacity`"
          floating
        >
          <FormattedNumberInput
            :id="`${fieldId}-capacity`"
            v-model="form.capacity.value"
            numeric
            suffix=" kursi"
            :max-digits="3"
          />
        </FloatingLabelField>

        <FloatingLabelField
          label="Teknisi ruangan"
          :for="`${fieldId}-technician`"
          floating
        >
          <Select
            :model-value="form.technicianUserId.value || NOBODY"
            @update:model-value="
              form.technicianUserId.value =
                $event === NOBODY ? '' : String($event)
            "
          >
            <SelectTrigger
              :id="`${fieldId}-technician`"
              class="w-full"
            >
              <SelectValue placeholder="Belum ditugaskan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="NOBODY">Belum ditugaskan</SelectItem>
              <SelectItem
                v-for="person in technicians"
                :key="person.id"
                :value="person.id"
              >
                {{ person.identifier }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>

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
          Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
