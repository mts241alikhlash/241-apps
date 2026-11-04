<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { Copy, FileText, TriangleAlert } from '@lucide/vue'
import { DatePicker, FileDropzone } from '@mts241alikhlash/ui'
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { FormControl, FormField } from '@mts241alikhlash/ui/form'
import FloatingField from './AdmissionField.vue'
import { paymentSchema } from '../schemas/applicationFormSchemas'
import { useFormOptions } from '../composables/useFormOptions'
import { PAYMENT_STATUS_LABELS } from '../types'
import type { AdmissionPayment, PreviewFile } from '../types'
import type { PaymentForm } from '../composables/useApplicationFormState'
import { formatDate, formatIDR, jakartaToday } from '../utils'

const props = defineProps<{
  applicationPayment: AdmissionPayment | null
  editable: boolean
  waveFull?: boolean
  paymentFile: File | null
  uploadingPayment: boolean
  onFileChange: (event: Event) => void
  onUpload: () => void
  onPreview?: (file: PreviewFile) => void
}>()

const payment = defineModel<PaymentForm>({ required: true })
const today = jakartaToday()
const fileError = ref('')

const { options } = useFormOptions()
const accounts = computed(() => options.value?.bankAccounts ?? [])

const { values, validate, setValues, setFieldValue } = useForm<PaymentForm>({
  validationSchema: toTypedSchema(paymentSchema),
  initialValues: payment.value,
})

watch(payment, (v) => setValues(v, false))
watch(values, (v) => Object.assign(payment.value, v), { deep: true })

const status = computed(() => props.applicationPayment?.status ?? 'UNPAID')

const GUIDANCE: Record<string, string> = {
  UNPAID:
    'Transfer biaya pendaftaran ke salah satu rekening di bawah, lalu unggah bukti transfernya. Pembayaran boleh menyusul setelah formulir dikirim.',
  PENDING:
    'Bukti transfer sedang diperiksa panitia. Jika ada yang keliru, unggah ulang bukti yang benar.',
  REJECTED:
    'Bukti transfer ditolak. Perbaiki sesuai catatan panitia, lalu unggah ulang.',
}

const canUpload = computed(() => props.editable && status.value !== 'VERIFIED')

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} disalin.`)
  } catch {
    toast.error(`Gagal menyalin ${label.toLowerCase()}.`)
  }
}

function pickFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  fileError.value =
    file && !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)
      ? 'Format berkas harus JPG, PNG, atau PDF.'
      : ''
  if (fileError.value) input.value = ''
  props.onFileChange(event)
  input.value = ''
}

async function upload() {
  const { valid } = await validate()
  fileError.value = props.paymentFile ? '' : 'Pilih berkas bukti transfer.'
  if (valid && props.paymentFile) props.onUpload()
}
</script>

<template>
  <div class="space-y-4">
    <section class="space-y-3 text-[length:var(--text-control,0.75rem)]">
      <p
        v-if="GUIDANCE[status]"
        class="text-muted-foreground"
      >
        {{ GUIDANCE[status] }}
      </p>
      <dl
        class="grid grid-cols-[max-content_auto_minmax(0,1fr)] gap-x-1.5 gap-y-1"
      >
        <dt class="text-muted-foreground">Biaya</dt>
        <span
          class="text-muted-foreground"
          aria-hidden="true"
          >:</span
        >
        <dd class="font-medium">
          {{ applicationPayment ? formatIDR(applicationPayment.amount) : '-' }}
        </dd>
        <dt class="text-muted-foreground">Status</dt>
        <span
          class="text-muted-foreground"
          aria-hidden="true"
          >:</span
        >
        <dd>{{ PAYMENT_STATUS_LABELS[status] }}</dd>
        <template v-if="status === 'REJECTED' && applicationPayment?.note">
          <dt class="text-muted-foreground">Catatan</dt>
          <span
            class="text-muted-foreground"
            aria-hidden="true"
            >:</span
          >
          <dd class="text-destructive">{{ applicationPayment.note }}</dd>
        </template>
        <template v-if="applicationPayment?.proofFile">
          <dt class="text-muted-foreground">Bukti</dt>
          <span
            class="text-muted-foreground"
            aria-hidden="true"
            >:</span
          >
          <dd data-test="uploaded-proof">
            <button
              v-if="onPreview"
              type="button"
              data-test="open-file"
              class="group inline-flex items-center gap-1.5 text-left text-foreground transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
              @click="onPreview(applicationPayment.proofFile)"
            >
              <FileText
                class="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary group-focus-visible:text-primary"
              />
              <span class="break-all">{{
                applicationPayment.proofFile.originalName
              }}</span>
            </button>
            <span
              v-else
              class="break-all"
              >{{ applicationPayment.proofFile.originalName }}</span
            >
          </dd>
          <template v-if="applicationPayment.bankAccount">
            <dt class="text-muted-foreground">Rekening tujuan</dt>
            <span
              class="text-muted-foreground"
              aria-hidden="true"
              >:</span
            >
            <dd>
              {{ applicationPayment.bankAccount.bankName }}
              {{ applicationPayment.bankAccount.accountNumber }} a.n.
              {{ applicationPayment.bankAccount.accountHolder }}
            </dd>
          </template>
          <dt class="text-muted-foreground">Pengirim</dt>
          <span
            class="text-muted-foreground"
            aria-hidden="true"
            >:</span
          >
          <dd>
            {{ applicationPayment.bankName }} a.n.
            {{ applicationPayment.senderAccountName }}
            <template v-if="applicationPayment.transferDate">
              · {{ formatDate(applicationPayment.transferDate) }}
            </template>
          </dd>
        </template>
      </dl>
    </section>

    <Alert
      v-if="canUpload && waveFull"
      variant="destructive"
    >
      <TriangleAlert />
      <AlertTitle>Gelombang penuh</AlertTitle>
      <AlertDescription>
        Gelombang ini sudah penuh. Anda akan dipindahkan ke gelombang berikutnya
        begitu dibuka.
      </AlertDescription>
    </Alert>
    <section
      v-else-if="canUpload"
      class="space-y-3"
    >
      <FormField
        v-slot="{ errorMessage }"
        name="bankAccountId"
      >
        <fieldset class="space-y-2">
          <legend class="text-[length:var(--text-control,0.75rem)] font-medium">
            Rekening tujuan <span class="text-destructive">*</span>
          </legend>
          <p
            v-if="accounts.length === 0"
            class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Rekening tujuan belum tersedia. Hubungi panitia PSB.
          </p>
          <div
            v-else
            role="radiogroup"
            aria-label="Rekening tujuan"
            class="grid gap-2 sm:grid-cols-2"
          >
            <div
              v-for="account in accounts"
              :key="account.id"
              class="flex min-w-0 items-start gap-2"
            >
              <label
                class="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-md border p-3 text-[length:var(--text-control,0.75rem)] has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="bankAccountId"
                  class="mt-1"
                  :value="account.id"
                  :checked="values.bankAccountId === account.id"
                  @change="setFieldValue('bankAccountId', account.id)"
                />
                <span class="min-w-0 flex-1 space-y-0.5">
                  <span class="block font-medium">{{ account.bankName }}</span>
                  <span class="block break-all tabular-nums">{{
                    account.accountNumber
                  }}</span>
                  <span class="block text-muted-foreground">
                    a.n. {{ account.accountHolder }}
                  </span>
                </span>
              </label>
              <Button
                type="button"
                variant="ghost"
                class="shrink-0 p-0"
                :aria-label="`Salin nomor rekening ${account.bankName}`"
                @click="copy(account.accountNumber, 'Nomor rekening')"
              >
                <Copy class="size-4" />
              </Button>
            </div>
          </div>
          <p
            v-if="errorMessage"
            class="text-[length:var(--text-control,0.75rem)] text-destructive"
          >
            {{ errorMessage }}
          </p>
        </fieldset>
      </FormField>

      <div class="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <FloatingField
          v-slot="{ componentField }"
          name="bankName"
          label="Bank Pengirim"
          required
        >
          <FormControl>
            <Input
              v-bind="componentField"
              maxlength="100"
            />
          </FormControl>
        </FloatingField>
        <FloatingField
          v-slot="{ componentField }"
          name="senderAccountName"
          label="Nama Pemilik Rekening Pengirim"
          required
        >
          <FormControl>
            <Input
              v-bind="componentField"
              maxlength="100"
            />
          </FormControl>
        </FloatingField>
        <FloatingField
          v-slot="{ value, setValue }"
          name="transferDate"
          label="Tanggal Transfer"
          required
          always-float
          class="[&_button]:border-input [&_button]:bg-transparent [&_button:hover]:bg-transparent [&_button:hover]:text-foreground dark:[&_button]:bg-input/30 dark:[&_button:hover]:bg-input/30"
        >
          <FormControl>
            <DatePicker
              :model-value="value ?? ''"
              :max-date="today"
              placeholder=""
              @update:model-value="setValue"
            />
          </FormControl>
        </FloatingField>
        <div class="space-y-2 sm:col-span-2">
          <p class="text-[length:var(--text-control,0.75rem)] font-medium">
            Bukti Transfer <span class="text-destructive">*</span>
          </p>
          <FileDropzone
            :file-name="paymentFile?.name"
            :disabled="uploadingPayment"
            :invalid="!!fileError"
            aria-label="Pilih bukti transfer"
            hint="JPG, PNG, atau PDF, maks. 5 MB"
            @change="pickFile"
          />
          <p
            v-if="fileError"
            class="text-[length:var(--text-control,0.75rem)] text-destructive"
          >
            {{ fileError }}
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p
          v-if="uploadingPayment"
          role="status"
          class="text-[length:var(--text-control,0.75rem)]"
        >
          Mengunggah bukti pembayaran…
        </p>
        <Button
          :disabled="uploadingPayment || accounts.length === 0"
          @click="upload"
        >
          {{
            uploadingPayment
              ? 'Mengunggah…'
              : applicationPayment?.proofFile
                ? 'Unggah Ulang'
                : 'Unggah'
          }}
        </Button>
      </div>
    </section>
  </div>
</template>
