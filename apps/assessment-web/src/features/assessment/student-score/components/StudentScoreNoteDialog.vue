<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { watch } from 'vue'
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
import { Textarea } from '@mts241alikhlash/ui/textarea'
import type { StudentNoteTarget } from '../types'

const props = defineProps<{
  open: boolean
  student: StudentNoteTarget | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  apply: [enrollmentId: string, note: string]
}>()

const formSchema = toTypedSchema(
  z.object({
    note: z.string().max(500, 'Catatan maksimal 500 karakter.'),
  }),
)

const { handleSubmit, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    note: '',
  },
})

watch(
  () => [props.open, props.student] as const,
  ([isOpen, target]) => {
    if (isOpen) {
      resetForm({
        values: {
          note: target?.note ?? '',
        },
      })
    }
  },
  { immediate: true },
)

const onSubmit = handleSubmit((values) => {
  if (!props.student) return
  emit('apply', props.student.enrollmentId, values.note)
  emit('update:open', false)
})
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
          {{ student ? `Catatan ${student.studentName}` : 'Catatan' }}
        </DialogTitle>
        <DialogDescription>
          Tambah atau ubah catatan untuk siswa ini.
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <form
          id="student-score-note-form"
          class="space-y-1.5"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-slot="{ componentField, value }"
            name="note"
            label="Catatan"
          >
            <div class="content-start space-y-1.5">
              <FormControl>
                <Textarea
                  v-bind="componentField"
                  rows="4"
                  maxlength="500"
                />
              </FormControl>
              <p class="text-right text-control text-muted-foreground">
                {{ (value ?? '').length }}/500
              </p>
            </div>
          </FloatingField>
        </form>
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
          type="submit"
          form="student-score-note-form"
        >
          Terapkan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
