<script setup lang="ts">
import { computed, ref, useId } from 'vue'
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
import { examPackageService } from '../services/examPackageService'

const props = defineProps<{
  open: boolean
  packageId: string
  title: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  renamed: []
}>()

const title = ref(props.title)
const saving = ref(false)
const error = ref<string | null>(null)
const fieldId = useId()
const blank = computed(() => title.value.trim() === '')

async function save() {
  if (blank.value || saving.value) return
  saving.value = true
  error.value = null
  const result = await examPackageService.rename(
    props.packageId,
    title.value.trim(),
  )
  saving.value = false
  if (!result.success) {
    error.value = result.error
    return
  }
  emit('renamed')
  emit('update:open', false)
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Ganti Judul</DialogTitle>
        <DialogDescription class="sr-only">
          Ganti judul paket soal.
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
          label="Judul"
          :for="`${fieldId}-title`"
          floating
        >
          <Input
            :id="`${fieldId}-title`"
            v-model="title"
            maxlength="200"
          />
        </FloatingLabelField>
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
          :disabled="blank || saving"
          @click="save"
        >
          {{ saving ? 'Menyimpan…' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
