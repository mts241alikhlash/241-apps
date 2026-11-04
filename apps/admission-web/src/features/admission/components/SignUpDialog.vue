<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { Eye, EyeOff, Loader2 } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { FloatingField, FormControl } from '@mts241alikhlash/ui/form'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { authApi, authService } from '@/features/platform/auth'
import { publicAdmissionService } from '../services/publicAdmissionService'
import AdmissionPlacementFields from './AdmissionPlacementFields.vue'
import type { AdmissionGrade } from '../types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<(e: 'update:modelValue', value: boolean) => void>()

const router = useRouter()

const isSubmitting = ref(false)
const showPassword = ref(false)
const showPasswordConfirm = ref(false)
const dialogError = ref<string | null>(null)
const grades = ref<AdmissionGrade[]>([])
const gradesError = ref(false)

async function loadGrades() {
  gradesError.value = false
  const result = await publicAdmissionService.fetchGrades()
  if (result === null) {
    gradesError.value = true
    return
  }
  grades.value = result
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) void loadGrades()
  },
  { immediate: true },
)

const formSchema = toTypedSchema(
  z
    .object({
      fullName: z
        .string()
        .min(1, 'Nama lengkap wajib diisi')
        .min(3, 'Nama lengkap minimal 3 karakter')
        .max(100, 'Nama lengkap maksimal 100 karakter'),
      email: z
        .string()
        .min(1, 'Email wajib diisi')
        .email('Format email tidak valid'),
      password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
      passwordConfirm: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
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

interface SignUpFormValues {
  fullName: string
  email: string
  password: string
  passwordConfirm: string
  admissionType: string
  targetGradeId: string
}

const { handleSubmit, setFieldError } = useForm<SignUpFormValues>({
  validationSchema: formSchema,
  initialValues: {
    fullName: '',
    email: '',
    password: '',
    passwordConfirm: '',
    admissionType: '',
    targetGradeId: '',
  },
})

const onSubmit = handleSubmit(async (formValues) => {
  if (gradesError.value) return
  dialogError.value = null
  isSubmitting.value = true
  try {
    const email = formValues.email.trim()
    const result = await publicAdmissionService.register({
      fullName: formValues.fullName.trim(),
      email,
      password: formValues.password,
      passwordConfirm: formValues.passwordConfirm,
      admissionType: formValues.admissionType as 'NEW' | 'TRANSFER',
      targetGradeId: formValues.targetGradeId,
    })

    if (!result.success) {
      if (result.status === 409) {
        setFieldError('email', 'Email ini sudah terdaftar. Silakan masuk.')
        return
      }
      if (result.status === 400) {
        dialogError.value = 'Pendaftaran sedang tidak dibuka.'
        return
      }
      if (!result.outage) {
        dialogError.value = result.error
      }
      return
    }

    try {
      await authService.loginUser({
        identifier: email,
        password: formValues.password,
      })
    } catch (error) {
      const loginError =
        error instanceof Error && error.message
          ? error.message
          : 'Gagal masuk otomatis.'
      dialogError.value = `${loginError} Akun sudah dibuat, silakan masuk.`
      return
    }

    emit('update:modelValue', false)
    await router.push({ name: 'applicant-form' })
  } finally {
    isSubmitting.value = false
  }
})

function startGoogleSignUp() {
  window.location.href = authApi.googleStartUrl(
    window.location.origin,
    'signup',
  )
}

function handleOpenChange(open: boolean) {
  if (!open && isSubmitting.value) return
  emit('update:modelValue', open)
}
</script>

<template>
  <Dialog
    :open="props.modelValue"
    @update:open="handleOpenChange"
  >
    <DialogScrollContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Daftar Akun Pendaftaran</DialogTitle>
        <DialogDescription>
          Buat akun untuk memulai pendaftaran santri baru.
        </DialogDescription>
      </DialogHeader>

      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <FloatingField
          v-slot="{ componentField }"
          name="fullName"
          label="Nama Lengkap Calon Santri"
          required
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

        <AdmissionPlacementFields
          v-if="!gradesError"
          :grades="grades"
          :disabled="isSubmitting"
        />
        <div
          v-else
          role="alert"
          class="space-y-2 rounded-md border p-3 text-sm"
        >
          <p>Daftar tingkat kelas belum bisa dimuat.</p>
          <Button
            type="button"
            variant="outline"
            @click="loadGrades"
          >
            Coba lagi
          </Button>
        </div>

        <FloatingField
          v-slot="{ componentField }"
          name="password"
          label="Kata Sandi"
          required
        >
          <div class="relative">
            <FormControl>
              <Input
                v-bind="componentField"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                class="pr-12"
                :disabled="isSubmitting"
              />
            </FormControl>
            <button
              type="button"
              class="absolute right-1 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              :aria-label="
                showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
              "
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <component
                :is="showPassword ? EyeOff : Eye"
                class="size-4"
              />
            </button>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="passwordConfirm"
          label="Konfirmasi Kata Sandi"
          required
        >
          <div class="relative">
            <FormControl>
              <Input
                v-bind="componentField"
                :type="showPasswordConfirm ? 'text' : 'password'"
                autocomplete="new-password"
                class="pr-12"
                :disabled="isSubmitting"
              />
            </FormControl>
            <button
              type="button"
              class="absolute right-1 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              :aria-label="
                showPasswordConfirm
                  ? 'Sembunyikan konfirmasi kata sandi'
                  : 'Tampilkan konfirmasi kata sandi'
              "
              :aria-pressed="showPasswordConfirm"
              @click="showPasswordConfirm = !showPasswordConfirm"
            >
              <component
                :is="showPasswordConfirm ? EyeOff : Eye"
                class="size-4"
              />
            </button>
          </div>
        </FloatingField>

        <p
          v-if="dialogError"
          role="alert"
          class="text-sm text-destructive"
        >
          {{ dialogError }}
        </p>

        <Button
          type="submit"
          class="w-full cursor-pointer"
          :disabled="isSubmitting"
        >
          <Loader2
            v-if="isSubmitting"
            class="size-4 animate-spin"
          />
          {{ isSubmitting ? 'Memproses...' : 'Daftar' }}
        </Button>

        <div class="flex items-center gap-3">
          <span class="h-px flex-1 bg-border" />
          <span class="text-xs text-muted-foreground">atau</span>
          <span class="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          class="w-full cursor-pointer"
          :disabled="isSubmitting"
          @click="startGoogleSignUp"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
            />
          </svg>
          Daftar dengan Google
        </Button>

        <p class="text-center text-sm text-muted-foreground">
          Sudah punya akun?
          <RouterLink
            to="/login"
            class="font-medium text-primary hover:underline"
          >
            Masuk di sini
          </RouterLink>
        </p>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>
