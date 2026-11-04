<script setup lang="ts">
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { BackButton } from '@mts241alikhlash/ui'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'
import { Loader2 } from '@lucide/vue'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { userRoleApi } from '../api/userRoleApi'
import type { UpdateUserAccountPayload } from '../types'

const route = useRoute()
const router = useRouter()
const userId = route.params.id as string

const isLoading = ref(true)
const isSaving = ref(false)
const currentIdentifier = ref('')

const formSchema = toTypedSchema(
  z
    .object({
      identifier: z
        .string()
        .min(3, 'Username minimal 3 karakter.')
        .max(50, 'Username maksimal 50 karakter.'),
      password: z
        .string()
        .max(100, 'Password maksimal 100 karakter.')
        .optional()
        .or(z.literal('')),
      confirmPassword: z.string().optional().or(z.literal('')),
    })
    .refine((v) => !v.password || v.password.length >= 6, {
      message: 'Password baru minimal 6 karakter.',
      path: ['password'],
    })
    .refine((v) => (v.password ?? '') === (v.confirmPassword ?? ''), {
      message: 'Konfirmasi password tidak cocok.',
      path: ['confirmPassword'],
    }),
)

const { handleSubmit, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    identifier: '',
    password: '',
    confirmPassword: '',
  },
})

function goBack() {
  void router.push({ name: 'UserRole' })
}

onMounted(async () => {
  try {
    const res = await userRoleApi.getUserById(userId)
    const user = res.data?.data
    if (user) {
      currentIdentifier.value = user.identifier
      resetForm({
        values: {
          identifier: user.identifier,
          password: '',
          confirmPassword: '',
        },
      })
    }
  } catch (err) {
    toast.error(getIndonesianErrorMessage(err, 'Gagal memuat data pengguna.'))
  } finally {
    isLoading.value = false
  }
})

const onSubmit = handleSubmit(async (values) => {
  const payload: UpdateUserAccountPayload = {}
  if (values.identifier && values.identifier !== currentIdentifier.value) {
    payload.identifier = values.identifier
  }
  if (values.password && values.password.length > 0) {
    payload.password = values.password
  }

  if (Object.keys(payload).length === 0) {
    toast.info('Tidak ada perubahan untuk disimpan.')
    return
  }

  isSaving.value = true
  try {
    await userRoleApi.updateUserAccount(userId, payload)
    toast.success('Akun pengguna berhasil diperbarui.')
    goBack()
  } catch (err) {
    toast.error(getIndonesianErrorMessage(err, 'Gagal memperbarui akun.'))
  } finally {
    isSaving.value = false
  }
})

useBreadcrumbs(() => {
  const name = currentIdentifier.value
  if (!name) return null
  const trail = route.meta.breadcrumbs ?? []
  return [...trail.slice(0, -1), { title: name }]
})
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke daftar pengguna"
            @click="goBack"
          />
          <div>
            <CardTitle size="lg"> Ubah Akun Pengguna </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent variant="standard">
        <div
          v-if="isLoading"
          class="flex items-center justify-center py-12"
        >
          <span class="text-muted-foreground">Memuat data pengguna...</span>
        </div>

        <form
          v-else
          class="space-y-6"
          @submit.prevent="onSubmit"
        >
          <div
            class="rounded-xl border bg-card p-5 space-y-4 text-sm flex flex-col"
          >
            <h3 class="text-sm font-semibold">Kredensial Akun</h3>

            <FloatingField
              v-slot="{ componentField }"
              name="identifier"
              label="Username"
              required
            >
              <div class="content-start">
                <FormControl>
                  <Input
                    v-bind="componentField"
                    :disabled="isSaving"
                  />
                </FormControl>
              </div>
            </FloatingField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FloatingField
                v-slot="{ componentField }"
                name="password"
                label="Password Baru"
              >
                <div class="content-start">
                  <FormControl>
                    <Input
                      type="password"
                      v-bind="componentField"
                      :disabled="isSaving"
                    />
                  </FormControl>
                </div>
              </FloatingField>

              <FloatingField
                v-slot="{ componentField }"
                name="confirmPassword"
                label="Konfirmasi Password Baru"
              >
                <div class="content-start">
                  <FormControl>
                    <Input
                      type="password"
                      v-bind="componentField"
                      :disabled="isSaving"
                    />
                  </FormControl>
                </div>
              </FloatingField>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              :disabled="isSaving"
              @click="goBack"
            >
              Batal
            </Button>
            <Button
              type="submit"
              :disabled="isSaving"
            >
              <Loader2
                v-if="isSaving"
                class="mr-2 h-4 w-4 animate-spin"
              />
              {{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
