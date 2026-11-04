<script setup lang="ts">
import { ref } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { changePasswordSchema } from '../schemas/change-password.schema'
import { authApi } from '@/features/platform/auth'
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { FloatingField, FormControl } from '@mts241alikhlash/ui/form'
import { Loader2 } from '@lucide/vue'

const isSubmitting = ref(false)

const formSchema = toTypedSchema(changePasswordSchema)

const { handleSubmit, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  },
})

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await authApi.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    })
    toast.success(
      'Password berhasil diubah. Sesi di perangkat lain telah dicabut.',
    )
    resetForm()
  } catch (error) {
    toast.error(getIndonesianErrorMessage(error, 'Gagal mengubah password.'))
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="py-4">
    <form
      class="space-y-2"
      @submit.prevent="onSubmit"
    >
      <FloatingField
        v-slot="{ componentField }"
        name="currentPassword"
        label="Password Saat Ini"
        required
      >
        <FormControl>
          <Input
            v-bind="componentField"
            type="password"
          />
        </FormControl>
      </FloatingField>

      <FloatingField
        v-slot="{ componentField }"
        name="newPassword"
        label="Password Baru"
        required
      >
        <FormControl>
          <Input
            v-bind="componentField"
            type="password"
          />
        </FormControl>
      </FloatingField>

      <FloatingField
        v-slot="{ componentField }"
        name="confirmPassword"
        label="Konfirmasi Password Baru"
        required
      >
        <FormControl>
          <Input
            v-bind="componentField"
            type="password"
          />
        </FormControl>
      </FloatingField>

      <div class="flex justify-end pt-4">
        <Button
          type="submit"
          :disabled="isSubmitting"
        >
          <Loader2
            v-if="isSubmitting"
            class="mr-2 h-4 w-4 animate-spin"
          />
          {{ isSubmitting ? 'Menyimpan...' : 'Ubah Password' }}
        </Button>
      </div>
    </form>
  </div>
</template>
