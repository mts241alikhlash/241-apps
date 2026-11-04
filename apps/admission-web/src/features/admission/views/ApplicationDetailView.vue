<script setup lang="ts">
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@mts241alikhlash/ui/tooltip'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@mts241alikhlash/ui/tabs'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FileText, SquarePen, TriangleAlert } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
import { useRoleGuard } from '@/features/platform/auth'
import { useApplicationDetail } from '../composables/useApplicationDetail'
import { useFilePreview } from '../composables/useFilePreview'
import { useFormOptions } from '../composables/useFormOptions'
import FilePreviewDialog from '../components/FilePreviewDialog.vue'
import DetailItem from '../components/DetailItem.vue'
import ApplicationTimelineCard from '../components/ApplicationTimelineCard.vue'
import { addressOwnerOf } from '../schemas/applicationFormSchemas'
import {
  ADMISSION_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  RELATION_LABELS,
  STATUS_LABELS,
} from '../types'
import type {
  AdmissionAchievement,
  AdmissionApplicationParent,
  AdmissionDocument,
  AdmissionDocumentType,
  AdmissionScholarship,
} from '../types'
import {
  DOCUMENT_STATUS_BADGE_VARIANTS,
  PAYMENT_STATUS_BADGE_VARIANTS,
  formatDate,
  formatIDR,
  presentValue,
  standardDocumentFileName,
} from '../utils'

const { can } = useRoleGuard()
const preview = useFilePreview()
const route = useRoute()
const router = useRouter()
const applicationId = computed(() => String(route.params.id))

const {
  application,
  loading,
  error,
  acting,
  fetchDetail,
  approveDocument,
  rejectDocument,
  verifyPaymentApprove,
  rejectPayment,
  requestRevision,
  verifyApplication,
  accept,
  reject,
  enroll,
} = useApplicationDetail()

const canVerifyPayment = computed(() => can('admission-payments.verify'))
const canReviewDocuments = computed(() => can('admission-documents.verify'))
const canDecide = computed(() => can('admission-decisions.decide'))
const canProcessEnrollment = computed(() =>
  can('admission-enrollments.process'),
)
const canAddPayment = computed(
  () =>
    can('admission-payments.create') &&
    application.value?.payment?.status !== 'VERIFIED' &&
    ['DRAFT', 'SUBMITTED', 'REVISION_NEEDED'].includes(
      application.value?.status ?? '',
    ),
)

type DialogKind =
  | 'revision'
  | 'reject'
  | 'accept'
  | 'enroll'
  | 'reject-doc'
  | 'reject-payment'
  | null
const dialogKind = ref<DialogKind>(null)
const dialogNote = ref('')
const dialogDocId = ref<string | null>(null)
const enrollForm = ref({ nis: '', nisn: '' })
const dialogId = useId()
const activeTab = ref('personal')

const status = computed(() => application.value?.status)
const editable = computed(
  () => status.value === 'DRAFT' || status.value === 'REVISION_NEEDED',
)
const hasActions = computed(
  () =>
    (canReviewDocuments.value && status.value === 'SUBMITTED') ||
    (canDecide.value &&
      (status.value === 'SUBMITTED' || status.value === 'VERIFIED')) ||
    (canProcessEnrollment.value && status.value === 'ACCEPTED'),
)

const documentRows = computed(() =>
  (application.value?.documentTypes ?? []).map((docType) => ({
    docType,
    doc:
      application.value?.documents?.find(
        (d) => d.documentTypeId === docType.id,
      ) ?? null,
  })),
)

interface DocumentRow {
  docType: AdmissionDocumentType
  doc: AdmissionDocument | null
}

const documentColumns = computed<ColumnDef<DocumentRow>[]>(() => [
  {
    id: 'name',
    header: 'Jenis Dokumen',
    meta: { align: 'left', strong: true },
    cell: ({ row }) =>
      h('span', [
        row.original.docType.isActive
          ? row.original.docType.name
          : `${row.original.docType.name} (nonaktif)`,
      ]),
  },
  {
    id: 'file',
    header: 'Berkas',
    meta: { align: 'left' },
    cell: ({ row }) => {
      const { doc, docType } = row.original
      const fileName = doc?.file
        ? standardDocumentFileName(
            docType.name,
            application.value?.fullName,
            doc.file.originalName,
          )
        : null
      return h('div', { class: 'min-w-0 space-y-1 text-left' }, [
        doc?.file
          ? h(
              'button',
              {
                type: 'button',
                'data-test': 'open-file',
                class:
                  'group inline-flex items-center gap-1.5 text-left text-[length:var(--text-control,0.75rem)] text-foreground transition-colors hover:text-primary',
                onClick: () => preview.show(doc.file!),
              },
              [
                h(FileText, {
                  class:
                    'size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary',
                }),
                h('span', { class: 'break-words' }, fileName ?? ''),
              ],
            )
          : h('span', { class: 'text-muted-foreground' }, '-'),
      ])
    },
  },
  {
    id: 'status',
    header: 'Status',
    meta: {
      align: 'center',
      mobileValue: (row: DocumentRow) => {
        const label = row.doc?.file
          ? DOCUMENT_STATUS_LABELS[row.doc.status]
          : 'Belum diunggah'
        return row.doc?.note ? `${label}. ${row.doc.note}` : label
      },
    },
    cell: ({ row }) => {
      const { doc } = row.original
      const variant = doc?.file
        ? DOCUMENT_STATUS_BADGE_VARIANTS[doc.status]
        : 'outline'
      const label = doc?.file
        ? DOCUMENT_STATUS_LABELS[doc.status]
        : 'Belum diunggah'
      if (!doc?.note) return h(Badge, { variant }, () => label)
      return h(Tooltip, null, () => [
        h(TooltipTrigger, { asChild: true }, () =>
          h(
            Badge,
            {
              variant,
              tabindex: 0,
              class:
                'cursor-help focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
            },
            () => label,
          ),
        ),
        h(TooltipContent, null, () => doc.note),
      ])
    },
  },
  ...(canReviewDocuments.value &&
  documentRows.value.some(({ doc }) => needsReview(doc))
    ? [actionColumn]
    : []),
])

function needsReview(doc: AdmissionDocument | null): doc is AdmissionDocument {
  if (!doc?.file || doc.status === 'APPROVED') return false
  const type = application.value?.documentTypes?.find(
    (item) => item.id === doc.documentTypeId,
  )
  return type?.requirement !== 'LATER'
}

const actionColumn: ColumnDef<DocumentRow> = {
  id: 'actions',
  header: 'Aksi',
  meta: { align: 'center' },
  cell: ({ row }) => {
    const { doc } = row.original
    if (!canReviewDocuments.value || !needsReview(doc)) return null
    return h(ActionCell, {
      manageLabel: 'Setujui',
      editLabel: 'Tolak',
      hideEdit: false,
      hideDelete: true,
      onManage: () => handleApproveDocument(doc.id),
      onEdit: () => openDialog('reject-doc', doc.id),
    })
  },
  enableSorting: false,
}

const { load: loadFormOptions, nameOf, listOf } = useFormOptions()

const achievementColumns = computed<ColumnDef<AdmissionAchievement>[]>(() => [
  {
    id: 'name',
    header: 'Nama Kompetisi',
    meta: { align: 'left', strong: true },
    cell: ({ row }) =>
      h(
        'div',
        { class: 'text-left' },
        presentValue(row.original.competitionName),
      ),
  },
  {
    id: 'field',
    header: 'Bidang',
    meta: { align: 'center' },
    cell: ({ row }) =>
      h('span', nameOf('competitionFields', row.original.competitionFieldId)),
  },
  {
    id: 'level',
    header: 'Tingkat',
    meta: { align: 'center' },
    cell: ({ row }) =>
      h('span', nameOf('competitionLevels', row.original.competitionLevelId)),
  },
  {
    id: 'rank',
    header: 'Peringkat',
    meta: { align: 'center' },
    cell: ({ row }) => h('span', presentValue(row.original.rank)),
  },
  {
    id: 'year',
    header: 'Tahun',
    meta: { align: 'center' },
    cell: ({ row }) => h('span', presentValue(row.original.year)),
  },
  {
    id: 'organizer',
    header: 'Penyelenggara',
    meta: { align: 'left' },
    cell: ({ row }) => h('span', presentValue(row.original.organizer)),
  },
  {
    id: 'file',
    header: 'Lampiran',
    meta: { align: 'left' },
    cell: ({ row }) => {
      const file = row.original.file
      if (!file) return h('span', { class: 'text-muted-foreground' }, '-')
      const fileName = standardDocumentFileName(
        row.original.competitionName || 'Prestasi',
        application.value?.fullName,
        file.originalName,
      )
      return h('div', { class: 'min-w-0 text-left' }, [
        h(
          'button',
          {
            type: 'button',
            'data-test': 'open-file',
            class:
              'group inline-flex items-center gap-1.5 text-left text-[length:var(--text-control,0.75rem)] text-foreground transition-colors hover:text-primary',
            onClick: () => preview.show(file),
          },
          [
            h(FileText, {
              class:
                'size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary',
            }),
            h('span', { class: 'break-words' }, fileName),
          ],
        ),
      ])
    },
  },
])

const scholarshipColumns = computed<ColumnDef<AdmissionScholarship>[]>(() => [
  {
    id: 'name',
    header: 'Nama Beasiswa',
    meta: { align: 'left', strong: true },
    cell: ({ row }) => {
      const children = [h('p', {}, presentValue(row.original.scholarshipName))]
      if (row.original.kipNumber) {
        children.push(
          h(
            'p',
            { class: 'text-xs text-muted-foreground' },
            `No. KIP: ${row.original.kipNumber}`,
          ),
        )
      }
      return h('div', { class: 'text-left space-y-0.5' }, children)
    },
  },
  {
    id: 'category',
    header: 'Kategori',
    meta: { align: 'center' },
    cell: ({ row }) =>
      h('span', nameOf('scholarshipCategories', row.original.categoryId)),
  },
  {
    id: 'provider',
    header: 'Instansi Pemberi',
    meta: { align: 'left' },
    cell: ({ row }) => {
      const providerType = nameOf(
        'scholarshipProviderTypes',
        row.original.providerTypeId,
      )
      return h('div', { class: 'text-left space-y-0.5' }, [
        h('p', {}, presentValue(row.original.providerName)),
        providerType !== '-'
          ? h('p', { class: 'text-xs text-muted-foreground' }, providerType)
          : null,
      ])
    },
  },
  {
    id: 'year',
    header: 'Tahun',
    meta: { align: 'center' },
    cell: ({ row }) => h('span', presentValue(row.original.year)),
  },
  {
    id: 'duration',
    header: 'Jangka Waktu',
    meta: { align: 'center' },
    cell: ({ row }) => h('span', presentValue(row.original.duration)),
  },
  {
    id: 'amount',
    header: 'Nominal',
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(
        'span',
        row.original.amount == null ? '-' : formatIDR(row.original.amount),
      ),
  },
  {
    id: 'file',
    header: 'Lampiran',
    meta: { align: 'left' },
    cell: ({ row }) => {
      const file = row.original.file
      if (!file) return h('span', { class: 'text-muted-foreground' }, '-')
      const fileName = standardDocumentFileName(
        row.original.scholarshipName || 'Beasiswa',
        application.value?.fullName,
        file.originalName,
      )
      return h('div', { class: 'min-w-0 text-left' }, [
        h(
          'button',
          {
            type: 'button',
            'data-test': 'open-file',
            class:
              'group inline-flex items-center gap-1.5 text-left text-[length:var(--text-control,0.75rem)] text-foreground transition-colors hover:text-primary',
            onClick: () => preview.show(file),
          },
          [
            h(FileText, {
              class:
                'size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary',
            }),
            h('span', { class: 'break-words' }, fileName),
          ],
        ),
      ])
    },
  },
])

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Laki-laki',
  FEMALE: 'Perempuan',
}

function placeAndDate(place?: string | null, date?: string | null) {
  return (
    [place?.trim(), date ? formatDate(date) : ''].filter(Boolean).join(', ') ||
    null
  )
}

function rtRw(rt?: string | null, rw?: string | null) {
  return rt || rw ? `${rt || '-'}/${rw || '-'}` : null
}

function fullAddress(parent: AdmissionApplicationParent) {
  const neighborhood = rtRw(parent.rt, parent.rw)
  return (
    [
      parent.street,
      neighborhood && `RT/RW ${neighborhood}`,
      parent.village,
      parent.district,
      parent.city,
      parent.province,
      parent.postalCode,
    ]
      .filter(Boolean)
      .join(', ') || null
  )
}

const addressOwner = computed(() =>
  addressOwnerOf(
    (application.value?.parents ?? []).map((parent) => ({
      ...parent,
      lifeStatusId: parent.lifeStatusId ?? '',
    })),
    listOf('parentLifeStatuses'),
  ),
)

function parentTitle(parent: AdmissionApplicationParent) {
  return parent.relation === 'GUARDIAN'
    ? 'Wali Santri'
    : `${RELATION_LABELS[parent.relation]} Kandung`
}

onMounted(() => {
  void loadFormOptions().catch(() => undefined)
})

watch(applicationId, (id) => void fetchDetail(id), { immediate: true })

function openDialog(kind: DialogKind, docId?: string) {
  dialogKind.value = kind
  dialogNote.value = ''
  dialogDocId.value = docId ?? null
}

async function handleApproveDocument(docId: string) {
  await approveDocument(applicationId.value, docId)
}

async function handleVerifyPayment() {
  await verifyPaymentApprove(applicationId.value)
}

async function handleVerifyApplication() {
  await verifyApplication(applicationId.value)
}

async function confirmDialog() {
  if (dialogKind.value === 'revision') {
    if (!dialogNote.value.trim()) {
      toast.error('Catatan revisi wajib diisi.')
      return
    }
    const r = await requestRevision(applicationId.value, dialogNote.value)
    if (r.success) dialogKind.value = null
  } else if (dialogKind.value === 'reject') {
    if (!dialogNote.value.trim()) {
      toast.error('Alasan penolakan wajib diisi.')
      return
    }
    const r = await reject(applicationId.value, dialogNote.value)
    if (r.success) dialogKind.value = null
  } else if (dialogKind.value === 'accept') {
    const r = await accept(applicationId.value, dialogNote.value || undefined)
    if (r.success) dialogKind.value = null
  } else if (dialogKind.value === 'enroll') {
    const needsNis = !application.value?.nis
    const needsNisn = !application.value?.nisn
    if (
      (needsNis && !enrollForm.value.nis.trim()) ||
      (needsNisn && !enrollForm.value.nisn.trim())
    ) {
      toast.error(needsNis ? 'NIS dan NISN wajib diisi.' : 'NISN wajib diisi.')
      return
    }
    const r = await enroll(applicationId.value, {
      ...(needsNis && { nis: enrollForm.value.nis.trim() }),
      ...(needsNisn && { nisn: enrollForm.value.nisn.trim() }),
    })
    if (r.success) dialogKind.value = null
  } else if (dialogKind.value === 'reject-doc' && dialogDocId.value) {
    if (!dialogNote.value.trim()) {
      toast.error('Alasan penolakan berkas wajib diisi.')
      return
    }
    const r = await rejectDocument(
      applicationId.value,
      dialogDocId.value,
      dialogNote.value,
    )
    if (r.success) dialogKind.value = null
  } else if (dialogKind.value === 'reject-payment') {
    if (!dialogNote.value.trim()) {
      toast.error('Alasan penolakan pembayaran wajib diisi.')
      return
    }
    const r = await rejectPayment(applicationId.value, dialogNote.value)
    if (r.success) dialogKind.value = null
  }
}

const dialogTitles: Record<Exclude<DialogKind, null>, string> = {
  revision: 'Minta Revisi',
  reject: 'Tolak Pendaftaran',
  accept: 'Terima Pendaftar',
  enroll: 'Proses Jadi Santri',
  'reject-doc': 'Tolak Berkas',
  'reject-payment': 'Tolak Bukti Pembayaran',
}

useBreadcrumbs(() => {
  const name = application.value?.fullName
  if (!name) return null
  const trail = route.meta.breadcrumbs ?? []
  return [...trail.slice(0, -1), { title: name }]
})
</script>

<template>
  <div
    v-if="loading"
    class="p-6 text-[length:var(--text-control,0.75rem)] text-muted-foreground"
  >
    Memuat detail pendaftar…
  </div>

  <div
    v-else-if="error === 'not-found'"
    class="space-y-3 p-6"
  >
    <p class="text-[length:var(--text-control,0.75rem)] text-muted-foreground">
      Pendaftar tidak ditemukan.
    </p>
    <Button
      variant="outline"
      @click="router.push('/admin/applicants')"
    >
      Kembali ke daftar pendaftar
    </Button>
  </div>

  <div
    v-else-if="error === 'load-failed'"
    class="space-y-3 p-6"
  >
    <p class="text-[length:var(--text-control,0.75rem)] text-muted-foreground">
      Gagal memuat detail pendaftar.
    </p>
    <div class="flex flex-wrap gap-2">
      <Button
        variant="outline"
        @click="fetchDetail(applicationId)"
      >
        Coba lagi
      </Button>
      <Button
        variant="ghost"
        @click="router.push('/admin/applicants')"
      >
        Kembali ke daftar pendaftar
      </Button>
    </div>
  </div>

  <div
    v-else-if="application"
    class="space-y-4 px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2"
  >
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardContent class="space-y-4 p-0 sm:px-0">
        <div
          v-if="editable"
          class="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div
            v-if="application.revisionNote && status === 'REVISION_NEEDED'"
            class="flex min-h-[var(--control-h-md,1.75rem)] min-w-0 flex-1 items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1 text-destructive"
          >
            <TriangleAlert class="size-3.5 shrink-0" />
            <p class="min-w-0 leading-normal">
              {{ application.revisionNote }}
            </p>
          </div>
          <Button
            class="w-full sm:ml-auto sm:w-auto"
            @click="
              router.push({
                name: 'admin-application-form',
                params: { id: applicationId },
              })
            "
          >
            <SquarePen class="mr-1.5 size-4" />
            Lengkapi Data
          </Button>
        </div>
        <Alert
          v-if="(application.duplicateNikCount ?? 0) > 0"
          variant="destructive"
        >
          <TriangleAlert />
          <AlertTitle>NIK ganda</AlertTitle>
          <AlertDescription>
            NIK ini sama dengan {{ application.duplicateNikCount }} pendaftar
            lain.
          </AlertDescription>
        </Alert>

        <Tabs
          v-model="activeTab"
          variant="line"
          class="min-w-0 gap-0"
        >
          <Card gap="none">
            <CardHeader class="p-0 shrink-0">
              <TabsList class="w-full bg-muted/30 px-4">
                <TabsTrigger value="personal"> Data Diri </TabsTrigger>
                <TabsTrigger value="parents"> Orang Tua/Wali </TabsTrigger>
                <TabsTrigger value="address"> Alamat </TabsTrigger>
                <TabsTrigger value="school"> Sekolah Asal </TabsTrigger>
                <TabsTrigger value="achievements">
                  Prestasi & Beasiswa
                </TabsTrigger>
                <TabsTrigger value="documents"> Berkas </TabsTrigger>
                <TabsTrigger value="payment"> Pembayaran </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent variant="standard">
              <TabsContent
                value="personal"
                class="space-y-4 text-[length:var(--text-control,0.75rem)]"
              >
                <Card gap="none">
                  <CardHeader standard>
                    <CardTitle size="md">Pendaftaran</CardTitle>
                  </CardHeader>
                  <CardContent variant="standard">
                    <dl class="grid gap-x-6 gap-y-1.5 xl:grid-cols-2">
                      <DetailItem
                        label="No. Pendaftaran"
                        :value="application.registrationNumber"
                        wrap="all"
                      />
                      <DetailItem
                        label="Gelombang"
                        :value="application.wave?.name"
                      />
                      <DetailItem
                        label="Status"
                        :value="STATUS_LABELS[application.status]"
                      />
                    </dl>
                  </CardContent>
                </Card>

                <Card gap="none">
                  <CardHeader standard>
                    <CardTitle size="md">Identitas Calon Santri</CardTitle>
                  </CardHeader>
                  <CardContent variant="standard">
                    <dl class="grid gap-x-6 gap-y-1.5 xl:grid-cols-2">
                      <DetailItem
                        label="Nama Lengkap"
                        :value="application.fullName"
                      />
                      <DetailItem
                        label="Nama Panggilan"
                        :value="application.nickname"
                      />
                      <DetailItem
                        label="Tempat, Tanggal Lahir"
                        :value="
                          placeAndDate(
                            application.birthPlace,
                            application.birthDate,
                          )
                        "
                      />
                      <DetailItem
                        label="Jenis Kelamin"
                        :value="
                          application.gender
                            ? GENDER_LABELS[application.gender]
                            : null
                        "
                      />
                      <DetailItem
                        label="NIK"
                        :value="application.nik"
                      />
                      <DetailItem
                        label="NISN"
                        :value="application.nisn"
                      />
                      <DetailItem
                        label="Jenis Pendaftaran"
                        :value="
                          application.admissionType
                            ? ADMISSION_TYPE_LABELS[application.admissionType]
                            : null
                        "
                      />
                      <DetailItem
                        label="Tingkat Kelas Tujuan"
                        :value="
                          application.targetGradeLevel
                            ? `Kelas ${application.targetGradeLevel}`
                            : null
                        "
                      />
                      <DetailItem
                        label="NIS"
                        :value="application.nis"
                      />
                      <DetailItem
                        label="Agama"
                        :value="application.religion?.name"
                      />
                      <DetailItem
                        label="Anak ke-"
                        :value="application.childOrder"
                      />
                      <DetailItem
                        label="Jumlah Saudara"
                        :value="application.siblingCount"
                      />
                      <DetailItem
                        label="Email"
                        :value="application.email"
                        wrap="all"
                      />
                      <DetailItem
                        label="No. HP"
                        :value="application.phone"
                      />
                      <DetailItem
                        label="Hobi"
                        :value="application.hobby"
                      />
                      <DetailItem
                        label="Cita-cita"
                        :value="application.aspiration"
                      />
                      <DetailItem
                        label="Yang Membiayai Sekolah"
                        :value="
                          nameOf(
                            'financingSources',
                            application.financingSourceId,
                          )
                        "
                      />
                      <DetailItem
                        label="Kebutuhan Disabilitas"
                        :value="
                          nameOf(
                            'disabilityTypes',
                            application.disabilityTypeId,
                          )
                        "
                      />
                      <DetailItem
                        label="Kebutuhan Khusus"
                        :value="
                          nameOf('specialNeeds', application.specialNeedId)
                        "
                      />
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="parents"
                class="space-y-4 text-[length:var(--text-control,0.75rem)]"
              >
                <div
                  v-if="(application.parents ?? []).length === 0"
                  class="rounded-xl border bg-card p-6 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground shadow-xs"
                >
                  Belum ada data orang tua atau wali.
                </div>
                <Card
                  v-for="parent in application.parents ?? []"
                  :key="parent.relation"
                  gap="none"
                >
                  <CardHeader standard>
                    <CardTitle size="md">
                      {{ parentTitle(parent) }}
                    </CardTitle>
                    <Badge
                      v-if="parent.isPrimary"
                      variant="secondary"
                    >
                      Wali
                    </Badge>
                  </CardHeader>
                  <CardContent variant="standard">
                    <dl class="grid gap-x-6 gap-y-1.5 xl:grid-cols-2">
                      <DetailItem
                        label="Nama Lengkap"
                        :value="parent.name"
                      />
                      <DetailItem
                        label="NIK"
                        :value="parent.nik"
                      />
                      <DetailItem
                        label="Tempat, Tanggal Lahir"
                        :value="
                          placeAndDate(parent.birthPlace, parent.birthDate)
                        "
                      />
                      <DetailItem
                        label="No. HP"
                        :value="parent.phone"
                      />
                      <DetailItem
                        label="Status Hidup"
                        :value="
                          nameOf('parentLifeStatuses', parent.lifeStatusId)
                        "
                      />
                      <DetailItem
                        label="Pendidikan"
                        :value="nameOf('educations', parent.educationId)"
                      />
                      <DetailItem
                        label="Pekerjaan"
                        :value="nameOf('occupations', parent.occupationId)"
                      />
                      <DetailItem
                        label="Penghasilan"
                        :value="nameOf('incomeRanges', parent.incomeRangeId)"
                      />
                      <DetailItem
                        label="Domisili"
                        :value="nameOf('domiciles', parent.domicileId)"
                      />
                      <DetailItem
                        label="Status Tempat Tinggal"
                        :value="nameOf('parentResidences', parent.residenceId)"
                      />
                      <DetailItem
                        label="Alamat"
                        :value="
                          parent.sameAddressAsStudent &&
                          parent.relation !== addressOwner
                            ? `Sama dengan alamat ${RELATION_LABELS[addressOwner].toLowerCase()}`
                            : fullAddress(parent)
                        "
                      />
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="address"
                class="text-[length:var(--text-control,0.75rem)]"
              >
                <Card gap="none">
                  <CardHeader standard>
                    <CardTitle size="md"> Alamat Tempat Tinggal </CardTitle>
                  </CardHeader>
                  <CardContent variant="standard">
                    <dl
                      class="grid gap-x-8 gap-y-3 text-[length:var(--text-control,0.75rem)] xl:grid-cols-2"
                    >
                      <DetailItem
                        label="Alamat (Jalan)"
                        :value="application.street"
                      />
                      <DetailItem
                        label="RT/RW"
                        :value="rtRw(application.rt, application.rw)"
                      />
                      <DetailItem
                        label="Desa/Kelurahan"
                        :value="application.village"
                      />
                      <DetailItem
                        label="Kecamatan"
                        :value="application.district"
                      />
                      <DetailItem
                        label="Kota/Kabupaten"
                        :value="application.city"
                      />
                      <DetailItem
                        label="Provinsi"
                        :value="application.province"
                      />
                      <DetailItem
                        label="Kode Pos"
                        :value="application.postalCode"
                      />
                      <DetailItem
                        label="Status Tempat Tinggal"
                        :value="
                          nameOf(
                            'studentResidences',
                            application.studentResidenceId,
                          )
                        "
                      />
                      <DetailItem
                        label="Transportasi ke Madrasah"
                        :value="
                          nameOf(
                            'transportations',
                            application.transportationId,
                          )
                        "
                      />
                      <DetailItem
                        label="Jarak ke Madrasah"
                        :value="
                          nameOf(
                            'travelDistances',
                            application.travelDistanceId,
                          )
                        "
                      />
                      <DetailItem
                        label="Waktu Tempuh ke Madrasah"
                        :value="nameOf('travelTimes', application.travelTimeId)"
                      />
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="school"
                class="text-[length:var(--text-control,0.75rem)]"
              >
                <Card gap="none">
                  <CardHeader standard>
                    <CardTitle size="md"> Sekolah Asal </CardTitle>
                  </CardHeader>
                  <CardContent variant="standard">
                    <dl
                      class="grid gap-x-8 gap-y-3 text-[length:var(--text-control,0.75rem)] xl:grid-cols-2"
                    >
                      <DetailItem
                        label="Nama Sekolah Asal"
                        :value="application.previousSchoolName"
                      />
                      <DetailItem
                        label="NPSN"
                        :value="application.previousSchoolNpsn"
                      />
                      <DetailItem
                        label="Alamat Sekolah"
                        :value="application.previousSchoolAddress"
                      />
                      <DetailItem
                        label="Tahun Lulus"
                        :value="application.graduationYear"
                      />
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="achievements"
                class="space-y-4 text-[length:var(--text-control,0.75rem)]"
              >
                <Card gap="none">
                  <CardHeader standard>
                    <CardTitle size="md">Prestasi</CardTitle>
                  </CardHeader>
                  <CardContent variant="standard">
                    <p
                      v-if="(application.achievements ?? []).length === 0"
                      class="text-muted-foreground"
                    >
                      Belum ada data prestasi.
                    </p>
                    <template v-else>
                      <DataTable
                        mobile="cards"
                        :columns="achievementColumns"
                        :data="application.achievements ?? []"
                        item-label="prestasi"
                        hide-per-page
                        hide-pagination
                        :page-size="
                          Math.max(1, (application.achievements ?? []).length)
                        "
                      />
                    </template>
                  </CardContent>
                </Card>

                <Card gap="none">
                  <CardHeader standard>
                    <CardTitle size="md">Beasiswa & Bantuan</CardTitle>
                  </CardHeader>
                  <CardContent variant="standard">
                    <p
                      v-if="(application.scholarships ?? []).length === 0"
                      class="text-muted-foreground"
                    >
                      Belum ada data beasiswa.
                    </p>
                    <template v-else>
                      <DataTable
                        mobile="cards"
                        :columns="scholarshipColumns"
                        :data="application.scholarships ?? []"
                        item-label="beasiswa"
                        hide-per-page
                        hide-pagination
                        :page-size="
                          Math.max(1, (application.scholarships ?? []).length)
                        "
                      />
                    </template>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="documents"
                class="text-[length:var(--text-control,0.75rem)]"
              >
                <Card gap="none">
                  <CardHeader standard>
                    <CardTitle size="md">Berkas Persyaratan</CardTitle>
                  </CardHeader>
                  <CardContent variant="standard">
                    <p
                      v-if="documentRows.length === 0"
                      class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                    >
                      Belum ada jenis berkas.
                    </p>
                    <template v-else>
                      <DataTable
                        mobile="cards"
                        :columns="documentColumns"
                        :data="documentRows"
                        item-label="dokumen"
                        hide-per-page
                        hide-pagination
                        :page-size="Math.max(1, documentRows.length)"
                      />
                    </template>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent
                value="payment"
                class="space-y-4 text-[length:var(--text-control,0.75rem)]"
              >
                <Alert
                  v-if="application.waveIsFull"
                  variant="destructive"
                >
                  <TriangleAlert />
                  <AlertTitle>Gelombang penuh</AlertTitle>
                  <AlertDescription>
                    Belum ada gelombang tujuan; pembayaran pendaftar ini belum
                    dapat diverifikasi.
                  </AlertDescription>
                </Alert>
                <template v-if="application.payment">
                  <Card gap="none">
                    <CardHeader standard>
                      <CardTitle size="md"> Rincian Pembayaran </CardTitle>
                      <Badge
                        :variant="
                          PAYMENT_STATUS_BADGE_VARIANTS[
                            application.payment.status
                          ]
                        "
                      >
                        {{ PAYMENT_STATUS_LABELS[application.payment.status] }}
                      </Badge>
                    </CardHeader>
                    <CardContent variant="standard">
                      <dl class="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                        <DetailItem
                          label="Status"
                          :value="
                            PAYMENT_STATUS_LABELS[application.payment.status]
                          "
                        />
                        <DetailItem
                          label="Nominal"
                          :value="formatIDR(application.payment.amount)"
                        />
                        <DetailItem
                          label="Bank Pengirim"
                          :value="application.payment.bankName"
                        />
                        <DetailItem
                          label="Bank Tujuan"
                          :value="application.payment.bankAccount?.bankName"
                        />
                        <DetailItem
                          label="Pemilik Rekening Pengirim"
                          :value="application.payment.senderAccountName"
                        />
                        <DetailItem
                          label="Nomor Rekening Tujuan"
                          :value="
                            application.payment.bankAccount?.accountNumber
                          "
                        />
                        <DetailItem
                          label="Tanggal Transfer"
                          :value="
                            application.payment.transferDate
                              ? formatDate(application.payment.transferDate)
                              : null
                          "
                        />
                        <DetailItem
                          label="Atas Nama Tujuan"
                          :value="
                            application.payment.bankAccount?.accountHolder
                          "
                        />
                        <DetailItem
                          v-if="application.payment.note"
                          label="Catatan"
                          class="sm:col-span-2"
                          :value="application.payment.note"
                        />
                        <DetailItem
                          label="Bukti Transfer"
                          class="sm:col-span-2"
                        >
                          <button
                            v-if="application.payment.proofFile"
                            type="button"
                            data-test="open-file"
                            class="group inline-flex items-center gap-1.5 text-left text-[length:var(--text-control,0.75rem)] text-foreground transition-colors hover:text-primary"
                            @click="preview.show(application.payment.proofFile)"
                          >
                            <FileText
                              class="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                            />
                            <span class="break-words">
                              {{
                                standardDocumentFileName(
                                  'Bukti Transfer',
                                  application.fullName,
                                  application.payment.proofFile.originalName ||
                                    application.payment.proofFile.storageKey,
                                )
                              }}
                            </span>
                          </button>
                          <span
                            v-else
                            class="text-muted-foreground"
                          >
                            Belum diunggah
                          </span>
                        </DetailItem>
                      </dl>
                    </CardContent>

                    <CardFooter
                      v-if="
                        (canVerifyPayment &&
                          application.payment.status === 'PENDING') ||
                        canAddPayment
                      "
                      standard
                      class="flex-wrap"
                    >
                      <Button
                        v-if="canAddPayment"
                        as-child
                        variant="outline"
                      >
                        <RouterLink
                          data-test="add-payment-link"
                          :to="{
                            name: 'admin-payments',
                            query: { applicationId: application.id },
                          }"
                        >
                          Tambah
                        </RouterLink>
                      </Button>
                      <Button
                        v-if="
                          canVerifyPayment &&
                          application.payment.status === 'PENDING'
                        "
                        variant="destructive"
                        :disabled="acting"
                        @click="openDialog('reject-payment')"
                      >
                        Tolak
                      </Button>
                      <Button
                        v-if="
                          canVerifyPayment &&
                          application.payment.status === 'PENDING'
                        "
                        :disabled="acting"
                        @click="handleVerifyPayment"
                      >
                        Verifikasi Pembayaran
                      </Button>
                    </CardFooter>
                  </Card>
                </template>
                <p
                  v-else
                  class="text-muted-foreground"
                >
                  Data pembayaran tidak tersedia.
                </p>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </CardContent>

      <CardFooter
        v-if="hasActions"
        standard
        class="flex-wrap"
      >
        <Button
          v-if="canReviewDocuments && status === 'SUBMITTED'"
          variant="outline"
          :disabled="acting"
          @click="openDialog('revision')"
        >
          Minta Revisi
        </Button>
        <Button
          v-if="canDecide && (status === 'SUBMITTED' || status === 'VERIFIED')"
          variant="destructive"
          :disabled="acting"
          @click="openDialog('reject')"
        >
          Tolak
        </Button>
        <Button
          v-if="canReviewDocuments && status === 'SUBMITTED'"
          :disabled="acting"
          @click="handleVerifyApplication"
        >
          Verifikasi Aplikasi
        </Button>
        <Button
          v-if="canDecide && status === 'VERIFIED'"
          :disabled="acting"
          @click="openDialog('accept')"
        >
          Terima
        </Button>
        <Button
          v-if="canProcessEnrollment && status === 'ACCEPTED'"
          :disabled="acting"
          @click="openDialog('enroll')"
        >
          Proses Jadi Santri
        </Button>
      </CardFooter>
    </Card>

    <ApplicationTimelineCard :application="application" />

    <Dialog
      :open="dialogKind !== null"
      @update:open="(open) => !open && (dialogKind = null)"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>
            {{ dialogKind ? dialogTitles[dialogKind] : '' }}
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            <template v-if="dialogKind === 'enroll'">
              <template v-if="application?.nis && application?.nisn">
                Akun pendaftar akan otomatis menjadi akun santri.
              </template>
              <template v-else>
                Lengkapi nomor yang belum ada untuk memproses pendaftar menjadi
                santri. Akun pendaftar akan otomatis menjadi akun santri.
              </template>
            </template>
            <template v-else-if="dialogKind === 'reject-doc'">
              Alasan penolakan berkas akan disampaikan kepada pendaftar.
            </template>
            <template v-else-if="dialogKind === 'reject-payment'">
              Alasan penolakan bukti transfer akan dikirim kepada pendaftar.
            </template>
            <template v-else-if="dialogKind === 'reject'">
              Pendaftar yang ditolak tidak dapat melanjutkan ke proses
              berikutnya.
            </template>
            <template v-else-if="dialogKind === 'revision'">
              Catatan perbaikan data akan disampaikan kepada calon santri.
            </template>
            <template v-else-if="dialogKind === 'accept'">
              Pendaftar yang diterima dapat melanjutkan ke tahap daftar ulang.
            </template>
          </DialogDescription>
        </DialogHeader>

        <form
          data-test="dialog-form"
          class="flex flex-1 flex-col justify-between"
          @submit.prevent="confirmDialog"
        >
          <div class="space-y-4 px-6 py-5">
            <div
              v-if="dialogKind === 'enroll'"
              class="space-y-4"
            >
              <div
                v-if="!application?.nis"
                class="space-y-2"
              >
                <Label :for="`${dialogId}-nis`">NIS</Label>
                <Input
                  :id="`${dialogId}-nis`"
                  v-model="enrollForm.nis"
                />
              </div>
              <div
                v-if="!application?.nisn"
                class="space-y-2"
              >
                <Label :for="`${dialogId}-nisn`">NISN</Label>
                <Input
                  :id="`${dialogId}-nisn`"
                  v-model="enrollForm.nisn"
                />
              </div>
              <p
                v-if="application?.nis && application?.nisn"
                class="text-[length:var(--text-control,0.75rem)]"
              >
                NIS {{ application.nis }} dan NISN
                {{ application.nisn }} dipakai untuk membuat akun santri.
              </p>
            </div>
            <div
              v-else
              class="space-y-2"
            >
              <FloatingLabelField
                :label="
                  dialogKind === 'accept'
                    ? 'Catatan (opsional)'
                    : ['reject', 'reject-doc', 'reject-payment'].includes(
                          dialogKind ?? '',
                        )
                      ? 'Alasan Penolakan'
                      : 'Catatan Revisi'
                "
                :for="`${dialogId}-note`"
                floating
              >
                <Textarea
                  :id="`${dialogId}-note`"
                  v-model="dialogNote"
                  rows="4"
                  maxlength="500"
                  placeholder=" "
                />
              </FloatingLabelField>
            </div>
          </div>

          <DialogFooter
            standard
            class="justify-between"
          >
            <Button
              type="button"
              variant="outline"
              :disabled="acting"
              @click="dialogKind = null"
            >
              Batal
            </Button>
            <Button
              type="submit"
              :variant="
                ['reject', 'reject-doc', 'reject-payment'].includes(
                  dialogKind ?? '',
                )
                  ? 'destructive'
                  : 'default'
              "
              :disabled="acting"
            >
              {{
                acting
                  ? 'Memproses…'
                  : ['reject', 'reject-doc', 'reject-payment'].includes(
                        dialogKind ?? '',
                      )
                    ? 'Tolak'
                    : 'Konfirmasi'
              }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>

  <div
    v-else
    class="p-6"
  >
    <p class="text-[length:var(--text-control,0.75rem)] text-muted-foreground">
      Data pendaftar belum tersedia.
    </p>
    <Button
      variant="outline"
      class="mt-3"
      @click="router.push('/admin/applicants')"
    >
      Kembali
    </Button>
  </div>

  <FilePreviewDialog
    v-model:open="preview.open.value"
    :file="preview.file.value"
  />
</template>
