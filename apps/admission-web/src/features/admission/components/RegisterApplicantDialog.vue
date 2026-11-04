<script setup lang="ts">
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { FormControl } from '@mts241alikhlash/ui/form'
import FloatingField from './AdmissionField.vue'
import { Loader2 } from '@lucide/vue'
import AdmissionPlacementFields from './AdmissionPlacementFields.vue'
import type { ActiveWave, AdmissionGrade } from '../types'
import { vDigits } from '../vDigits'

const props = defineProps<{
  open: boolean
  waves: ActiveWave[]
  grades: AdmissionGrade[]
  isSubmitting: boolean
  errorMessage: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (
    e: 'submit',
    payload: {
      fullName: string
      email: string
      phone?: string
      password: string
      passwordConfirm: string
      waveId: string
      admissionType: 'NEW' | 'TRANSFER'
      targetGradeId: string
    },
  ): void
}>()

const formSchema = toTypedSchema(
  z
    .object({
      fullName: z
        .string()
        .min(1, 'Nama lengkap wajib diisi')
        .min(3, 'Nama lengkap minimal 3 karakter'),
      email: z
        .string()
        .min(1, 'Email wajib diisi')
        .email('Format email tidak valid'),
      phone: z
        .string()
        .max(15, 'Nomor HP maksimal 15 karakter')
        .optional()
        .default(''),
      password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
      passwordConfirm: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
      waveId: z.string().min(1, 'Gelombang wajib dipilih'),
      admissionType: z.enum(['NEW', 'TRANSFER'], {
        message: 'Jenis pendaftaran wajib dipilih',
      }),
      targetGradeId: z.string().min(1, 'Tingkat kelas wajib dipilih'),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: 'Konfirmasi kata sandi tidak cocok.',
      path: ['passwordConfirm'],
    }),
)

interface AccountFormValues {
  fullName: string
  email: string
  phone: string
  password: string
  passwordConfirm: string
  waveId: string
  admissionType: string
  targetGradeId: string
}

const { handleSubmit, resetForm } = useForm<AccountFormValues>({
  validationSchema: formSchema,
  initialValues: {
    fullName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    waveId: '',
    admissionType: '',
    targetGradeId: '',
  },
})

const onSubmit = handleSubmit((formValues) => {
  emit('submit', {
    fullName: formValues.fullName.trim(),
    email: formValues.email.trim(),
    phone: formValues.phone?.trim() || undefined,
    password: formValues.password,
    passwordConfirm: formValues.passwordConfirm,
    waveId: formValues.waveId,
    admissionType: formValues.admissionType as 'NEW' | 'TRANSFER',
    targetGradeId: formValues.targetGradeId,
  })
})

function handleOpenChange(open: boolean) {
  if (!open && !props.isSubmitting) {
    resetForm()
  }
  emit('update:open', open)
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="handleOpenChange"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>Tambah Pendaftar</DialogTitle>
        <DialogDescription class="sr-only">
          Buat akun untuk calon santri. Setelah akun dibuat, Anda akan
          melanjutkan ke pengisian formulir.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <form
          id="register-applicant-form"
          class="grid grid-cols-1 items-start gap-x-4 gap-y-2 dialog-body sm:grid-cols-2"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-slot="{ componentField }"
            name="fullName"
            label="Nama Lengkap Calon Santri"
            required
            class="sm:col-span-2"
          >
            <FormControl>
              <Input
                v-bind="componentField"
                :disabled="isSubmitting"
              />
            </FormControl>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="email"
            label="Email"
            required
          >
            <FormControl>
              <Input
                v-bind="componentField"
                type="email"
                :disabled="isSubmitting"
              />
            </FormControl>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="phone"
            label="No. HP"
          >
            <FormControl>
              <Input
                v-digits.phone
                v-bind="componentField"
                inputmode="tel"
                maxlength="20"
                :disabled="isSubmitting"
              />
            </FormControl>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="password"
            label="Kata Sandi"
            required
          >
            <FormControl>
              <Input
                v-bind="componentField"
                type="password"
                autocomplete="new-password"
                :disabled="isSubmitting"
              />
            </FormControl>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="passwordConfirm"
            label="Konfirmasi Kata Sandi"
            required
          >
            <FormControl>
              <Input
                v-bind="componentField"
                type="password"
                autocomplete="new-password"
                :disabled="isSubmitting"
              />
            </FormControl>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="waveId"
            label="Gelombang Pendaftaran"
            required
            class="sm:col-span-2"
          >
            <Select
              :model-value="value"
              :disabled="isSubmitting || waves.length === 0"
              @update:model-value="handleChange"
            >
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem
                  v-for="wave in waves"
                  :key="wave.id"
                  :value="wave.id"
                  :disabled="wave.remainingQuota <= 0"
                >
                  {{
                    wave.remainingQuota <= 0
                      ? `${wave.name} (penuh)`
                      : wave.name
                  }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingField>

          <AdmissionPlacementFields
            :grades="grades"
            :disabled="isSubmitting"
          />

          <div
            v-if="waves.length === 0"
            class="rounded-md border p-3 text-[length:var(--text-control,0.75rem)] text-muted-foreground sm:col-span-2"
          >
            Tidak ada gelombang yang dibuka saat ini.
          </div>

          <p
            v-if="errorMessage"
            class="text-[length:var(--text-control,0.75rem)] text-destructive sm:col-span-2"
          >
            {{ errorMessage }}
          </p>
        </form>
      </div>

      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="isSubmitting"
          @click="handleOpenChange(false)"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="register-applicant-form"
          variant="default"
          :disabled="isSubmitting || waves.length === 0"
        >
          <Loader2
            v-if="isSubmitting"
            class="size-4 mr-1.5 animate-spin"
          />
          {{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
