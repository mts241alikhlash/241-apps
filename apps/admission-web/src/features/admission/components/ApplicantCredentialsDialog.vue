<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Check, Copy } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import type { ApplicantCredentials } from '../composables/useAdminRegistration'

const props = defineProps<{
  open: boolean
  credentials: ApplicantCredentials | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  fill: []
}>()

const copied = ref(false)
const registrationId = useId()
const emailId = useId()
const passwordId = useId()

watch(
  () => props.open,
  (open) => {
    if (open) copied.value = false
  },
)

async function copyCredentials() {
  if (!props.credentials) return
  const text = `No. Pendaftaran: ${props.credentials.registrationNumber}\nEmail: ${props.credentials.email}\nKata Sandi: ${props.credentials.password}`
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    toast.success('Kredensial disalin.')
  } catch {
    toast.error('Tidak dapat menyalin. Salin secara manual.')
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Akun Pendaftar Dibuat</DialogTitle>
        <DialogDescription class="sr-only">
          Kredensial akun pendaftar yang baru dibuat.
        </DialogDescription>
      </DialogHeader>

      <div
        v-if="credentials"
        class="min-h-0 space-y-4 overflow-y-auto dialog-body"
      >
        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Serahkan kredensial berikut kepada pendaftar. Kata sandi hanya
          ditampilkan sekali.
        </p>
        <div class="space-y-2">
          <FloatingLabelField
            label="Nomor Pendaftaran"
            :for="registrationId"
            floating
          >
            <Input
              :id="registrationId"
              :model-value="credentials.registrationNumber"
              readonly
              class="tabular-nums"
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Email"
            :for="emailId"
            floating
          >
            <Input
              :id="emailId"
              :model-value="credentials.email"
              readonly
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Kata Sandi"
            :for="passwordId"
            floating
          >
            <Input
              :id="passwordId"
              :model-value="credentials.password"
              readonly
            />
          </FloatingLabelField>
        </div>
        <Button
          type="button"
          variant="outline"
          class="w-full"
          @click="copyCredentials"
        >
          <component
            :is="copied ? Check : Copy"
            class="size-4 mr-1.5"
          />
          {{ copied ? 'Tersalin' : 'Salin semua kredensial' }}
        </Button>
      </div>

      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          @click="emit('update:open', false)"
        >
          Nanti Saja
        </Button>
        <Button
          type="button"
          @click="emit('fill')"
        >
          Isi Formulir
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
