<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { watch } from 'vue'
import { FormattedNumberInput } from '@mts241alikhlash/ui'
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
import { Button } from '@mts241alikhlash/ui/button'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { Loader2 } from '@lucide/vue'
import { useRapor } from '../composables/useRapor'
import type { RaporData } from '../types'

const props = defineProps<{
  open: boolean
  rapor: RaporData | null
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { updateRapor, isSaving } = useRapor()

const formSchema = toTypedSchema(
  z.object({
    rank: z
      .number({ invalid_type_error: 'Peringkat harus berupa angka.' })
      .int('Peringkat harus bilangan bulat.')
      .min(1, 'Peringkat minimal 1.')
      .optional(),
    employeeNote: z
      .string()
      .max(500, 'Catatan maksimal 500 karakter.')
      .optional(),
  }),
)

const { handleSubmit, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    rank: undefined as number | undefined,
    employeeNote: '',
  },
})

watch(
  () => [props.open, props.rapor] as const,
  ([isOpen, rapor]) => {
    if (isOpen && rapor) {
      resetForm({
        values: {
          rank: rapor.rank ?? undefined,
          employeeNote: rapor.employeeNote ?? '',
        },
      })
    }
  },
  { immediate: true },
)

const onSubmit = handleSubmit(async (values) => {
  if (!props.rapor) return

  const res = await updateRapor(props.rapor.id, {
    employeeNote: values.employeeNote?.trim() || undefined,
    rank: values.rank,
  })

  if (res.success) {
    emit('update:open', false)
  }
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="
      (val) => {
        if (!isSaving) emit('update:open', val)
      }
    "
  >
    <DialogContent
      size="md"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>Edit Rapor</DialogTitle>
        <DialogDescription>
          Perbarui catatan wali kelas dan peringkat untuk
          {{ rapor?.enrollment?.student?.user?.profile?.name || 'Siswa' }}.
        </DialogDescription>
      </DialogHeader>

      <DialogBody class="space-y-4">
        <dl
          v-if="rapor"
          class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
        >
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Kelas</dt>
            <dd class="font-medium">
              {{ rapor.enrollment?.classroom?.displayName || '-' }}
            </dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Rata-rata</dt>
            <dd class="font-medium tabular-nums">
              {{
                rapor.totalAverage !== null
                  ? Number(rapor.totalAverage).toFixed(2)
                  : '-'
              }}
            </dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Peringkat</dt>
            <dd class="font-medium tabular-nums">{{ rapor.rank ?? '-' }}</dd>
          </div>
        </dl>

        <form
          id="rapor-form"
          class="space-y-3"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-slot="{ value, handleChange }"
            name="rank"
            label="Peringkat (Opsional)"
          >
            <div class="content-start">
              <FormControl>
                <FormattedNumberInput
                  :model-value="value ?? null"
                  numeric
                  :max-digits="4"
                  @update:model-value="
                    (v) =>
                      handleChange(
                        v === undefined ||
                          v === null ||
                          v === '' ||
                          Number(v) === 0
                          ? undefined
                          : Number(v),
                      )
                  "
                />
              </FormControl>
            </div>
          </FloatingField>
          <FloatingField
            v-slot="{ componentField }"
            name="employeeNote"
            label="Catatan Wali Kelas (Opsional)"
          >
            <div class="content-start">
              <FormControl>
                <Textarea
                  v-bind="componentField"
                  rows="4"
                  maxlength="500"
                />
              </FormControl>
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
          :disabled="isSaving"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="rapor-form"
          :disabled="isSaving"
        >
          <Loader2
            v-if="isSaving"
            class="size-4 animate-spin"
          />
          Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
