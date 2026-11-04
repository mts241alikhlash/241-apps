<script setup lang="ts">
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { FileText, TriangleAlert } from '@lucide/vue'
import { BackButton } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { useMyApplication } from '../composables/useMyApplication'
import { useAdminRegistration } from '../composables/useAdminRegistration'
import { useApplicationFormState } from '../composables/useApplicationFormState'
import { useApplicationUploads } from '../composables/useApplicationUploads'
import { useFormOptions } from '../composables/useFormOptions'
import { useRoleGuard } from '@/features/platform/auth'
import PersonalDataStep from '../components/PersonalDataStep.vue'
import ParentsStep from '../components/ParentsStep.vue'
import AddressStep from '../components/AddressStep.vue'
import SchoolStep from '../components/SchoolStep.vue'
import AchievementsStep from '../components/AchievementsStep.vue'
import DocumentsStep from '../components/DocumentsStep.vue'
import FilePreviewDialog from '../components/FilePreviewDialog.vue'
import PaymentStep from '../components/PaymentStep.vue'
import { useFilePreview } from '../composables/useFilePreview'
import ReviewStep from '../components/ReviewStep.vue'
import SubmitConfirmButton from '../components/SubmitConfirmButton.vue'
import { applicationCompleteness } from '../composables/applicationCompleteness'
import AdmissionStepNav from '../components/AdmissionStepNav.vue'
import ApplicationIntro from '../components/ApplicationIntro.vue'
import type { AdmissionApplication } from '../types'
import { isWaveClosed } from '../utils'

const router = useRouter()
const route = useRoute()

const adminApplicationId =
  typeof route.params.id === 'string' ? route.params.id : null
const isAdminForm = adminApplicationId !== null

function adminSource(id: string) {
  const admin = useAdminRegistration()
  admin.applicationId.value = id
  return {
    fetchMyApplication: admin.fetchApplication,
    formError: computed(() =>
      admin.fetchError.value === 'load-failed' ? 'load-failed' : null,
    ),
    updateStep: admin.updateStep,
    uploadAttachment: admin.uploadAttachment,
    uploadDocument: admin.uploadDocument,
    uploadPaymentProof: admin.uploadPaymentProof,
    submit: admin.submit,
  }
}

const {
  fetchMyApplication,
  formError,
  updateStep,
  uploadAttachment,
  uploadDocument: uploadDocumentReq,
  uploadPaymentProof: uploadPaymentProofReq,
  submit: submitReq,
} = adminApplicationId ? adminSource(adminApplicationId) : useMyApplication()

const application = ref<AdmissionApplication | null>(null)
const loading = ref(true)
const isSaving = ref(false)
const savePending = ref(false)
const saveFailed = ref(false)
const isSubmitting = ref(false)
const currentStep = ref(0)
const stepContent = ref<HTMLElement | null>(null)
const formRoot = ref<HTMLElement | null>(null)
const preview = useFilePreview()
const savedPayloads = reactive(new Map<number, string>())

interface StepValidator {
  validate: () => Promise<{ valid: boolean }>
}

const personalStepRef = ref<StepValidator | null>(null)
const parentsStepRef = ref<StepValidator | null>(null)
const addressStepRef = ref<StepValidator | null>(null)
const schoolStepRef = ref<StepValidator | null>(null)
const achievementsStepRef = ref<StepValidator | null>(null)

const stepValidators: Record<number, () => StepValidator | null> = {
  0: () => personalStepRef.value,
  1: () => parentsStepRef.value,
  2: () => addressStepRef.value,
  3: () => schoolStepRef.value,
  4: () => achievementsStepRef.value,
}

const { can } = useRoleGuard()

const isAdmin = computed(() => can('admissions.read'))

const emptyAction = computed(() =>
  isAdmin.value
    ? { to: '/admin/applicants', label: 'Buka Daftar Pendaftar' }
    : { to: '/registration', label: 'Kembali ke Dasbor' },
)

const steps = [
  'Data Diri',
  'Orang Tua/Wali',
  'Alamat',
  'Sekolah Asal',
  'Prestasi & Beasiswa',
  'Berkas',
  'Pembayaran',
  'Review & Kirim',
]

const editable = computed(() => {
  const status = application.value?.status
  return status === 'DRAFT' || status === 'REVISION_NEEDED'
})

const stepStartsFlush = computed(
  () => currentStep.value === 0 || currentStep.value === 3,
)

const paymentEditable = computed(
  () => editable.value || application.value?.status === 'SUBMITTED',
)

const academicYearName = computed(() => {
  const year = application.value?.wave?.academicYear
  if (!year) return null
  return typeof year === 'string' ? year : year.name
})

const {
  personal,
  parents,
  address,
  school,
  achievements,
  scholarships,
  payment,
  hydrate,
  guardianRelation,
  setGuardian,
  buildStepPayload,
} = useApplicationFormState()

function snapshotPayloads() {
  for (let index = 0; index <= 4; index++) {
    savedPayloads.set(index, JSON.stringify(buildStepPayload(index)))
  }
}

const saveMessage = computed(() => {
  if (!editable.value || !buildStepPayload(currentStep.value)) return null
  if (savePending.value) return 'Menyimpan…'
  if (saveFailed.value) return 'Gagal menyimpan. Coba lagi.'
  return null
})

const flaggedSteps = computed(() => {
  const flagged: number[] = []
  if (application.value?.documents?.some((d) => d.status === 'REJECTED'))
    flagged.push(5)
  if (application.value?.payment?.status === 'REJECTED') flagged.push(6)
  return flagged
})

const { load: loadFormOptions, listOf } = useFormOptions()
const completeness = computed(() =>
  application.value
    ? applicationCompleteness({
        personal: personal.value,
        parents: parents.value,
        address: address.value,
        school: school.value,
        achievements: achievements.value,
        scholarships: scholarships.value,
        lifeStatuses: listOf('parentLifeStatuses'),
        scholarshipCategories: listOf('scholarshipCategories'),
        documentTypes: application.value.documentTypes ?? [],
        documents: application.value.documents ?? [],
      })
    : [],
)
const waveClosed = computed(() =>
  isWaveClosed(application.value?.wave?.endDate),
)
const canSubmit = computed(
  () => !waveClosed.value && completeness.value.every((item) => item.done),
)

async function refresh() {
  const data = await fetchMyApplication()
  if (data) {
    application.value = data
    hydrate(data)
    snapshotPayloads()
  }
}

const {
  documentFiles,
  uploadingDoc,
  onDocumentFileChange,
  clearDocumentFile,
  uploadDocument,
  paymentFile,
  uploadingPayment,
  onPaymentFileChange,
  uploadPayment,
} = useApplicationUploads({
  payment,
  uploadDocumentReq,
  uploadPaymentProofReq,
  refresh,
})

onMounted(async () => {
  void loadFormOptions().catch(() => undefined)
  await loadApplication()
})

const showIntro = ref(false)
const introRequiresAgreement = ref(false)

async function loadApplication() {
  loading.value = true
  const data = await fetchMyApplication()
  if (data) {
    application.value = data
    hydrate(data)
    snapshotPayloads()
    currentStep.value =
      route.query.step === 'documents'
        ? 5
        : route.query.step === 'payment'
          ? 6
          : 0
    introRequiresAgreement.value =
      !isAdminForm && data.status === 'DRAFT' && !data.birthDate
    showIntro.value = !isAdminForm
  }
  loading.value = false
}

function closeIntro() {
  if (introRequiresAgreement.value) {
    void router.push('/registration')
    return
  }
  showIntro.value = false
}

function continueFromIntro() {
  introRequiresAgreement.value = false
  showIntro.value = false
}

async function saveStep(): Promise<boolean> {
  if (!editable.value) return true

  const payload = buildStepPayload(currentStep.value)
  if (!payload) return true
  if (savedPayloads.get(currentStep.value) === JSON.stringify(payload))
    return true

  savePending.value = true
  saveFailed.value = false
  try {
    const result = await updateStep(payload)
    if (result.success) {
      if (result.data && application.value) {
        application.value = { ...application.value, ...result.data }
        hydrate(application.value)
      }
      savedPayloads.set(
        currentStep.value,
        JSON.stringify(buildStepPayload(currentStep.value)),
      )
    } else {
      saveFailed.value = true
    }
    return result.success
  } catch {
    saveFailed.value = true
    return false
  } finally {
    savePending.value = false
  }
}

async function goToStep(index: number) {
  if (
    index === currentStep.value ||
    index < 0 ||
    index >= steps.length ||
    isSaving.value ||
    isSubmitting.value
  ) {
    return
  }

  isSaving.value = true
  try {
    if (editable.value && index > currentStep.value) {
      const validator = stepValidators[currentStep.value]?.()
      if (validator) {
        const { valid } = await validator.validate()
        if (!valid) {
          await nextTick()
          const target = stepContent.value?.querySelector<HTMLElement>(
            '[aria-invalid="true"], .ff-error input, .ff-error button, .ff-error textarea',
          )
          target?.focus({ preventScroll: true })
          return
        }
      }
    }
    if (await saveStep()) {
      saveFailed.value = false
      currentStep.value = index
      await nextTick()
      if (formRoot.value && formRoot.value.getBoundingClientRect().top < 0)
        formRoot.value.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
  } finally {
    isSaving.value = false
  }
}

function nextStep() {
  return goToStep(currentStep.value + 1)
}

function previousStep() {
  return goToStep(currentStep.value - 1)
}

async function submitApplication() {
  isSubmitting.value = true
  const result = await submitReq()
  if (result.success) {
    if (isAdminForm) {
      toast.success('Formulir pendaftar berhasil dikirim.')
      await router.push(`/admin/applicants/${adminApplicationId}`)
    } else {
      toast.success('Formulir berhasil dikirim! Menunggu verifikasi admin.')
      await router.push('/registration')
    }
  }
  isSubmitting.value = false
}

useBreadcrumbs(() => {
  const name = application.value?.fullName
  if (!isAdminForm || !name) return null
  const trail = route.meta.breadcrumbs ?? []
  return [
    ...trail.slice(0, -1),
    { title: name, href: `/admin/applicants/${adminApplicationId}` },
    { title: 'Formulir' },
  ]
})
</script>

<template>
  <div
    v-if="loading"
    class="p-6 text-[length:var(--text-control,0.75rem)] text-muted-foreground"
  >
    Memuat formulir…
  </div>

  <div
    v-else-if="formError === 'load-failed'"
    class="p-6"
  >
    <p>Formulir gagal dimuat.</p>
    <Button
      class="mt-3"
      @click="loadApplication"
      >Coba lagi</Button
    >
  </div>

  <div
    v-else-if="application"
    ref="formRoot"
    class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2"
  >
    <div class="flex items-center justify-between gap-3 pb-2">
      <BackButton
        :label="
          isAdminForm ? 'Kembali ke detail pendaftar' : 'Kembali ke dasbor'
        "
        @click="
          router.push(
            isAdminForm
              ? `/admin/applicants/${adminApplicationId}`
              : '/registration',
          )
        "
      />
      <Button
        v-if="!isAdminForm"
        variant="link"
        size="sm"
        class="h-auto p-0"
        @click="showIntro = true"
      >
        Lihat ketentuan
      </Button>
    </div>
    <Card gap="none">
      <CardHeader standard>
        <AdmissionStepNav
          :steps="steps"
          :current-step="currentStep"
          :disabled="isSaving || isSubmitting"
          :flagged="flaggedSteps"
          @select="goToStep"
        />
      </CardHeader>
      <CardContent variant="standard">
        <Card gap="none">
          <CardHeader standard>
            <CardTitle size="md">{{ steps[currentStep] }}</CardTitle>
            <span class="text-xs text-muted-foreground">
              Langkah {{ currentStep + 1 }} dari {{ steps.length }}
            </span>
          </CardHeader>
          <CardContent variant="standard">
            <div
              v-if="
                application.status === 'REVISION_NEEDED' && currentStep === 5
              "
              class="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[length:var(--text-control,0.75rem)] text-destructive"
              :class="stepStartsFlush ? 'mb-1' : 'mb-4'"
            >
              <TriangleAlert class="mt-0.5 size-3.5 shrink-0" />
              <p class="min-w-0">
                {{ application.revisionNote }}
              </p>
            </div>
            <div
              v-else-if="!editable"
              class="rounded-md border p-3 text-[length:var(--text-control,0.75rem)] text-muted-foreground"
              :class="stepStartsFlush ? 'mb-1' : 'mb-4'"
            >
              {{
                isAdminForm
                  ? 'Formulir terkunci karena sudah dikirim. Isiannya hanya dapat dilihat.'
                  : 'Formulir terkunci karena sudah dikirim. Anda tetap dapat melihat isiannya.'
              }}
            </div>

            <div
              ref="stepContent"
              class="scroll-mt-4"
            >
              <PersonalDataStep
                v-if="currentStep === 0"
                ref="personalStepRef"
                v-model="personal"
                :editable="editable && !isSaving && !isSubmitting"
              />

              <ParentsStep
                v-else-if="currentStep === 1"
                ref="parentsStepRef"
                v-model="parents"
                :editable="editable && !isSaving && !isSubmitting"
                :guardian-relation="guardianRelation"
                :on-choose-guardian="setGuardian"
              />

              <AddressStep
                v-else-if="currentStep === 2"
                ref="addressStepRef"
                v-model="address"
                v-model:parents="parents"
                :editable="editable && !isSaving && !isSubmitting"
              />

              <SchoolStep
                v-else-if="currentStep === 3"
                ref="schoolStepRef"
                v-model="school"
                :editable="editable && !isSaving && !isSubmitting"
              />

              <AchievementsStep
                v-else-if="currentStep === 4"
                ref="achievementsStepRef"
                v-model:achievements="achievements"
                v-model:scholarships="scholarships"
                :editable="editable && !isSaving && !isSubmitting"
                :upload-attachment="uploadAttachment"
              />

              <DocumentsStep
                v-else-if="currentStep === 5"
                :document-types="application.documentTypes ?? []"
                :documents="application.documents ?? []"
                :document-files="documentFiles"
                :uploading-doc="uploadingDoc"
                :editable="editable"
                :on-file-change="onDocumentFileChange"
                :on-clear-file="clearDocumentFile"
                :on-upload="uploadDocument"
              />

              <PaymentStep
                v-else-if="currentStep === 6"
                v-model="payment"
                :application-payment="application.payment ?? null"
                :editable="paymentEditable"
                :wave-full="application.waveIsFull"
                :payment-file="paymentFile"
                :uploading-payment="uploadingPayment"
                :on-file-change="onPaymentFileChange"
                :on-upload="uploadPayment"
                :on-preview="isAdminForm ? preview.show : undefined"
              />

              <ReviewStep
                v-else
                :personal="personal"
                :parents="parents"
                :address="address"
                :school="school"
                :application="application"
                :editable="editable"
                :completeness="completeness"
                :on-go-to-step="goToStep"
              />
            </div>
            <p
              v-if="saveMessage"
              :role="saveFailed ? 'alert' : 'status'"
              class="mt-4 text-[length:var(--text-control,0.75rem)] text-muted-foreground"
            >
              {{ saveMessage }}
            </p>
          </CardContent>
        </Card>
      </CardContent>
      <CardFooter
        standard
        :class="currentStep === 0 ? 'justify-end' : 'justify-between'"
      >
        <Button
          v-if="currentStep > 0"
          variant="outline"
          size="sm"
          :disabled="isSaving || isSubmitting"
          @click="previousStep"
        >
          Sebelumnya
        </Button>
        <Button
          v-if="currentStep < steps.length - 1"
          size="sm"
          :disabled="isSaving || isSubmitting"
          @click="nextStep"
        >
          {{ isSaving ? 'Menyimpan…' : 'Selanjutnya' }}
        </Button>
        <span
          v-else-if="editable && waveClosed"
          class="text-[length:var(--text-control,0.75rem)] text-destructive"
        >
          Gelombang ini sudah ditutup; formulir tidak dapat dikirim.
        </span>
        <SubmitConfirmButton
          v-else-if="editable"
          size="sm"
          :disabled="!canSubmit"
          :submitting="isSubmitting"
          @confirm="submitApplication"
        />
      </CardFooter>
    </Card>
    <FilePreviewDialog
      v-model:open="preview.open.value"
      :file="preview.file.value"
    />
    <Dialog
      :open="showIntro"
      @update:open="!$event && closeIntro()"
    >
      <DialogContent
        size="xl"
        class="max-h-[90dvh]"
      >
        <DialogHeader standard>
          <DialogTitle>Ketentuan Pendaftaran</DialogTitle>
          <DialogDescription class="sr-only">
            Informasi gelombang dan ketentuan pendaftaran.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ApplicationIntro
            :application="application"
            :academic-year-name="academicYearName"
            :requires-agreement="introRequiresAgreement"
            @start="continueFromIntro"
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  </div>

  <div
    v-else
    class="flex min-h-[60vh] items-center justify-center p-6"
  >
    <div
      class="w-full max-w-md rounded-lg bg-card p-6 text-center ring-1 ring-foreground/10"
    >
      <FileText class="mx-auto h-8 w-8 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-medium tracking-tight">
        Formulir belum tersedia
      </h2>
      <p
        class="mt-2 text-[length:var(--text-control,0.75rem)] text-muted-foreground text-balance"
      >
        {{
          isAdminForm
            ? 'Data pendaftar tidak ditemukan.'
            : isAdmin
              ? 'Akun admin tidak memiliki formulir pendaftaran pribadi. Gunakan daftar pendaftar untuk mengelola pengajuan.'
              : 'Belum ada formulir pendaftaran yang terhubung dengan akun ini.'
        }}
      </p>
      <RouterLink
        :to="emptyAction.to"
        class="mt-6 inline-block"
      >
        <Button class="w-full">{{ emptyAction.label }}</Button>
      </RouterLink>
    </div>
  </div>
</template>
