<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { Button } from '@mts241alikhlash/ui/button'
import { DatePicker, FileDropzone } from '@mts241alikhlash/ui'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { useFormOptions } from '../composables/useFormOptions'
import { paymentQueueService } from '../services/paymentQueueService'
import type { AdmissionEligibleApplication } from '../types'
import { formatIDR, jakartaToday } from '../utils'

const props = defineProps<{
  open: boolean
  initialApplicationId: string | null
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_FILE_BYTES = 5 * 1024 * 1024
const today = ref(jakartaToday())

const { options, load: loadOptions } = useFormOptions()
const accounts = computed(() => options.value?.bankAccounts ?? [])

const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const applicants = ref<AdmissionEligibleApplication[]>([])
const applicationId = ref('')
const bankAccountId = ref('')
const bankName = ref('')
const senderAccountName = ref('')
const transferDate = ref('')
const file = ref<File | null>(null)
const errors = ref<Record<string, string>>({})
const saving = ref(false)

const selected = computed(() =>
  applicants.value.find((a) => a.applicationId === applicationId.value),
)

async function loadApplicants() {
  applicants.value = await paymentQueueService.fetchEligible(
    debouncedSearch.value.trim(),
  )
}

function reset() {
  search.value = ''
  applicationId.value = props.initialApplicationId ?? ''
  bankAccountId.value = ''
  bankName.value = ''
  senderAccountName.value = ''
  transferDate.value = ''
  file.value = null
  errors.value = {}
}

function pickFile(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = input.files?.[0] ?? null
  const problem =
    picked && !ACCEPTED_TYPES.includes(picked.type)
      ? 'Format berkas harus JPG, PNG, atau PDF.'
      : picked && picked.size > MAX_FILE_BYTES
        ? 'Ukuran berkas maksimal 5 MB.'
        : ''
  if (problem) {
    errors.value = { ...errors.value, file: problem }
    file.value = null
    input.value = ''
    return
  }
  const { file: _cleared, ...rest } = errors.value
  errors.value = rest
  file.value = picked
  input.value = ''
}

function validate() {
  const next: Record<string, string> = {}
  if (!applicationId.value) next.applicationId = 'Pilih pendaftar'
  if (!bankAccountId.value)
    next.bankAccountId = 'Pilih rekening tujuan transfer'
  if (!bankName.value.trim()) next.bankName = 'Nama bank wajib diisi'
  if (!senderAccountName.value.trim())
    next.senderAccountName = 'Nama pengirim wajib diisi'
  if (!transferDate.value) next.transferDate = 'Tanggal transfer wajib diisi'
  else if (transferDate.value > today.value) {
    next.transferDate = 'Tanggal transfer tidak boleh melewati hari ini'
  }
  if (!file.value)
    next.file = errors.value.file ?? 'Pilih berkas bukti transfer'
  errors.value = next
  return Object.keys(next).length === 0
}

async function save() {
  if (!validate() || !file.value) return
  saving.value = true
  const result = await paymentQueueService.add(
    {
      applicationId: applicationId.value,
      bankAccountId: bankAccountId.value,
      bankName: bankName.value.trim(),
      senderAccountName: senderAccountName.value.trim(),
      transferDate: transferDate.value,
    },
    file.value,
  )
  saving.value = false
  if (result.success) emit('saved')
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    reset()
    today.value = jakartaToday()
    await Promise.all([loadOptions(), loadApplicants()])
    if (
      applicationId.value &&
      !applicants.value.some((a) => a.applicationId === applicationId.value)
    ) {
      applicationId.value = ''
    }
  },
  { immediate: true },
)

watch(debouncedSearch, loadApplicants)
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>Pembayaran oleh Staf</DialogTitle>
        <DialogDescription>
          Catat pembayaran pendaftar yang dibantu oleh staf. Pembayaran akan
          langsung terverifikasi setelah disimpan.
        </DialogDescription>
      </DialogHeader>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <form
          id="add-payment-form"
          class="space-y-4 dialog-body"
          @submit.prevent="save"
        >
          <fieldset class="space-y-2">
            <legend
              class="text-[length:var(--text-control,0.75rem)] font-medium"
            >
              Pendaftar <span class="text-destructive">*</span>
            </legend>
            <Input
              v-model="search"
              type="search"
              aria-label="Cari pendaftar"
              placeholder="Cari nama atau no. pendaftaran"
            />
            <ul class="max-h-48 space-y-1 overflow-y-auto">
              <li
                v-for="applicant in applicants"
                :key="applicant.applicationId"
              >
                <label
                  class="flex cursor-pointer items-center gap-3 rounded-md border p-2 text-[length:var(--text-control,0.75rem)]"
                >
                  <input
                    v-model="applicationId"
                    type="radio"
                    name="applicationId"
                    :value="applicant.applicationId"
                  />
                  <span class="min-w-0">
                    <span class="block font-medium">{{
                      applicant.applicantName
                    }}</span>
                    <span class="block text-muted-foreground">
                      {{ applicant.registrationNumber }} ·
                      {{ applicant.waveName }}
                    </span>
                  </span>
                </label>
              </li>
            </ul>
            <p
              v-if="errors.applicationId"
              class="text-[length:var(--text-control,0.75rem)] text-destructive"
            >
              {{ errors.applicationId }}
            </p>
          </fieldset>

          <p
            v-if="selected"
            class="text-[length:var(--text-control,0.75rem)]"
          >
            Jumlah: <strong>{{ formatIDR(selected.amount) }}</strong>
          </p>

          <fieldset class="space-y-2">
            <legend
              class="text-[length:var(--text-control,0.75rem)] font-medium"
            >
              Rekening Tujuan <span class="text-destructive">*</span>
            </legend>
            <label
              v-for="account in accounts"
              :key="account.id"
              class="flex cursor-pointer items-start gap-3 rounded-md border p-2 text-[length:var(--text-control,0.75rem)]"
            >
              <input
                v-model="bankAccountId"
                type="radio"
                name="bankAccountId"
                :value="account.id"
                class="mt-1"
              />
              <span>
                <span class="block font-medium">{{ account.bankName }}</span>
                <span class="block tabular-nums">{{
                  account.accountNumber
                }}</span>
                <span class="block text-muted-foreground">
                  a.n. {{ account.accountHolder }}
                </span>
              </span>
            </label>
            <p
              v-if="errors.bankAccountId"
              class="text-[length:var(--text-control,0.75rem)] text-destructive"
            >
              {{ errors.bankAccountId }}
            </p>
          </fieldset>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-1 text-[length:var(--text-control,0.75rem)]">
              <span class="font-medium">
                Bank Pengirim <span class="text-destructive">*</span>
              </span>
              <Input
                v-model="bankName"
                name="bankName"
                maxlength="100"
              />
              <span
                v-if="errors.bankName"
                class="block text-destructive"
                >{{ errors.bankName }}</span
              >
            </label>
            <label class="space-y-1 text-[length:var(--text-control,0.75rem)]">
              <span class="font-medium">
                Nama Pemilik Rekening Pengirim
                <span class="text-destructive">*</span>
              </span>
              <Input
                v-model="senderAccountName"
                name="senderAccountName"
                maxlength="100"
              />
              <span
                v-if="errors.senderAccountName"
                class="block text-destructive"
                >{{ errors.senderAccountName }}</span
              >
            </label>
            <label class="space-y-1 text-[length:var(--text-control,0.75rem)]">
              <span class="font-medium">
                Tanggal Transfer <span class="text-destructive">*</span>
              </span>
              <DatePicker
                v-model="transferDate"
                :max-date="today"
              />
              <span
                v-if="errors.transferDate"
                class="block text-destructive"
                >{{ errors.transferDate }}</span
              >
            </label>
          </div>

          <div class="space-y-2">
            <p class="text-[length:var(--text-control,0.75rem)] font-medium">
              Bukti Transfer <span class="text-destructive">*</span>
            </p>
            <FileDropzone
              :file-name="file?.name"
              :invalid="!!errors.file"
              aria-label="Pilih bukti transfer"
              hint="JPG, PNG, atau PDF, maks. 5 MB"
              @change="pickFile"
            />
            <p
              v-if="errors.file"
              class="text-[length:var(--text-control,0.75rem)] text-destructive"
            >
              {{ errors.file }}
            </p>
          </div>
        </form>
      </div>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="saving"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="add-payment-form"
          :disabled="saving"
        >
          {{ saving ? 'Menyimpan…' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
