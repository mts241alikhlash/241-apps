<script setup lang="ts">
import { ref, useId, watch } from 'vue'
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
import MathPreview from './MathPreview.vue'

const props = defineProps<{ initial: string; editing: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [latex: string] }>()

const latex = ref('')
const fieldId = useId()

watch(
  () => [open.value, props.initial],
  () => {
    if (open.value) latex.value = props.initial
  },
  { immediate: true },
)

function confirm() {
  const value = latex.value.trim()
  if (value === '') return
  emit('confirm', value)
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>{{
          editing ? 'Ubah Rumus' : 'Sisipkan Rumus'
        }}</DialogTitle>
        <DialogDescription class="sr-only">
          Tulis rumus dalam LaTeX, misalnya \frac{1}{2}.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-3">
        <FloatingLabelField
          label="Rumus (LaTeX)"
          :for="fieldId"
          floating
        >
          <Textarea
            :id="fieldId"
            v-model="latex"
            rows="3"
            class="resize-none"
            dir="ltr"
          />
        </FloatingLabelField>
        <MathPreview :latex="latex" />
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          variant="outline"
          type="button"
          @click="open = false"
        >
          Batal
        </Button>
        <Button
          type="button"
          :disabled="latex.trim() === ''"
          @click="confirm"
        >
          {{ editing ? 'Simpan' : 'Sisipkan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
