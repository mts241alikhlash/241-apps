<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
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
  (e: 'upload', file: File): void
}>()

const file = ref<File | null>(null)

watch(
  () => props.row,
  () => {
    file.value = null
  },
)

function pick(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
}
</script>

<template>
  <Dialog
    :open="!!row"
    @update:open="(open) => !open && emit('update:row', null)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Unggah {{ row?.documentTypeName }}</DialogTitle>
        <DialogDescription>
          {{ row?.applicantName }} · {{ row?.registrationNumber }}
        </DialogDescription>
      </DialogHeader>
      <form
        data-test="upload-form"
        class="flex flex-1 flex-col justify-between"
        @submit.prevent="file && emit('upload', file)"
      >
        <div class="min-h-0 flex-1 overflow-y-auto space-y-2 dialog-body">
          <label
            class="text-[length:var(--text-control,0.75rem)] font-medium"
            for="late-document-file"
          >
            Berkas (JPG, PNG atau PDF)
          </label>
          <input
            id="late-document-file"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            class="block w-full text-[length:var(--text-control,0.75rem)]"
            :disabled="saving"
            @change="pick"
          />
        </div>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="saving"
            @click="emit('update:row', null)"
          >
            Batal
          </Button>
          <Button
            type="submit"
            :disabled="saving || !file"
          >
            {{ saving ? 'Mengunggah…' : 'Unggah' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
