<script setup lang="ts">
import { ref, useId } from 'vue'
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
import { Textarea } from '@mts241alikhlash/ui/textarea'

defineProps<{
  open: boolean
  noteCount: number
  busy: boolean
  error: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [note: string]
}>()

const note = ref('')
const fieldId = useId()
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Kembalikan Paket</DialogTitle>
        <DialogDescription class="sr-only">
          Tulis catatan untuk guru, lalu kembalikan paket.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
          role="alert"
        >
          {{ error }}
        </div>
        <FloatingLabelField
          label="Catatan untuk guru"
          :for="`${fieldId}-note`"
          floating
        >
          <Textarea
            :id="`${fieldId}-note`"
            v-model="note"
            maxlength="1000"
            rows="4"
          />
        </FloatingLabelField>
        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          {{
            noteCount > 0
              ? `${noteCount} soal sudah diberi catatan.`
              : 'Belum ada catatan pada soal.'
          }}
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
          :disabled="note.trim() === '' || busy"
          @click="emit('confirm', note)"
        >
          Kembalikan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
