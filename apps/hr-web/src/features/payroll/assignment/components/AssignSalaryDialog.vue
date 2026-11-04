<script setup lang="ts">
import { DatePicker } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  FormControl,
  FormDescription,
  FloatingField,
} from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import * as z from 'zod'
import { components, DRIVER_LABEL } from '../../component'
import {
  isSaving,
  salaryAssignmentService,
} from '../services/salaryAssignmentService'

const props = defineProps<{ open: boolean; userId: string | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; success: [] }>()

const formSchema = toTypedSchema(
  z.object({
    componentId: z.string().uuid('Pilih komponen gaji.'),
    value: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Isi angka tanpa titik ribuan.'),
    effectiveFrom: z.string().min(10, 'Pilih tanggal berlaku.'),
  }),
)

const { handleSubmit, resetForm, values } = useForm({
  validationSchema: formSchema,
  initialValues: {
    componentId: '',
    value: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  },
})

const activeComponents = computed(() =>
  components.value.filter((component) => component.isActive),
)

const selected = computed(() =>
  activeComponents.value.find(
    (component) => component.id === values.componentId,
  ),
)

const isDriven = computed(() => Boolean(selected.value?.driver))

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm()
  },
)

const onSubmit = handleSubmit(async (form) => {
  if (!props.userId) return

  const ok = await salaryAssignmentService.save({
    userId: props.userId,
    componentId: form.componentId,
    amount: isDriven.value ? null : form.value,
    rate: isDriven.value ? form.value : null,
    effectiveFrom: form.effectiveFrom,
  })

  if (ok) {
    emit('success')
    emit('update:open', false)
  }
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>Tetapkan Gaji Pegawai</DialogTitle>
        <DialogDescription class="sr-only" />
      </DialogHeader>

      <form
        class="flex flex-col flex-1 min-h-0"
        @submit="onSubmit"
      >
        <div class="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <FloatingField
            v-slot="{ componentField }"
            name="componentId"
            label="Komponen Gaji"
            required
          >
            <div>
              <Select v-bind="componentField">
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih komponen gaji" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="component in activeComponents"
                    :key="component.id"
                    :value="component.id"
                  >
                    {{ component.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="value"
            :label="isDriven ? 'Tarif per Satuan (Rp)' : 'Nominal (Rp)'"
            required
          >
            <div>
              <FormControl>
                <Input
                  v-bind="componentField"
                  inputmode="numeric"
                />
              </FormControl>
              <FormDescription v-if="isDriven && selected?.driver">
                Dikalikan {{ DRIVER_LABEL[selected.driver].toLowerCase() }} pada
                bulan yang dihitung.
              </FormDescription>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="effectiveFrom"
            label="Berlaku Mulai"
            required
            always-float
          >
            <div>
              <FormControl>
                <DatePicker
                  :model-value="value"
                  placeholder="Pilih tanggal berlaku"
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>
        </div>

        <DialogFooter
          class="px-6 py-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0"
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
            :disabled="isSaving || !userId"
          >
            Simpan
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
