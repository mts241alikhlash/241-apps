<script setup lang="ts">
import { ref, watch } from 'vue'
import { FileDropzone } from '@mts241alikhlash/ui'
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
import {
  REPORT_FILE_ACCEPT,
  reportFileProblem,
} from '../composables/reportFile'

const props = defineProps<{
  open: boolean
  title: string
  description: string
  confirmLabel: string
  busy?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  confirm: [file: File]
}>()

const file = ref<File | null>(null)
const problem = ref<string | null>(null)

watch(
  () => props.open,
  () => {
    file.value = null
    problem.value = null
  },
)

function pick(event: Event) {
  const chosen = (event.target as HTMLInputElement).files?.[0] ?? null
  file.value = null
  problem.value = chosen === null ? null : reportFileProblem(chosen)
  if (chosen !== null && problem.value === null) file.value = chosen
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="(value) => !busy && emit('update:open', value)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-3">
        <FileDropzone
          :accept="REPORT_FILE_ACCEPT"
          :file-name="file?.name"
          clearable
          :invalid="problem !== null"
          :disabled="busy"
          aria-label="Pilih berkas berita acara"
          hint="PDF, JPG, atau PNG, maks. 10 MB"
          @change="pick"
          @clear="file = null"
        />
        <p
          v-if="problem ?? error"
          class="text-control text-destructive"
          role="alert"
        >
          {{ problem ?? error }}
        </p>
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
          :disabled="busy || file === null"
          @click="file && emit('confirm', file)"
        >
          {{ busy ? 'Mengunggah...' : confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
