<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { BackButton } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  Check,
  Download,
  Expand,
  Eye,
  FileText,
  Info,
  TriangleAlert,
  X,
} from '@lucide/vue'
import { useRoleGuard } from '@/features/platform/auth'
import FilePreviewDialog from '../components/FilePreviewDialog.vue'
import { useFilePreview } from '../composables/useFilePreview'
import { admissionApi } from '../api/admissionApi'
import { documentReviewService } from '../services/documentReviewService'
import {
  DOCUMENT_STATUS_LABELS,
  type AdmissionDocumentReview,
  type AdmissionDocumentReviewSlot,
} from '../types'
import {
  DOCUMENT_STATUS_BADGE_VARIANTS,
  admissionBlobErrorMessage,
  formatDate,
  standardDocumentFileName,
} from '../utils'

const route = useRoute()
const router = useRouter()
const { can } = useRoleGuard()
const preview = useFilePreview()

const applicationId = computed(() => String(route.params.applicationId))
const review = ref<AdmissionDocumentReview | null>(null)
const loading = ref(true)
const error = ref<'not-found' | 'load-failed' | null>(null)
const acting = ref(false)

const rejectSlot = ref<AdmissionDocumentReviewSlot | null>(null)
const rejectNote = ref('')
const rejectError = ref('')
const sendOpen = ref(false)
const noteOpen = ref(false)
const dataNote = ref('')
const noteError = ref('')
const dialogId = useId()

const editable = computed(
  () => can('admission-documents.verify') && review.value?.readOnly === false,
)
const undecided = computed(
  () =>
    review.value?.slots.filter(
      (slot) => !slot.document || slot.document.status === 'PENDING',
    ).length ?? 0,
)
const rejected = computed(
  () =>
    review.value?.slots.filter((slot) => slot.document?.status === 'REJECTED')
      .length ?? 0,
)
const canSend = computed(() => editable.value && undecided.value === 0)

const activeSlotId = ref<string | null>(null)
const inlineUrl = ref<string | null>(null)
const inlineLoading = ref(false)
const inlineError = ref('')
let inlineRequest = 0

const activeSlot = computed<AdmissionDocumentReviewSlot | null>(() => {
  const slots = review.value?.slots
  if (!slots?.length) return null
  if (activeSlotId.value) {
    const found = slots.find((s) => s.documentTypeId === activeSlotId.value)
    if (found) return found
  }
  return slots.find((s) => s.document !== null) ?? slots[0] ?? null
})

const inlineKind = computed(() => {
  const type = activeSlot.value?.document?.file?.mimeType ?? ''
  if (type.startsWith('image/')) return 'image'
  if (type === 'application/pdf') return 'pdf'
  return 'other'
})

function releaseInline() {
  if (inlineUrl.value) URL.revokeObjectURL(inlineUrl.value)
  inlineUrl.value = null
}

async function loadInlinePreview() {
  releaseInline()
  inlineError.value = ''
  const file = activeSlot.value?.document?.file
  const current = ++inlineRequest
  if (!file) {
    inlineLoading.value = false
    return
  }
  if (inlineKind.value === 'other') {
    inlineLoading.value = false
    return
  }
  inlineLoading.value = true
  try {
    const response = await admissionApi.getFile(file.id)
    if (current !== inlineRequest) return
    inlineUrl.value = URL.createObjectURL(response.data)
  } catch (err: unknown) {
    if (current === inlineRequest) {
      inlineError.value = await admissionBlobErrorMessage(
        err,
        'Gagal memuat pratinjau berkas.',
      )
    }
  } finally {
    if (current === inlineRequest) inlineLoading.value = false
  }
}

async function downloadActiveFile() {
  const file = activeSlot.value?.document?.file
  if (!file) return
  try {
    const response = await admissionApi.getFile(file.id, true)
    const href = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = href
    link.download = standardDocumentFileName(
      activeSlot.value?.name,
      review.value?.applicantName,
      file.originalName,
    )
    link.click()
    setTimeout(() => URL.revokeObjectURL(href), 0)
  } catch (failure: unknown) {
    toast.error(
      await admissionBlobErrorMessage(failure, 'Gagal mengunduh berkas.'),
    )
  }
}

function handleOpenFile(slot: AdmissionDocumentReviewSlot) {
  activeSlotId.value = slot.documentTypeId
  if (slot.document?.file) {
    preview.show(slot.document.file)
  }
}

watch(
  () => activeSlot.value?.document?.file?.id,
  () => {
    void loadInlinePreview()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  inlineRequest++
  releaseInline()
})

async function fetchReview(showLoading: boolean) {
  if (showLoading) loading.value = true
  const result = await documentReviewService.fetchReview(applicationId.value)
  loading.value = false
  if ('error' in result) {
    error.value = result.error
    review.value = null
    return
  }
  error.value = null
  review.value = result.review
}

async function approve(slot: AdmissionDocumentReviewSlot) {
  if (!slot.document) return
  acting.value = true
  const result = await documentReviewService.decide(
    applicationId.value,
    slot.document.id,
    'APPROVED',
  )
  acting.value = false
  if (result.success) await fetchReview(false)
}

function openReject(slot: AdmissionDocumentReviewSlot) {
  rejectSlot.value = slot
  rejectNote.value = ''
  rejectError.value = ''
}

async function submitReject() {
  const slot = rejectSlot.value
  if (!slot?.document) return
  const note = rejectNote.value.trim()
  if (!note) {
    rejectError.value = 'Alasan wajib diisi'
    return
  }
  acting.value = true
  const result = await documentReviewService.decide(
    applicationId.value,
    slot.document.id,
    'REJECTED',
    note,
  )
  acting.value = false
  if (!result.success) return
  rejectSlot.value = null
  await fetchReview(false)
}

async function send(note?: string) {
  acting.value = true
  const result = await documentReviewService.send(applicationId.value, note)
  acting.value = false
  if (result.success) {
    sendOpen.value = false
    noteOpen.value = false
    await router.push('/admin/document-reviews')
    return
  }
  await fetchReview(false)
}

function openNote() {
  dataNote.value = ''
  noteError.value = ''
  noteOpen.value = true
}

async function submitNote() {
  const note = dataNote.value.trim()
  if (!note) {
    noteError.value = 'Catatan wajib diisi'
    return
  }
  await send(note)
}

useBreadcrumbs(() => {
  const name = review.value?.applicantName
  if (!name) return null
  const trail = route.meta.breadcrumbs ?? []
  return [...trail.slice(0, -1), { title: name }]
})

watch(applicationId, () => fetchReview(true))
onMounted(() => fetchReview(true))
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <p
      v-if="loading"
      class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
    >
      Memuat berkas pendaftar…
    </p>

    <div
      v-else-if="error"
      role="alert"
      class="space-y-3 rounded-md border p-4"
    >
      <p class="text-[length:var(--text-control,0.75rem)]">
        {{
          error === 'not-found'
            ? 'Pendaftar tidak ditemukan.'
            : 'Gagal memuat berkas pendaftar.'
        }}
      </p>
      <Button
        v-if="error === 'load-failed'"
        variant="outline"
        @click="fetchReview(true)"
      >
        Coba lagi
      </Button>
      <Button
        v-else
        variant="outline"
        @click="router.push('/admin/document-reviews')"
      >
        Kembali ke Verifikasi Berkas
      </Button>
    </div>

    <Card
      v-else-if="review"
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <div class="flex items-center gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <BackButton
              label="Kembali ke Verifikasi Berkas"
              @click="router.push('/admin/document-reviews')"
            />
            <CardTitle size="lg"> Periksa Berkas </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent class="space-y-4 p-0 sm:px-0">
        <div class="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          <Card
            gap="none"
            class="h-full lg:col-span-5"
          >
            <div class="border-b bg-muted/10 p-4 shrink-0 space-y-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2
                  class="truncate font-semibold text-[length:var(--text-control,0.75rem)] text-foreground"
                >
                  {{ review.applicantName }}
                </h2>
                <button
                  type="button"
                  data-test="open-detail"
                  class="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
                  @click="
                    router.push(`/admin/applicants/${review.applicationId}`)
                  "
                >
                  Lihat detail
                </button>
              </div>

              <div
                class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground"
              >
                <span>{{ review.registrationNumber }}</span>
                <span>·</span>
                <span>{{ review.waveName }}</span>
                <template v-if="review.submittedAt">
                  <span>·</span>
                  <span>Dikirim {{ formatDate(review.submittedAt) }}</span>
                </template>
              </div>
            </div>

            <div
              v-if="review.readOnly || review.revisionNote"
              class="border-b bg-muted/5 p-3 space-y-2.5 shrink-0"
            >
              <Alert
                v-if="review.readOnly"
                class="border-border bg-card px-3 py-2.5 shadow-none"
              >
                <Info class="size-4 text-muted-foreground" />
                <AlertTitle class="text-xs font-medium"
                  >Mode Hanya Baca</AlertTitle
                >
                <AlertDescription
                  class="text-xs leading-relaxed text-muted-foreground"
                >
                  Pendaftaran ini sudah tidak menunggu pemeriksaan, sehingga
                  keputusan berkas tidak bisa diubah.
                </AlertDescription>
              </Alert>

              <Alert
                v-if="review.revisionNote"
                variant="destructive"
                class="border-destructive/30 bg-destructive/5 px-3 py-2.5"
              >
                <TriangleAlert class="size-4" />
                <AlertTitle class="text-xs font-medium"
                  >Catatan Revisi Sebelumnya</AlertTitle
                >
                <AlertDescription
                  class="whitespace-pre-line text-xs leading-relaxed"
                >
                  {{ review.revisionNote }}
                </AlertDescription>
              </Alert>
            </div>

            <div
              class="flex items-center justify-between border-b bg-muted/25 px-4 py-2 text-xs font-medium text-muted-foreground shrink-0"
            >
              <span>Daftar Berkas</span>
              <span>
                {{ review.slots.filter((s) => s.document).length }} dari
                {{ review.slots.length }} terunggah
              </span>
            </div>

            <CardContent class="flex-1 min-h-0 p-0">
              <ul class="divide-y divide-border">
                <li
                  v-for="item in review.slots"
                  :key="item.documentTypeId"
                  data-test="slot"
                  class="group relative flex cursor-pointer flex-col gap-2 border-l-4 p-3.5 text-[length:var(--text-control,0.75rem)] transition-colors sm:p-4"
                  :class="[
                    activeSlot?.documentTypeId === item.documentTypeId
                      ? 'border-l-primary bg-primary/[0.04]'
                      : 'border-l-transparent hover:bg-muted/30',
                  ]"
                  @click="activeSlotId = item.documentTypeId"
                >
                  <div class="flex items-start gap-3">
                    <div
                      class="flex size-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors"
                      :class="[
                        item.document
                          ? activeSlot?.documentTypeId === item.documentTypeId
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border bg-muted/40 text-[#203f73]'
                          : 'border-dashed border-muted-foreground/30 bg-muted/10 text-muted-foreground/40',
                      ]"
                    >
                      <FileText class="size-4" />
                    </div>

                    <div class="min-w-0 flex-1">
                      <div
                        class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"
                      >
                        <div class="flex min-w-0 items-center gap-1">
                          <p
                            class="truncate font-medium text-[length:var(--text-control,0.75rem)]"
                            :class="[
                              activeSlot?.documentTypeId === item.documentTypeId
                                ? 'text-primary'
                                : 'text-foreground',
                            ]"
                          >
                            {{ item.name }}
                          </p>
                        </div>

                        <Badge
                          v-if="
                            item.document && item.document.status !== 'PENDING'
                          "
                          :variant="
                            DOCUMENT_STATUS_BADGE_VARIANTS[item.document.status]
                          "
                        >
                          {{ DOCUMENT_STATUS_LABELS[item.document.status] }}
                        </Badge>
                        <Badge
                          v-else-if="!item.document"
                          variant="outline"
                        >
                          Belum diunggah
                        </Badge>
                      </div>

                      <div class="mt-1 flex items-center justify-between gap-2">
                        <p
                          v-if="item.document"
                          class="truncate text-xs text-muted-foreground"
                        >
                          {{
                            standardDocumentFileName(
                              item.name,
                              review.applicantName,
                              item.document.file.originalName,
                            )
                          }}
                        </p>
                        <p
                          v-else
                          class="text-xs italic text-muted-foreground/70"
                        >
                          Belum ada berkas
                        </p>

                        <button
                          v-if="item.document"
                          type="button"
                          data-test="open-file"
                          class="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 sm:min-h-0 lg:hidden"
                          @click.stop="handleOpenFile(item)"
                        >
                          <Eye class="size-3.5" />
                          Lihat berkas
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="item.document?.note"
                    class="ml-12 rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
                  >
                    Catatan: {{ item.document.note }}
                  </div>

                  <div
                    v-if="editable && item.document"
                    class="flex flex-wrap gap-2 pt-1 lg:hidden"
                    @click.stop
                  >
                    <Button
                      v-if="item.document.status !== 'REJECTED'"
                      variant="destructive"
                      size="sm"
                      class="flex-1 sm:flex-none"
                      data-test="reject"
                      :disabled="acting"
                      @click="openReject(item)"
                    >
                      Tolak
                    </Button>
                    <Button
                      v-if="item.document.status !== 'APPROVED'"
                      size="sm"
                      class="flex-1 sm:flex-none"
                      data-test="approve"
                      :disabled="acting"
                      @click="approve(item)"
                    >
                      Setujui
                    </Button>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card
            gap="none"
            class="hidden h-full lg:col-span-7 lg:flex"
          >
            <CardHeader
              standard
              class="h-16"
            >
              <div class="min-w-0 flex-1 pr-2">
                <CardTitle
                  size="md"
                  class="truncate"
                >
                  {{ activeSlot?.name ?? 'Pratinjau Dokumen' }}
                </CardTitle>
                <p
                  v-if="activeSlot?.document?.file"
                  class="mt-0.5 truncate text-xs text-muted-foreground"
                >
                  {{
                    standardDocumentFileName(
                      activeSlot.name,
                      review.applicantName,
                      activeSlot.document.file.originalName,
                    )
                  }}
                </p>
                <p
                  v-else
                  class="mt-0.5 text-xs text-muted-foreground"
                >
                  Belum ada dokumen yang diunggah
                </p>
              </div>

              <div class="flex h-8 shrink-0 items-center gap-1.5">
                <template v-if="activeSlot?.document?.file">
                  <Button
                    variant="outline"
                    size="sm"
                    title="Unduh berkas"
                    @click="downloadActiveFile"
                  >
                    <Download class="size-3.5" />
                    <span class="sr-only sm:not-sr-only sm:ml-1">Unduh</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Perbesar berkas"
                    @click="preview.show(activeSlot.document.file)"
                  >
                    <Expand class="size-3.5" />
                    <span class="sr-only sm:not-sr-only sm:ml-1">Perbesar</span>
                  </Button>

                  <template v-if="editable">
                    <span
                      class="mx-1 h-4 w-px bg-border"
                      aria-hidden="true"
                    />
                    <Button
                      v-if="activeSlot.document.status !== 'REJECTED'"
                      variant="outline"
                      size="sm"
                      class="border-destructive/40 px-2.5 text-destructive hover:bg-destructive/10"
                      :disabled="acting"
                      @click="openReject(activeSlot)"
                    >
                      <X class="mr-1 size-3.5" />
                      Tolak
                    </Button>
                    <Button
                      v-if="activeSlot.document.status !== 'APPROVED'"
                      size="sm"
                      class="bg-emerald-600 px-2.5 text-white hover:bg-emerald-700"
                      :disabled="acting"
                      @click="approve(activeSlot)"
                    >
                      <Check class="mr-1 size-3.5" />
                      Setujui
                    </Button>
                  </template>
                </template>
              </div>
            </CardHeader>

            <CardContent class="flex flex-1 min-h-0 flex-col p-4">
              <div
                v-if="activeSlot?.document?.note"
                class="mb-3 shrink-0 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive"
              >
                Catatan penolakan: {{ activeSlot.document.note }}
              </div>

              <div
                class="flex flex-1 min-h-0 w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-muted/20"
              >
                <div
                  v-if="inlineLoading"
                  class="py-16 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                >
                  Memuat pratinjau…
                </div>
                <div
                  v-else-if="inlineError"
                  class="space-y-2 p-6 text-center"
                >
                  <p
                    class="text-[length:var(--text-control,0.75rem)] text-destructive"
                  >
                    {{ inlineError }}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="loadInlinePreview"
                  >
                    Coba lagi
                  </Button>
                </div>
                <template v-else-if="activeSlot?.document?.file">
                  <img
                    v-if="inlineKind === 'image' && inlineUrl"
                    :src="inlineUrl"
                    :alt="activeSlot.document.file.originalName"
                    class="size-full max-h-full max-w-full object-contain p-2"
                  />
                  <iframe
                    v-else-if="inlineKind === 'pdf' && inlineUrl"
                    :src="inlineUrl"
                    title="Pratinjau dokumen PDF"
                    class="size-full min-h-0 flex-1 border-none"
                  />
                  <div
                    v-else
                    class="p-6 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                  >
                    Format berkas tidak dapat ditampilkan langsung.
                  </div>
                </template>
                <div
                  v-else
                  class="p-12 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                >
                  Dokumen ini belum diunggah oleh calon santri.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>

      <CardFooter
        v-if="editable"
        standard
        class="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p
          v-if="undecided > 0"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          {{ undecided }} berkas belum diputuskan atau belum diunggah.
        </p>
        <div v-else />

        <div class="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            variant="outline"
            data-test="request-data-fix"
            :disabled="acting"
            @click="openNote"
          >
            Minta perbaikan data
          </Button>
          <Button
            data-test="send"
            :disabled="acting || !canSend"
            @click="sendOpen = true"
          >
            Kirim hasil
          </Button>
        </div>
      </CardFooter>
    </Card>

    <Dialog
      :open="rejectSlot !== null"
      @update:open="(open) => !open && (rejectSlot = null)"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Tolak {{ rejectSlot?.name }}</DialogTitle>
          <DialogDescription class="sr-only">
            Alasan disimpan dan dikirim ke pendaftar bersama hasil pemeriksaan.
          </DialogDescription>
        </DialogHeader>
        <form
          data-test="reject-form"
          class="flex flex-1 flex-col justify-between"
          @submit.prevent="submitReject"
        >
          <div class="min-h-0 flex-1 overflow-y-auto space-y-4 dialog-body">
            <FloatingLabelField
              label="Alasan Penolakan"
              :for="`${dialogId}-reject`"
              :error="rejectError"
              floating
            >
              <Textarea
                :id="`${dialogId}-reject`"
                v-model="rejectNote"
                rows="3"
                maxlength="500"
                aria-label="Alasan penolakan"
                placeholder=" "
              />
            </FloatingLabelField>
            <p
              v-if="rejectError"
              class="text-xs text-destructive"
            >
              {{ rejectError }}
            </p>
          </div>
          <DialogFooter
            standard
            class="justify-between"
          >
            <Button
              type="button"
              variant="outline"
              :disabled="acting"
              @click="rejectSlot = null"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              :disabled="acting"
            >
              {{ acting ? 'Menyimpan…' : 'Simpan' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog
      :open="sendOpen"
      @update:open="(open) => (sendOpen = open)"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Kirim hasil pemeriksaan?</DialogTitle>
          <DialogDescription class="sr-only">
            Konfirmasi pengiriman hasil pemeriksaan berkas ke pendaftar.
          </DialogDescription>
        </DialogHeader>
        <div
          data-test="send-confirm"
          class="dialog-body text-[length:var(--text-control,0.75rem)] leading-relaxed"
        >
          Pendaftar diberi tahu satu kali dan keputusan berkas tidak bisa diubah
          lagi.
          <template v-if="rejected > 0">
            {{ rejected }} berkas ditolak, formulir dikembalikan ke pendaftar.
          </template>
          <template v-else>
            Semua berkas disetujui; pendaftaran terverifikasi otomatis setelah
            pembayaran terverifikasi.
          </template>
        </div>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="acting"
            @click="sendOpen = false"
          >
            Batal
          </Button>
          <Button
            type="button"
            data-test="confirm-send"
            :disabled="acting"
            @click="send()"
          >
            {{ acting ? 'Mengirim…' : 'Kirim hasil' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      :open="noteOpen"
      @update:open="(open) => (noteOpen = open)"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Minta Perbaikan Data</DialogTitle>
          <DialogDescription class="sr-only">
            Formulir dikembalikan ke pendaftar dengan catatan ini, bersama
            berkas yang ditolak.
          </DialogDescription>
        </DialogHeader>
        <form
          data-test="note-form"
          class="flex flex-1 flex-col justify-between"
          @submit.prevent="submitNote"
        >
          <div class="min-h-0 flex-1 overflow-y-auto space-y-4 dialog-body">
            <FloatingLabelField
              label="Catatan Perbaikan"
              :for="`${dialogId}-data-note`"
              :error="noteError"
              floating
            >
              <Textarea
                :id="`${dialogId}-data-note`"
                v-model="dataNote"
                rows="4"
                maxlength="2000"
                aria-label="Catatan perbaikan"
                placeholder=" "
              />
            </FloatingLabelField>
            <p
              v-if="noteError"
              class="text-xs text-destructive"
            >
              {{ noteError }}
            </p>
          </div>
          <DialogFooter
            standard
            class="justify-between"
          >
            <Button
              type="button"
              variant="outline"
              :disabled="acting"
              @click="noteOpen = false"
            >
              Batal
            </Button>
            <Button
              type="submit"
              :disabled="acting"
            >
              {{ acting ? 'Mengirim…' : 'Kirim' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <FilePreviewDialog
      v-model:open="preview.open.value"
      :file="preview.file.value"
    />
  </div>
</template>
