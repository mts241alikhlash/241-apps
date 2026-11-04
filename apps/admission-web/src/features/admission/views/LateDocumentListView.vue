<script setup lang="ts">
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardContent, CardDescription } from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useRoleGuard } from '@/features/platform/auth'
import FilePreviewDialog from '../components/FilePreviewDialog.vue'
import LateDocumentDecisionDialog from '../components/LateDocumentDecisionDialog.vue'
import LateDocumentUploadDialog from '../components/LateDocumentUploadDialog.vue'
import { useFilePreview } from '../composables/useFilePreview'
import { applicationService } from '../services/applicationService'
import { documentTypeService } from '../services/documentTypeService'
import { lateDocumentService } from '../services/lateDocumentService'
import { useApplicationStore } from '../stores/applicationStore'
import type {
  AdmissionDocumentTypeAdmin,
  LateDocumentList,
  LateDocumentRow,
  LateDocumentStateFilter,
} from '../types'
import { formatJakartaDate, jakartaDaysUntil } from '../utils'

const { can } = useRoleGuard()
const preview = useFilePreview()
const canUpload = computed(() => can('admission-late-documents.upload'))
const canVerify = computed(() => can('admission-late-documents.verify'))
const { waves } = storeToRefs(useApplicationStore())

const STATE_LABELS: Record<LateDocumentRow['state'], string> = {
  MISSING: 'Belum diunggah',
  PENDING: 'Menunggu pemeriksaan',
  REJECTED: 'Ditolak',
  APPROVED: 'Lengkap',
}

const STATE_FILTERS: { value: LateDocumentStateFilter; label: string }[] = [
  { value: 'OPEN', label: 'Belum lengkap' },
  { value: 'MISSING', label: 'Belum diunggah' },
  { value: 'PENDING', label: 'Menunggu pemeriksaan' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'APPROVED', label: 'Lengkap' },
]

const URGENCY_ROW_CLASS: Record<LateDocumentRow['urgency'], string> = {
  ON_TIME: '',
  LATE: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30',
  OVERDUE: 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
}

const URGENCY_TEXT_CLASS: Record<LateDocumentRow['urgency'], string> = {
  ON_TIME: '',
  LATE: 'text-amber-700 dark:text-amber-400',
  OVERDUE: 'text-red-700 dark:text-red-400',
}

const BADGE_URGENCY_CLASS: Record<LateDocumentRow['urgency'], string> = {
  ON_TIME: '',
  LATE: 'border-amber-400 text-amber-700 dark:text-amber-400',
  OVERDUE: '',
}

function stateVariant(row: LateDocumentRow) {
  if (row.state === 'APPROVED') return 'default'
  return row.urgency === 'OVERDUE' ? 'destructive' : 'outline'
}

function gradeText(row: LateDocumentRow) {
  const grade = row.gradeLevel ? ` · Kelas ${row.gradeLevel}` : ''
  return `${row.registrationNumber} · ${row.waveName}${grade}`
}

const stateFilter = ref<LateDocumentStateFilter>('OPEN')
const typeFilter = ref('ALL')
const waveFilter = ref('ALL')
const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const stateFilterId = useId()
const typeFilterId = useId()
const waveFilterId = useId()

const rows = ref<LateDocumentRow[]>([])
const total = ref(0)
const year = ref<LateDocumentList['meta']['year']>(null)
const datesMissing = ref<LateDocumentList['meta']['datesMissing']>([])
const counts = ref({ onTime: 0, late: 0, overdue: 0, complete: 0 })
const lateTypes = ref<AdmissionDocumentTypeAdmin[]>([])
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const listError = ref<string | null>(null)
let latestRequest = 0

const uploadRow = ref<LateDocumentRow | null>(null)
const decideRow = ref<LateDocumentRow | null>(null)
const acting = ref(false)

const datesNotice = computed(() => {
  const start = datesMissing.value.includes('start')
  const end = datesMissing.value.includes('end')
  if (start && end) {
    return 'Tanggal awal dan akhir semester belum diisi di Akademik, penanda warna belum tersedia.'
  }
  return start
    ? 'Tanggal awal semester belum diisi di Akademik, penanda warna belum tersedia.'
    : 'Tanggal akhir semester belum diisi di Akademik, penanda merah belum tersedia.'
})

const tiles = computed(() => [
  {
    key: 'onTime',
    label: 'Belum jatuh tempo',
    value: counts.value.onTime,
    class: '',
  },
  {
    key: 'late',
    label: 'Lewat batas jenis berkas',
    value: counts.value.late,
    class: URGENCY_ROW_CLASS.LATE,
  },
  {
    key: 'overdue',
    label: 'Lewat akhir semester awal',
    value: counts.value.overdue,
    class: URGENCY_ROW_CLASS.OVERDUE,
  },
  {
    key: 'complete',
    label: 'Sudah lengkap',
    value: counts.value.complete,
    class:
      'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
  },
])

function limitNote(row: LateDocumentRow) {
  if (!row.limitDate) return null
  const days = jakartaDaysUntil(row.limitDate)
  if (days > 0) return `${days} hari lagi`
  if (days === 0) return 'hari ini'
  return `lewat ${-days} hari`
}

async function load(resetPage = true) {
  if (resetPage) page.value = 1
  const request = ++latestRequest
  loading.value = true
  const result = await lateDocumentService.fetchList({
    page: page.value,
    limit: pageSize.value,
    state: stateFilter.value,
    search: debouncedSearch.value.trim() || undefined,
    documentTypeId: typeFilter.value === 'ALL' ? undefined : typeFilter.value,
    waveId: waveFilter.value === 'ALL' ? undefined : waveFilter.value,
  })
  if (request !== latestRequest) return
  loading.value = false
  if ('error' in result) {
    listError.value = result.error
    rows.value = []
    return
  }
  listError.value = null
  total.value = result.total
  year.value = result.year
  datesMissing.value = result.datesMissing
  counts.value = result.counts
  const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value))
  if (page.value > lastPage) {
    page.value = lastPage
    await load(false)
    return
  }
  rows.value = result.rows
}

function goToPage(next: number) {
  page.value = next
  void load(false)
}

function changePageSize(size: number) {
  pageSize.value = size
  void load()
}

function openFile(row: LateDocumentRow) {
  if (!row.fileId) return
  preview.show({
    id: row.fileId,
    originalName: row.fileName ?? row.documentTypeName,
    mimeType: row.fileMimeType ?? '',
  })
}

async function upload(file: File) {
  const row = uploadRow.value
  if (!row) return
  acting.value = true
  const result = await lateDocumentService.upload(
    row.applicationId,
    row.documentTypeId,
    file,
  )
  acting.value = false
  if (!result.success) return
  uploadRow.value = null
  await load(false)
}

async function decide(status: 'APPROVED' | 'REJECTED', note?: string) {
  const row = decideRow.value
  if (!row?.documentId) return
  acting.value = true
  const result = await lateDocumentService.decide(
    row.applicationId,
    row.documentId,
    status,
    note,
  )
  acting.value = false
  if (!result.success) return
  decideRow.value = null
  await load(false)
}

watch([stateFilter, typeFilter, waveFilter, debouncedSearch], () => load())

const canUploadRow = (row: LateDocumentRow) =>
  canUpload.value && (row.state === 'MISSING' || row.state === 'REJECTED')
const canDecideRow = (row: LateDocumentRow) =>
  canVerify.value && row.state === 'PENDING'

const columns = computed<ColumnDef<LateDocumentRow>[]>(() => [
  {
    id: 'applicant',
    header: 'Pendaftar',
    meta: { align: 'left', strong: true },
    cell: ({ row }) =>
      h('div', { class: 'min-w-0' }, [
        h('p', {}, row.original.applicantName),
        h(
          'p',
          { class: 'text-xs text-muted-foreground' },
          gradeText(row.original),
        ),
      ]),
  },
  {
    id: 'document',
    header: 'Berkas',
    meta: { align: 'left' },
    cell: ({ row }) =>
      h('div', { class: 'min-w-0' }, [
        h('p', row.original.documentTypeName),
        row.original.note
          ? h(
              'p',
              { class: 'text-xs text-muted-foreground' },
              `Catatan: ${row.original.note}`,
            )
          : null,
      ]),
  },
  {
    id: 'limit',
    header: 'Batas',
    meta: { align: 'center' },
    cell: ({ row }) =>
      row.original.limitDate
        ? h('div', { class: URGENCY_TEXT_CLASS[row.original.urgency] }, [
            h('p', formatJakartaDate(row.original.limitDate)),
            h('p', { class: 'text-xs' }, limitNote(row.original) ?? ''),
          ])
        : h(
            'p',
            { class: URGENCY_TEXT_CLASS[row.original.urgency] },
            row.original.urgency === 'OVERDUE' ? 'Lewat akhir semester' : '-',
          ),
  },
  {
    id: 'state',
    header: 'Status',
    meta: {
      align: 'center',
      mobileValue: (row: LateDocumentRow) => STATE_LABELS[row.state],
    },
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: stateVariant(row.original),
          class: BADGE_URGENCY_CLASS[row.original.urgency],
        },
        () => STATE_LABELS[row.original.state],
      ),
  },
  {
    id: 'actions',
    header: 'Aksi',
    size: 60,
    meta: { align: 'center' },
    enableSorting: false,
    cell: ({ row }) => {
      const item = row.original
      const actions =
        Number(!!item.fileId) +
        Number(canDecideRow(item)) +
        Number(canUploadRow(item))
      if (actions === 0) return null
      if (actions === 1) {
        const [label, run] = canDecideRow(item)
          ? ['Periksa', () => (decideRow.value = item)]
          : canUploadRow(item)
            ? ['Unggah', () => (uploadRow.value = item)]
            : ['Lihat berkas', () => openFile(item)]
        return h(
          Button,
          { variant: 'outline', size: 'sm', onClick: run },
          () => label,
        )
      }
      return h(ActionCell, {
        viewLabel: item.fileId ? 'Lihat berkas' : undefined,
        manageLabel: canDecideRow(item) ? 'Periksa' : undefined,
        editLabel: canUploadRow(item) ? 'Unggah' : undefined,
        hideEdit: !canUploadRow(item),
        hideDelete: true,
        onView: () => openFile(item),
        onManage: () => (decideRow.value = item),
        onEdit: () => (uploadRow.value = item),
      })
    },
  },
])

onMounted(async () => {
  const [typeResult] = await Promise.all([
    documentTypeService.fetchAll(),
    applicationService.fetchWaves(),
  ])
  if ('types' in typeResult) {
    lateTypes.value = typeResult.types.filter(
      (type) => type.requirement === 'LATER',
    )
  }
  await load()
})
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardContent
        variant="standard"
        class="space-y-4"
      >
        <CardDescription v-if="year">
          Tahun ajaran {{ year.name ?? '-' }}
        </CardDescription>

        <Alert v-if="datesMissing.length">
          <AlertDescription>
            {{ datesNotice }}
          </AlertDescription>
        </Alert>

        <div
          class="grid grid-cols-2 gap-3 lg:grid-cols-4"
          data-test="counts"
        >
          <div
            v-for="tile in tiles"
            :key="tile.key"
            :data-test="`count-${tile.key}`"
            class="rounded-lg border p-3"
            :class="tile.class"
          >
            <p class="text-2xl font-medium">{{ tile.value }}</p>
            <p class="text-xs text-muted-foreground">{{ tile.label }}</p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FloatingLabelField
            label="Status"
            :for="stateFilterId"
            floating
          >
            <Select v-model="stateFilter">
              <SelectTrigger
                :id="stateFilterId"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in STATE_FILTERS"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            label="Jenis berkas"
            :for="typeFilterId"
            floating
          >
            <Select v-model="typeFilter">
              <SelectTrigger
                :id="typeFilterId"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem
                  v-for="type in lateTypes"
                  :key="type.id"
                  :value="type.id"
                >
                  {{ type.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            label="Gelombang"
            :for="waveFilterId"
            floating
          >
            <Select v-model="waveFilter">
              <SelectTrigger
                :id="waveFilterId"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem
                  v-for="wave in waves"
                  :key="wave.id"
                  :value="wave.id"
                >
                  {{ wave.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <SearchInput
            v-model="search"
            label="Cari nama atau no. pendaftaran"
          />
        </div>

        <div
          v-if="listError"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">
            {{ listError }}
          </p>
          <Button
            variant="outline"
            @click="load()"
          >
            Coba lagi
          </Button>
        </div>
        <template v-else>
          <p
            v-if="loading && !rows.length"
            class="text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Memuat berkas susulan…
          </p>
          <p
            v-else-if="!rows.length"
            class="rounded-md border p-4 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Tidak ada berkas susulan.
          </p>
          <template v-else>
            <DataTable
              mobile="cards"
              :columns="columns"
              :data="rows"
              :page="page"
              :page-size="pageSize"
              :total-items="total"
              :is-loading="loading"
              item-label="berkas"
              @update:page="goToPage"
              @update:page-size="changePageSize"
            />
          </template>
        </template>
      </CardContent>
    </Card>

    <LateDocumentUploadDialog
      v-model:row="uploadRow"
      :saving="acting"
      @upload="upload"
    />
    <LateDocumentDecisionDialog
      v-model:row="decideRow"
      :saving="acting"
      @approve="decide('APPROVED')"
      @reject="decide('REJECTED', $event)"
      @open-file="decideRow && openFile(decideRow)"
    />
    <FilePreviewDialog
      v-model:open="preview.open.value"
      :file="preview.file.value"
    />
  </div>
</template>
