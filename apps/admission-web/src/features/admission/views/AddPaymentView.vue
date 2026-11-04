<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import {
  AppCombobox,
  BackButton,
  DatePicker,
  FileDropzone,
} from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Input } from '@mts241alikhlash/ui/input'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useFormOptions } from '../composables/useFormOptions'
import { paymentQueueService } from '../services/paymentQueueService'
import type { AdmissionEligibleApplication } from '../types'
import { formatIDR, jakartaToday } from '../utils'

const router = useRouter()
const route = useRoute()
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_FILE_BYTES = 5 * 1024 * 1024

const today = ref(jakartaToday())
const { options, load: loadOptions } = useFormOptions()
const accounts = computed(() => options.value?.bankAccounts ?? [])
const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const applicants = ref<AdmissionEligibleApplication[]>([])
const applicationId = ref(
  typeof route.query.applicationId === 'string'
    ? route.query.applicationId
    : '',
)
const bankAccountId = ref('')
const bankName = ref('')
const senderAccountName = ref('')
const transferDate = ref('')
const file = ref<File | null>(null)
const errors = ref<Record<string, string>>({})
const saving = ref(false)

const applicantOptions = computed(() =>
  applicants.value.map((applicant) => ({
    value: applicant.applicationId,
    label: `${applicant.applicantName} · ${applicant.registrationNumber}`,
  })),
)

const selected = computed(() =>
  applicants.value.find(
    (applicant) => applicant.applicationId === applicationId.value,
  ),
)

async function loadApplicants() {
  applicants.value = await paymentQueueService.fetchEligible(
    debouncedSearch.value.trim(),
  )
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
  if (!senderAccountName.value.trim()) {
    next.senderAccountName = 'Nama pengirim wajib diisi'
  }
  if (!transferDate.value) {
    next.transferDate = 'Tanggal transfer wajib diisi'
  } else if (transferDate.value > today.value) {
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
  if (result.success) await router.push('/admin/payments')
}

onMounted(async () => {
  today.value = jakartaToday()
  await Promise.all([loadOptions(), loadApplicants()])
  if (
    applicationId.value &&
    !applicants.value.some(
      (applicant) => applicant.applicationId === applicationId.value,
    )
  ) {
    applicationId.value = ''
  }
})

watch(debouncedSearch, loadApplicants)
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke pembayaran"
            @click="router.push('/admin/payments')"
          />
          <CardTitle size="lg"> Pembayaran oleh Staf </CardTitle>
        </div>
      </CardHeader>

      <CardContent class="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
        <FloatingLabelField
          label="Pendaftar"
          :error="errors.applicationId"
          floating
        >
          <AppCombobox
            v-model="applicationId"
            :options="applicantOptions"
            placeholder="Pilih pendaftar"
            search-placeholder="Cari nama atau nomor pendaftaran"
            empty-text="Pendaftar tidak ditemukan."
            :class="
              errors.applicationId
                ? '!border-destructive !text-destructive focus-visible:!border-destructive'
                : ''
            "
          />
        </FloatingLabelField>

        <div class="space-y-2">
          <FloatingLabelField
            label="Rekening Tujuan"
            :error="errors.bankAccountId"
            floating
          >
            <Select v-model="bankAccountId">
              <SelectTrigger
                class="w-full"
                :aria-invalid="errors.bankAccountId ? 'true' : undefined"
              >
                <SelectValue placeholder="Pilih rekening tujuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="account in accounts"
                  :key="account.id"
                  :value="account.id"
                >
                  {{ account.bankName }} · {{ account.accountNumber }} · a.n.
                  {{ account.accountHolder }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </div>

        <FloatingLabelField
          label="Bank Pengirim"
          :error="errors.bankName"
          floating
        >
          <Input
            v-model="bankName"
            name="bankName"
            maxlength="100"
          />
        </FloatingLabelField>
        <FloatingLabelField
          label="Nama Pemilik Rekening Pengirim"
          :error="errors.senderAccountName"
          floating
        >
          <Input
            v-model="senderAccountName"
            name="senderAccountName"
            maxlength="100"
          />
        </FloatingLabelField>
        <FloatingLabelField
          label="Tanggal Transfer"
          :error="errors.transferDate"
          floating
        >
          <div
            class="rounded-md"
            :class="
              errors.transferDate
                ? '[&_button]:!border-destructive [&_button]:!text-destructive [&_button_svg]:!text-destructive focus-within:[&_button]:!border-destructive'
                : ''
            "
          >
            <DatePicker
              v-model="transferDate"
              :max-date="today"
            />
          </div>
        </FloatingLabelField>

        <FloatingLabelField
          label="Bukti Transfer"
          :error="errors.file"
          floating
          class="min-w-0"
        >
          <FileDropzone
            :file-name="file?.name"
            :invalid="!!errors.file"
            aria-label="Pilih bukti transfer"
            hint="JPG, PNG, atau PDF, maks. 5 MB"
            @change="pickFile"
          />
        </FloatingLabelField>
      </CardContent>

      <CardContent class="border-t bg-muted/10 p-4 sm:p-6">
        <div
          class="grid gap-3 sm:grid-cols-2 text-[length:var(--text-control,0.75rem)]"
        >
          <div>
            <p class="text-xs text-muted-foreground">Nomor Pendaftaran</p>
            <p class="mt-1 font-medium">
              {{ selected?.registrationNumber ?? '-' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">Nominal</p>
            <p class="mt-1 font-medium">
              {{ selected ? formatIDR(selected.amount) : '-' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">Status Setelah Disimpan</p>
            <p class="mt-1 font-medium text-emerald-600">Terverifikasi</p>
          </div>
        </div>
      </CardContent>

      <CardFooter
        standard
        class="flex-wrap"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="saving"
          @click="router.push('/admin/payments')"
        >
          Batal
        </Button>
        <Button
          type="button"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Menyimpan…' : 'Simpan Pembayaran' }}
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
