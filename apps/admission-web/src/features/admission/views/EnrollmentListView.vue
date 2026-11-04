<script setup lang="ts">
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { refDebounced } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import { Input } from '@mts241alikhlash/ui/input'
import { Card, CardContent, CardHeader } from '@mts241alikhlash/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@mts241alikhlash/ui/tabs'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { useRoleGuard } from '@/features/platform/auth'
import StatusBadge from '../components/StatusBadge.vue'
import { applicationService } from '../services/applicationService'
import { enrollmentService } from '../services/enrollmentService'
import { publicAdmissionService } from '../services/publicAdmissionService'
import { useApplicationStore } from '../stores/applicationStore'
import {
  ADMISSION_TYPE_LABELS,
  type AdmissionEnrollmentRow,
  type AdmissionGrade,
  type AdmissionNisPreview,
  type AdmissionType,
  type EnrollmentTab,
} from '../types'

const { can } = useRoleGuard()
const router = useRouter()
const canProcess = computed(() => can('admission-enrollments.process'))
const canCompose = computed(() => can('admission-enrollments.nis'))
const { waves } = storeToRefs(useApplicationStore())

const tab = ref<EnrollmentTab>('ready')
const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const waveFilter = ref('ALL')
const waveFilterId = useId()
const rows = ref<AdmissionEnrollmentRow[]>([])
const total = ref(0)
const counts = ref({ ready: 0, held: 0, done: 0 })
const years = ref<
  {
    academicYearId: string
    academicYearName: string | null
    locked: boolean
    lockedAt: string | null
  }[]
>([])
const yearId = ref('')
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
let latestRequest = 0
const listError = ref<string | null>(null)

const grades = ref<AdmissionGrade[]>([])
const selected = ref<string[]>([])
const nisnInput = ref<Record<string, string>>({})
const processOpen = ref(false)
const processResult = ref<{
  enrolled: number
  problems: { name: string; reason: string }[]
} | null>(null)
const acting = ref(false)

const placementRow = ref<AdmissionEnrollmentRow | null>(null)
const placementType = ref('')
const placementGrade = ref('')
const placementError = ref('')

const nisOpen = ref(false)
const nisPreview = ref<AdmissionNisPreview | null>(null)
const nisError = ref('')
const nisLoading = ref(false)
const lockOpen = ref(false)
const nisManageOpen = ref(false)
const syncPending = ref(0)
const MAX_PROCESS = 50
const nisnError = ref('')
const NISN_PATTERN = /^\d{10}$/

const TABS: {
  value: EnrollmentTab
  label: string
  count: () => number
  empty: string
}[] = [
  {
    value: 'ready',
    label: 'Siap diproses',
    count: () => counts.value.ready,
    empty: 'Tidak ada pendaftar yang siap diproses.',
  },
  {
    value: 'held',
    label: 'Tertahan',
    count: () => counts.value.held,
    empty: 'Tidak ada pendaftar yang tertahan.',
  },
  {
    value: 'done',
    label: 'Selesai',
    count: () => counts.value.done,
    empty: 'Belum ada pendaftar yang menjadi santri.',
  },
]

const emptyText = computed(
  () => TABS.find((item) => item.value === tab.value)?.empty ?? '',
)
const currentYear = computed(() =>
  years.value.find((year) => year.academicYearId === yearId.value),
)
const selectable = computed(() => tab.value !== 'done')
const allSelected = computed(
  () =>
    rows.value.length > 0 &&
    rows.value.every((row) => selected.value.includes(row.applicationId)),
)
const typedNisn = computed(() =>
  selected.value.flatMap((applicationId) => {
    const nisn = nisnInput.value[applicationId]?.trim()
    return nisn ? [{ applicationId, nisn }] : []
  }),
)

function gradeLabel(row: AdmissionEnrollmentRow) {
  const grade = grades.value.find((item) => item.level === row.targetGradeLevel)
  return grade?.name ?? `Kelas ${row.targetGradeLevel}`
}

async function load(resetPage = true) {
  if (resetPage) page.value = 1
  const request = ++latestRequest
  loading.value = true
  const result = await enrollmentService.fetchQueue({
    tab: tab.value,
    search: debouncedSearch.value.trim() || undefined,
    waveId: waveFilter.value === 'ALL' ? undefined : waveFilter.value,
    page: page.value,
    limit: pageSize.value,
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
  counts.value = result.counts
  years.value = result.years
  if (!years.value.some((year) => year.academicYearId === yearId.value)) {
    yearId.value = years.value[0]?.academicYearId ?? ''
  }
  const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value))
  if (page.value > lastPage) {
    page.value = lastPage
    await load(false)
    return
  }
  rows.value = result.rows
  const visible = new Set(rows.value.map((row) => row.applicationId))
  selected.value = selected.value.filter((id) => visible.has(id))
}

function goToPage(next: number) {
  page.value = next
  void load(false)
}

function changePageSize(size: number) {
  pageSize.value = size
  void load()
}

function toggle(applicationId: string, checked: boolean | 'indeterminate') {
  selected.value =
    checked === true
      ? [...new Set([...selected.value, applicationId])]
      : selected.value.filter((id) => id !== applicationId)
}

function toggleAll(checked: boolean | 'indeterminate') {
  selected.value =
    checked === true ? rows.value.map((row) => row.applicationId) : []
}

async function submitProcess() {
  nisnError.value = ''
  if (typedNisn.value.some((item) => !NISN_PATTERN.test(item.nisn))) {
    nisnError.value = 'NISN harus 10 digit angka'
    return
  }
  acting.value = true
  const names = new Map(
    rows.value.map((row) => [row.applicationId, row.applicantName]),
  )
  const result = await enrollmentService.process(
    selected.value,
    typedNisn.value,
  )
  acting.value = false
  if (!result.success) return
  processOpen.value = false
  selected.value = []
  processResult.value = {
    enrolled: result.enrolled,
    problems: result.problems.map((problem) => ({
      name: names.get(problem.applicationId) ?? problem.applicationId,
      reason: problem.reason ?? 'Bermasalah',
    })),
  }
  await load(false)
}

function openPlacement(row: AdmissionEnrollmentRow) {
  placementRow.value = row
  placementType.value = row.admissionType ?? ''
  placementGrade.value =
    grades.value.find((grade) => grade.level === row.targetGradeLevel)?.id ?? ''
  placementError.value = ''
}

async function submitPlacement() {
  const row = placementRow.value
  if (!row) return
  if (!placementType.value || !placementGrade.value) {
    placementError.value = 'Jenis dan tingkat kelas wajib dipilih'
    return
  }
  acting.value = true
  const result = await enrollmentService.setPlacement(
    row.applicationId,
    placementType.value as AdmissionType,
    placementGrade.value,
  )
  acting.value = false
  if (!result.success) return
  placementRow.value = null
  await load(false)
}

async function loadPreview() {
  nisLoading.value = true
  nisError.value = ''
  const result = await enrollmentService.previewNis(yearId.value)
  nisLoading.value = false
  if ('error' in result) {
    nisPreview.value = null
    nisError.value = result.error
    return
  }
  nisPreview.value = result.preview
}

async function openNis() {
  nisManageOpen.value = false
  nisOpen.value = true
  nisPreview.value = null
  await loadPreview()
}

async function submitNis() {
  if (!nisPreview.value) return
  acting.value = true
  const result = await enrollmentService.composeNis(
    yearId.value,
    nisPreview.value.changes,
    false,
  )
  acting.value = false
  if (!result.success) {
    if (result.stale) await loadPreview()
    return
  }
  nisOpen.value = false
  syncPending.value = result.result.failed.length
  await load(false)
}

async function syncStudents() {
  acting.value = true
  const result = await enrollmentService.composeNis(yearId.value, 0, true)
  acting.value = false
  if (result.success) syncPending.value = result.result.failed.length
  await load(false)
}

async function submitLock() {
  acting.value = true
  const result = await enrollmentService.lockNis(yearId.value)
  acting.value = false
  if (!result.success) return
  lockOpen.value = false
  await load(false)
}

watch([tab, debouncedSearch, waveFilter], () => {
  selected.value = []
  processResult.value = null
  void load()
})

const columns = computed<ColumnDef<AdmissionEnrollmentRow>[]>(() => {
  const selectCol: ColumnDef<AdmissionEnrollmentRow>[] =
    canProcess.value && selectable.value
      ? [
          {
            id: 'select',
            header: () =>
              h(
                'div',
                { class: 'flex items-center justify-center' },
                h(Checkbox, {
                  modelValue: allSelected.value,
                  'aria-label': 'Pilih semua',
                  'onUpdate:modelValue': toggleAll,
                }),
              ),
            cell: ({ row }: { row: { original: AdmissionEnrollmentRow } }) =>
              h(
                'div',
                { class: 'flex items-center justify-center' },
                h(Checkbox, {
                  modelValue: selected.value.includes(
                    row.original.applicationId,
                  ),
                  'aria-label': `Pilih ${row.original.applicantName}`,
                  'onUpdate:modelValue': (checked: boolean | 'indeterminate') =>
                    toggle(row.original.applicationId, checked === true),
                }),
              ),
            meta: { align: 'center' },
            enableSorting: false,
          },
        ]
      : []

  const baseCols: ColumnDef<AdmissionEnrollmentRow>[] = [
    {
      accessorKey: 'registrationNumber',
      header: 'No. Pendaftaran',
      meta: { align: 'center' },
    },
    {
      accessorKey: 'applicantName',
      header: 'Nama Pendaftar',
      meta: { align: 'left', strong: true },
      cell: ({ row }) =>
        h(
          'button',
          {
            type: 'button',
            class:
              'text-left font-medium text-foreground hover:text-primary hover:underline transition-colors cursor-pointer',
            onClick: () =>
              router.push(`/admin/applicants/${row.original.applicationId}`),
          },
          row.original.applicantName,
        ),
    },
  ]

  const nisCol: ColumnDef<AdmissionEnrollmentRow>[] = [
    {
      id: 'nis',
      header: 'NIS',
      meta: { align: 'center' },
      cell: ({ row }) => row.original.nis ?? '-',
    },
  ]

  const detailCols: ColumnDef<AdmissionEnrollmentRow>[] = [
    {
      id: 'nisn',
      header: 'NISN',
      meta: { align: 'center' },
      cell: ({ row }) =>
        canProcess.value && selectable.value && !row.original.nisn
          ? h(Input, {
              modelValue: nisnInput.value[row.original.applicationId] ?? '',
              'onUpdate:modelValue': (value: string | number) => {
                nisnInput.value[row.original.applicationId] = String(value)
              },
              'data-test': 'nisn-input',
              inputmode: 'numeric',
              maxlength: 20,
              placeholder: 'Isi NISN',
              'aria-label': `NISN ${row.original.applicantName}`,
              class: 'w-36',
            })
          : (row.original.nisn ?? '-'),
    },
    {
      accessorKey: 'waveName',
      header: 'Gelombang',
      meta: { align: 'center' },
    },
    {
      id: 'admissionType',
      header: 'Jenis',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const text = row.original.admissionType
          ? (ADMISSION_TYPE_LABELS[row.original.admissionType] ??
            row.original.admissionType)
          : '-'
        if (canProcess.value && row.original.status === 'ACCEPTED') {
          return h(
            'button',
            {
              type: 'button',
              class:
                'hover:underline hover:text-primary transition-colors cursor-pointer text-center',
              onClick: () => openPlacement(row.original),
            },
            text,
          )
        }
        return h('span', text)
      },
    },
    {
      id: 'targetGradeLevel',
      header: 'Kelas',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const text = row.original.targetGradeLevel
          ? gradeLabel(row.original)
          : '-'
        if (canProcess.value && row.original.status === 'ACCEPTED') {
          return h(
            'button',
            {
              type: 'button',
              class:
                'hover:underline hover:text-primary transition-colors cursor-pointer text-center',
              onClick: () => openPlacement(row.original),
            },
            text,
          )
        }
        return h('span', text)
      },
    },
    {
      id: 'status',
      header: 'Status',
      meta: { align: 'center' },
      cell: ({ row }) => h(StatusBadge, { status: row.original.status }),
    },
  ]

  const actionCol: ColumnDef<AdmissionEnrollmentRow> = {
    id: 'actions',
    header: 'Aksi',
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        viewLabel: 'Lihat detail',
        editLabel:
          canProcess.value && row.original.status === 'ACCEPTED'
            ? 'Atur jenis dan kelas'
            : undefined,
        hideEdit: !(canProcess.value && row.original.status === 'ACCEPTED'),
        hideDelete: true,
        onView: () =>
          router.push(`/admin/applicants/${row.original.applicationId}`),
        onEdit: () => openPlacement(row.original),
      }),
    enableSorting: false,
  }

  return [...selectCol, ...baseCols, ...nisCol, ...detailCols, actionCol]
})

onMounted(async () => {
  const [, loaded] = await Promise.all([
    applicationService.fetchWaves(),
    publicAdmissionService.fetchGrades(),
  ])
  grades.value = loaded ?? []
  await load()
})
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <div class="space-y-4 p-0 sm:px-0">
        <Tabs
          v-model="tab"
          variant="line"
          class="min-w-0 gap-0"
        >
          <Card gap="none">
            <CardHeader class="p-0 shrink-0">
              <TabsList class="w-full bg-muted/30 px-4 sm:px-6">
                <TabsTrigger
                  v-for="item in TABS"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                  <Badge
                    variant="secondary"
                    class="ml-1.5"
                  >
                    {{ item.count() }}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent
              class="space-y-4 px-4 pt-3 pb-4 sm:px-6 sm:pt-3.5 sm:pb-6"
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
              >
                <FloatingLabelField
                  label="Gelombang"
                  :for="waveFilterId"
                  class="w-full sm:w-48"
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

                <div class="flex flex-wrap items-center gap-2">
                  <SearchInput
                    v-model="search"
                    label="Cari nama atau no. pendaftaran"
                  />
                  <Button
                    v-if="canCompose && currentYear"
                    data-test="open-nis-manage"
                    variant="outline"
                    size="sm"
                    class="font-medium"
                    @click="nisManageOpen = true"
                  >
                    Penomoran NIS
                    <Badge
                      v-if="currentYear.locked"
                      variant="secondary"
                      class="ml-1.5"
                    >
                      Dikunci
                    </Badge>
                    <Badge
                      v-else-if="syncPending > 0"
                      variant="destructive"
                      class="ml-1.5 text-[10px]"
                    >
                      {{ syncPending }} tertunda
                    </Badge>
                  </Button>
                </div>
              </div>

              <div
                v-if="processResult"
                data-test="process-result"
                class="space-y-1 rounded-md border p-3 text-[length:var(--text-control,0.75rem)]"
              >
                <p class="font-medium">
                  {{ processResult.enrolled }} diproses,
                  {{ processResult.problems.length }} bermasalah.
                </p>
                <ul
                  v-if="processResult.problems.length"
                  class="list-disc pl-5"
                >
                  <li
                    v-for="problem in processResult.problems"
                    :key="problem.name + problem.reason"
                  >
                    {{ problem.name }}: {{ problem.reason }}
                  </li>
                </ul>
              </div>

              <div
                v-if="canProcess && selectable && rows.length"
                class="flex flex-wrap items-center justify-between gap-2 md:hidden"
              >
                <label
                  data-test="select-all"
                  class="flex min-h-11 items-center gap-2 text-[length:var(--text-control,0.75rem)] sm:min-h-0"
                >
                  <Checkbox
                    :model-value="allSelected"
                    aria-label="Pilih semua"
                    @update:model-value="toggleAll"
                  />
                  Pilih semua di halaman ini
                </label>
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
                  Memuat antrean daftar ulang…
                </p>
                <p
                  v-else-if="!rows.length"
                  class="rounded-md border p-4 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                >
                  {{ emptyText }}
                </p>
                <template v-else>
                  <DataTable
                    mobile="cards"
                    class="[&_th:has([role=checkbox])]:!px-2 [&_td:has([role=checkbox])]:!px-2"
                    :columns="columns"
                    :data="rows"
                    :page="page"
                    :page-size="pageSize"
                    :total-items="total"
                    :is-loading="loading"
                    item-label="pendaftar"
                    @update:page="goToPage"
                    @update:page-size="changePageSize"
                  />

                  <div
                    v-if="selected.length"
                    data-test="selection-bar"
                    class="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 sm:px-4"
                  >
                    <div class="flex items-center gap-2">
                      <span
                        class="text-[length:var(--text-control,0.75rem)] font-medium"
                        >{{ selected.length }} dipilih</span
                      >
                      <span
                        v-if="selected.length > MAX_PROCESS"
                        class="text-[length:var(--text-control,0.75rem)] text-destructive"
                      >
                        Maksimal {{ MAX_PROCESS }} pendaftar sekali proses
                      </span>
                    </div>
                    <Button
                      :disabled="acting || selected.length > MAX_PROCESS"
                      @click="processOpen = true"
                    >
                      Proses jadi santri
                    </Button>
                  </div>
                </template>
              </template>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </Card>

    <Dialog
      :open="processOpen"
      @update:open="(isOpen) => (processOpen = isOpen)"
    >
      <DialogContent size="md">
        <form
          data-test="process-form"
          class="flex flex-1 flex-col justify-between"
          @submit.prevent="submitProcess"
        >
          <DialogHeader standard>
            <DialogTitle>Proses jadi santri</DialogTitle>
            <DialogDescription class="sr-only">
              {{ selected.length }} pendaftar akan diproses menjadi santri dan
              akunnya menjadi akun santri.
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 px-6 py-5">
            <div
              class="space-y-1 rounded-lg border bg-muted/10 p-3 text-[length:var(--text-control,0.75rem)]"
            >
              <p class="font-medium text-foreground">
                {{ selected.length }} pendaftar dipilih
              </p>
              <p class="text-muted-foreground">
                Semua pendaftar terpilih akan diproses menjadi santri dan
                akunnya otomatis menjadi akun santri.
              </p>
            </div>
            <p
              v-if="nisnError"
              role="alert"
              class="text-[length:var(--text-control,0.75rem)] text-destructive"
            >
              {{ nisnError }}
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
              @click="processOpen = false"
            >
              Batal
            </Button>
            <Button
              type="submit"
              :disabled="acting"
            >
              {{ acting ? 'Memproses…' : 'Proses jadi santri' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog
      :open="placementRow !== null"
      @update:open="(isOpen) => !isOpen && (placementRow = null)"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Jenis dan tingkat kelas</DialogTitle>
          <DialogDescription>
            {{ placementRow?.applicantName }}. Tingkat kelas menentukan dua
            digit tengah NIS.
          </DialogDescription>
        </DialogHeader>
        <form
          data-test="placement-form"
          class="flex min-h-0 flex-1 flex-col"
          @submit.prevent="submitPlacement"
        >
          <DialogBody class="space-y-3">
            <Select v-model="placementType">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Jenis pendaftaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="(label, type) in ADMISSION_TYPE_LABELS"
                  :key="type"
                  :value="type"
                >
                  {{ label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="placementGrade">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Tingkat kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="grade in grades"
                  :key="grade.id"
                  :value="grade.id"
                >
                  {{ grade.name ?? `Kelas ${grade.level}` }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p
              v-if="placementError"
              class="text-[length:var(--text-control,0.75rem)] text-destructive"
            >
              {{ placementError }}
            </p>
          </DialogBody>
          <DialogFooter
            standard
            class="justify-between"
          >
            <Button
              type="button"
              variant="outline"
              :disabled="acting"
              @click="placementRow = null"
            >
              Batal
            </Button>
            <Button
              type="submit"
              :disabled="acting"
            >
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog
      :open="nisOpen"
      @update:open="(isOpen) => (nisOpen = isOpen)"
    >
      <DialogContent
        data-test="nis-dialog"
        size="md"
      >
        <DialogHeader standard>
          <DialogTitle>Susun NIS</DialogTitle>
          <DialogDescription>
            Urutan abjad menurut nama, satu urutan untuk seluruh tingkat kelas
            di tahun ajaran ini.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p
            v-if="nisLoading"
            class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Memuat pratinjau…
          </p>
          <p
            v-else-if="nisError"
            role="alert"
            class="text-[length:var(--text-control,0.75rem)] text-destructive"
          >
            {{ nisError }}
          </p>
          <div
            v-else-if="nisPreview"
            class="space-y-3 text-[length:var(--text-control,0.75rem)]"
          >
            <p>
              <strong>{{ nisPreview.changes }} NIS berubah</strong>,
              {{ nisPreview.created }} NIS baru.
            </p>
            <ul
              v-if="nisPreview.rows.length"
              class="max-h-48 list-disc space-y-1 overflow-y-auto pl-5"
            >
              <li
                v-for="item in nisPreview.rows"
                :key="item.applicationId"
              >
                {{ item.applicantName }}:
                <template v-if="item.previous">
                  {{ item.previous }} → {{ item.nis }}
                </template>
                <template v-else>{{ item.nis }} (baru)</template>
              </li>
            </ul>
            <div v-if="nisPreview.skipped.length">
              <p class="font-medium">Dilewati</p>
              <ul class="list-disc pl-5">
                <li
                  v-for="item in nisPreview.skipped"
                  :key="item.applicationId"
                >
                  {{ item.applicantName }}: {{ item.reason }}
                </li>
              </ul>
            </div>
          </div>
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="acting"
            @click="nisOpen = false"
          >
            Batal
          </Button>
          <Button
            type="button"
            :disabled="acting || nisLoading || !nisPreview"
            @click="submitNis"
          >
            {{ acting ? 'Menyusun…' : 'Susun' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      :open="lockOpen"
      @update:open="(isOpen) => (lockOpen = isOpen)"
    >
      <DialogContent
        data-test="lock-dialog"
        size="md"
      >
        <DialogHeader standard>
          <DialogTitle>Kunci NIS</DialogTitle>
          <DialogDescription>
            Setelah dikunci, NIS tahun ajaran ini tidak bisa disusun ulang dan
            pendaftar yang diterima kemudian mendapat nomor berikutnya. Ini
            tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="acting"
            @click="lockOpen = false"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            :disabled="acting"
            @click="submitLock"
          >
            Kunci
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      v-if="canCompose && currentYear"
      :open="nisManageOpen"
      @update:open="(isOpen) => (nisManageOpen = isOpen)"
    >
      <DialogContent
        data-test="nis-panel"
        size="md"
      >
        <DialogHeader standard>
          <div class="flex items-center justify-between gap-2">
            <DialogTitle>Penomoran NIS</DialogTitle>
            <Badge
              v-if="currentYear.locked"
              variant="secondary"
            >
              NIS dikunci
            </Badge>
          </div>
          <DialogDescription class="text-xs text-muted-foreground">
            Kelola penomoran induk santri (NIS) tahun ajaran dan status
            sinkronisasi.
          </DialogDescription>
        </DialogHeader>

        <div
          class="space-y-4 px-6 py-5 text-[length:var(--text-control,0.75rem)]"
        >
          <div class="space-y-1.5">
            <p class="font-medium text-foreground">
              NIS tahun ajaran {{ currentYear.academicYearName ?? '-' }}
            </p>
            <div
              v-if="years.length > 1"
              class="w-full pt-1"
            >
              <Select v-model="yearId">
                <SelectTrigger class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="year in years"
                    :key="year.academicYearId"
                    :value="year.academicYearId"
                  >
                    {{ year.academicYearName ?? year.academicYearId }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            v-if="syncPending > 0"
            class="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
          >
            <p class="font-medium">
              {{ syncPending }} santri belum diperbarui NIS-nya.
            </p>
            <p class="mt-0.5">
              Lakukan sinkronkan ulang agar nomor NIS tersimpan di data santri
              aktif.
            </p>
          </div>

          <div
            class="rounded-lg border bg-muted/10 p-3.5 text-xs text-muted-foreground space-y-1"
          >
            <p class="font-medium text-foreground">Format Penomoran:</p>
            <p>
              Tahun Ajaran (4 digit: misal 2627) + Tingkat (2 digit) + No. Urut
              alfabetis (3 digit).
            </p>
            <p
              v-if="currentYear.locked"
              class="pt-1 font-medium text-amber-600 dark:text-amber-400"
            >
              Tahun ajaran ini sudah dikunci. Pendaftar baru yang diterima
              setelah kunci akan melanjutkan nomor urut tertinggi.
            </p>
          </div>
        </div>

        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            type="button"
            variant="outline"
            @click="nisManageOpen = false"
          >
            Tutup
          </Button>

          <div class="flex flex-wrap items-center justify-end gap-2">
            <Button
              v-if="counts.done > 0 || syncPending > 0"
              variant="outline"
              class="min-h-11 sm:min-h-0"
              :disabled="acting"
              @click="syncStudents"
            >
              Sinkronkan ulang
            </Button>
            <Button
              v-if="!currentYear.locked"
              variant="outline"
              :disabled="acting"
              @click="
                () => {
                  nisManageOpen = false
                  lockOpen = true
                }
              "
            >
              Kunci NIS
            </Button>
            <Button
              :disabled="acting"
              @click="openNis"
            >
              Susun NIS
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
