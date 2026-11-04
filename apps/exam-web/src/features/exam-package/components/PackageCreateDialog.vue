<script setup lang="ts">
import { onMounted, useId } from 'vue'
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
import { examBankService } from '@/features/exam-bank/services/examBankService'
import { usePackageCreate } from '../composables/usePackageCreate'

defineProps<{ open: boolean }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [id: string]
}>()

const form = usePackageCreate()
const fieldId = useId()

onMounted(() => examBankService.loadReferences())

async function save() {
  const id = await form.submit()
  if (id !== null) {
    emit('created', id)
    emit('update:open', false)
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Tambah Paket</DialogTitle>
        <DialogDescription class="sr-only">
          Beri judul paket, pilih mapel dan tingkat, lalu susun soalnya.
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
          label="Judul"
          :for="`${fieldId}-title`"
          floating
        >
          <Input
            :id="`${fieldId}-title`"
            v-model="form.title.value"
            maxlength="200"
          />
        </FloatingLabelField>
        <FloatingLabelField
          label="Mapel"
          :for="`${fieldId}-subject`"
          floating
        >
          <Select v-model="form.subjectId.value">
            <SelectTrigger
              :id="`${fieldId}-subject`"
              class="w-full"
            >
              <SelectValue placeholder="Pilih mapel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in form.subjectOptions.value"
                :key="option.id"
                :value="option.id"
              >
                {{ option.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>
        <FloatingLabelField
          label="Tingkat"
          :for="`${fieldId}-grade`"
          floating
        >
          <Select v-model="form.gradeId.value">
            <SelectTrigger
              :id="`${fieldId}-grade`"
              class="w-full"
            >
              <SelectValue placeholder="Pilih tingkat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in form.gradeOptions.value"
                :key="option.id"
                :value="option.id"
              >
                {{ option.name }}
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
          {{ form.saving.value ? 'Menyimpan…' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
