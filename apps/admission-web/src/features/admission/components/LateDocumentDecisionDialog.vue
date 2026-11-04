<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import type { LateDocumentRow } from '../types'

const props = defineProps<{
  row: LateDocumentRow | null
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'update:row', value: null): void
  (e: 'approve'): void
  (e: 'reject', note: string): void
  (e: 'open-file'): void
}>()

const id = useId()
const reason = ref('')
const reasonError = ref('')

watch(
  () => props.row,
  () => {
    reason.value = ''
    reasonError.value = ''
  },
)

function reject() {
  const note = reason.value.trim()
  if (!note) {
    reasonError.value = 'Alasan wajib diisi'
    return
  }
  emit('reject', note)
}
</script>

<template>
  <Dialog
    :open="!!row"
    @update:open="(open) => !open && emit('update:row', null)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Periksa {{ row?.documentTypeName }}</DialogTitle>
        <DialogDescription>
          {{ row?.applicantName }} · {{ row?.registrationNumber }}
        </DialogDescription>
      </DialogHeader>
      <div class="min-h-0 flex-1 overflow-y-auto space-y-4 dialog-body">
        <Button
          type="button"
          variant="outline"
          data-test="open-file"
          @click="emit('open-file')"
        >
          Lihat berkas
        </Button>
        <FloatingLabelField
          label="Alasan penolakan"
          :for="`${id}-reason`"
          :error="reasonError"
          floating
        >
          <Textarea
            :id="`${id}-reason`"
            v-model="reason"
            rows="3"
            maxlength="500"
            placeholder=" "
          />
        </FloatingLabelField>
      </div>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="destructive"
          data-test="reject"
          :disabled="saving"
          @click="reject"
        >
          Tolak
        </Button>
        <Button
          type="button"
          data-test="approve"
          :disabled="saving"
          @click="emit('approve')"
        >
          Setujui
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
