<script setup lang="ts">
import { ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from 'vue-sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import type { RoomReportSummary } from '@/features/exam-room/types'
import { examEventService } from '../services/examEventService'
import type { UserOption } from '../types'

const props = defineProps<{
  open: boolean
  target: RoomReportSummary | null
  people: UserOption[]
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>()

const formSchema = toTypedSchema(
  z.object({
    userId: z.string().min(1, 'Pilih pengawas'),
    reason: z
      .string()
      .trim()
      .min(5, 'Alasan minimal 5 karakter')
      .max(200, 'Alasan maksimal 200 karakter'),
  }),
)

const { handleSubmit, isSubmitting, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: { userId: '', reason: '' },
})

const saveError = ref<string | null>(null)

const onSubmit = handleSubmit(async (values) => {
  const row = props.target
  if (row === null) return
  saveError.value = null
  const result = await examEventService.substituteSupervisor(
    row.roomId,
    row.slotId,
    values.userId,
    values.reason.trim(),
  )
  if (!result.success) {
    saveError.value = result.error
    return
  }
  toast.success('Pengawas diperbarui.')
  emit('saved')
  emit('update:open', false)
})

function close() {
  emit('update:open', false)
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetForm({ values: { userId: '', reason: '' } })
    saveError.value = null
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
        <DialogTitle>
          {{ target?.supervisorName === null ? 'Tetapkan' : 'Ubah' }} Pengawas
        </DialogTitle>
        <DialogDescription>
          Pengganti mendadak tercatat di Berita Acara bersama alasannya.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <Alert
          v-if="saveError"
          variant="destructive"
          role="alert"
        >
          <AlertDescription>{{ saveError }}</AlertDescription>
        </Alert>

        <form
          id="supervisor-substitute-form"
          class="space-y-4"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-slot="{ value, handleChange }"
            name="userId"
            label="Pengawas"
            required
          >
            <div class="content-start">
              <Select
                :model-value="value || undefined"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="person in people"
                    :key="person.id"
                    :value="person.id"
                  >
                    {{ person.identifier }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="reason"
            label="Alasan"
            required
          >
            <div class="content-start">
              <FormControl>
                <Textarea
                  v-bind="componentField"
                  maxlength="200"
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
          @click="close"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="supervisor-substitute-form"
          :disabled="isSubmitting"
        >
          Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
