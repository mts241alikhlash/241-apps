<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { FormattedNumberInput } from '@mts241alikhlash/ui'
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
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { examEventService } from '../services/examEventService'
import type { ExamRoom, UserOption } from '../types'

const props = defineProps<{
  open: boolean
  eventId: string
  room?: ExamRoom | null
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>()

const NOBODY = '__none__'
const editing = computed(() => props.room !== null && props.room !== undefined)

const formSchema = toTypedSchema(
  z.object({
    name: z.string().trim().min(1, 'Nama ruangan wajib diisi'),
    code: z.string().trim().min(1, 'Kode ruangan wajib diisi'),
    building: z.string(),
    capacity: z
      .number({ invalid_type_error: 'Kapasitas minimal 1 kursi' })
      .int('Kapasitas minimal 1 kursi')
      .min(1, 'Kapasitas minimal 1 kursi'),
    technicianUserId: z.string(),
  }),
)

const { handleSubmit, isSubmitting, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    name: props.room?.name ?? '',
    code: props.room?.code ?? '',
    building: props.room?.building ?? '',
    capacity: props.room?.capacity ?? 30,
    technicianUserId: props.room?.technicianUserId ?? '',
  },
})

const saveError = ref<string | null>(null)
const technicians = ref<UserOption[]>([])

const onSubmit = handleSubmit(async (values) => {
  saveError.value = null
  const existing = props.room ?? null
  const result = await examEventService.saveRoom(
    existing
      ? { mode: 'edit', roomId: existing.id }
      : { mode: 'create', eventId: props.eventId },
    {
      code: values.code.trim(),
      name: values.name.trim(),
      building: values.building.trim() || null,
      capacity: values.capacity,
      technicianUserId:
        values.technicianUserId || (existing === null ? undefined : null),
    },
  )
  if (!result.success) {
    saveError.value = result.error
    return
  }
  toast.success(
    existing === null ? 'Ruangan ditambahkan.' : 'Perubahan ruangan disimpan.',
  )
  emit('saved')
  emit('update:open', false)
})

function close() {
  resetForm()
  saveError.value = null
  emit('update:open', false)
}

onMounted(async () => {
  technicians.value = await examEventService.loadStaff('EXAM_TECHNICIAN')
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent
      size="xl"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>{{
          editing ? 'Ubah Ruangan' : 'Tambah Ruangan'
        }}</DialogTitle>
        <DialogDescription>
          Atur kode, nama, gedung, kapasitas, dan teknisi ruangan.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <div
          v-if="saveError"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-control"
          role="alert"
        >
          {{ saveError }}
        </div>

        <form
          id="room-form"
          class="grid gap-4 sm:grid-cols-2"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-slot="{ componentField }"
            name="building"
            label="Gedung"
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="100"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="code"
            label="Kode ruangan"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="30"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="name"
            label="Nama ruangan"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="100"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="capacity"
            label="Kapasitas"
            required
          >
            <div class="content-start">
              <FormControl>
                <FormattedNumberInput
                  :model-value="value"
                  numeric
                  suffix=" kursi"
                  :max-digits="3"
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="technicianUserId"
            label="Teknisi ruangan"
          >
            <div class="content-start">
              <Select
                :model-value="value || undefined"
                @update:model-value="
                  (next) => handleChange(next === NOBODY ? '' : next)
                "
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem :value="NOBODY">Belum ditugaskan</SelectItem>
                  <SelectItem
                    v-for="person in technicians"
                    :key="person.id"
                    :value="person.id"
                  >
                    {{ person.identifier }}
                  </SelectItem>
                </SelectContent>
              </Select>
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
          @click="close"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="room-form"
          :disabled="isSubmitting"
        >
          Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
