<script setup lang="ts">
import { computed, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'

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
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import type { StudentUpdatePayload, StudentIdentityData } from '../types'

import { useStudent } from '../composables/useStudent'

const props = defineProps<{
  open: boolean
  studentId: string
  initialData?: StudentIdentityData | null
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; reload: [] }>()

const { isSaving, saveStudent } = useStudent()

const open = computed({
  get: () => props.open,
  set: (value: boolean) => {
    emit('update:open', value)
  },
})

const formSchema = toTypedSchema(
  z.object({
    nis: z
      .string()
      .max(50, 'Maksimal 50 karakter')
      .optional()
      .or(z.literal('')),
    nisn: z
      .string()
      .max(50, 'Maksimal 50 karakter')
      .optional()
      .or(z.literal('')),
  }),
)

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    nis: '',
    nisn: '',
  },
})

watch(
  () => [props.open, props.initialData] as const,
  ([isOpen]) => {
    if (isOpen && props.initialData) {
      form.resetForm({
        values: {
          nis: props.initialData.nis ?? '',
          nisn: props.initialData.nisn ?? '',
        },
      })
    }
  },
  { immediate: true },
)

const onSubmit = form.handleSubmit(async (values) => {
  const payload: StudentUpdatePayload = {
    nis: values.nis === '' ? undefined : values.nis,
    nisn: values.nisn === '' ? undefined : values.nisn,
  }

  const { success } = await saveStudent(props.studentId, payload)
  if (success) {
    emit('reload')
    open.value = false
  }
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="w-full sm:max-w-xl md:max-w-xl lg:max-w-xl flex flex-col gap-0 border-l p-0"
    >
      <form
        class="flex flex-col h-full"
        @submit.prevent="onSubmit"
      >
        <DialogHeader standard>
          <DialogTitle class="text-xl"> Ubah Identitas Kesiswaan </DialogTitle>
          <DialogDescription> </DialogDescription>
        </DialogHeader>

        <ScrollArea class="flex-1 min-h-0">
          <DialogBody>
            <div class="grid gap-4 md:grid-cols-2">
              <FloatingField
                v-slot="{ componentField }"
                name="nis"
                label="NIS"
              >
                <div class="content-start">
                  <FormControl>
                    <Input
                      maxlength="50"
                      v-bind="componentField"
                    />
                  </FormControl>
                </div>
              </FloatingField>

              <FloatingField
                v-slot="{ componentField }"
                name="nisn"
                label="NISN"
              >
                <div class="content-start">
                  <FormControl>
                    <Input
                      maxlength="50"
                      v-bind="componentField"
                    />
                  </FormControl>
                </div>
              </FloatingField>
            </div>
          </DialogBody>
        </ScrollArea>

        <DialogFooter
          standard
          class="sm:justify-end relative mt-auto"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="isSaving"
            @click="open = false"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="default"
            :disabled="isSaving"
          >
            {{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
