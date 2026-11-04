<script setup lang="ts">
import { computed, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'

import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useEmployee } from '../composables/useEmployee'
import { useEmploymentTypeOptions } from '../composables/useEmploymentTypeOptions'
import type { EmployeeUpdatePayload } from '../types'

const props = defineProps<{
  open: boolean
  employeeId: string
  initialData?: {
    nip?: string | null
    nuptk?: string | null
    employmentTypeId?: string
    employmentType?: { id: string; code: string; name: string }
  } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  reload: []
}>()

const { isSaving, saveEmployee } = useEmployee()

const open = computed({
  get: () => props.open,
  set: (value: boolean) => {
    emit('update:open', value)
  },
})

const { employmentTypes } = useEmploymentTypeOptions()

const formSchema = toTypedSchema(
  z.object({
    nip: z
      .string()
      .max(50, 'Maksimal 50 karakter')
      .optional()
      .or(z.literal('')),
    nuptk: z
      .string()
      .max(50, 'Maksimal 50 karakter')
      .optional()
      .or(z.literal('')),
    employmentTypeId: z.string().optional(),
  }),
)

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    nip: '',
    nuptk: '',
    employmentTypeId: undefined as string | undefined,
  },
})

watch(
  () => [props.open, props.initialData],
  () => {
    if (props.open && props.initialData) {
      const data = props.initialData
      form.resetForm({
        values: {
          nip: data.nip! || '',
          nuptk: data.nuptk! || '',
          employmentTypeId:
            data.employmentTypeId ?? data.employmentType?.id ?? undefined,
        },
      })
    }
  },
  { immediate: true },
)

const onSubmit = form.handleSubmit(async (values) => {
  const payload: EmployeeUpdatePayload = {
    nip: values.nip === '' ? undefined : values.nip,
    nuptk: values.nuptk === '' ? undefined : values.nuptk,
    employmentTypeId: values.employmentTypeId,
  }

  const { success } = await saveEmployee(props.employeeId, payload)
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
        <DialogHeader class="px-6 py-6 border-b shrink-0">
          <DialogTitle class="text-xl">
            Ubah Identitas Kepegawaian
          </DialogTitle>
          <DialogDescription class="sr-only"> </DialogDescription>
        </DialogHeader>

        <ScrollArea class="flex-1 min-h-0">
          <div class="p-6">
            <div class="grid gap-5 md:grid-cols-2">
              <FloatingField
                v-slot="{ componentField }"
                name="nip"
                label="NIP"
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
                name="nuptk"
                label="NUPTK"
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
                name="employmentTypeId"
                label="Status Kepegawaian"
                required
              >
                <div class="md:col-span-2 content-start">
                  <Select v-bind="componentField">
                    <FormControl>
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Pilih Status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem
                        v-for="et in employmentTypes"
                        :key="et.id"
                        :value="et.id"
                      >
                        {{ et.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FloatingField>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter
          class="px-6 py-4 border-t shrink-0 flex gap-2 sm:justify-end w-full bg-background relative mt-auto"
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
