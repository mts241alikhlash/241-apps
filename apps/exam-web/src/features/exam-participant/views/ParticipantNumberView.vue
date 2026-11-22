<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { toast } from 'vue-sonner'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { Hash } from '@lucide/vue'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import {
  examEventService,
  type CandidateStudent,
} from '@/features/exam-event/services/examEventService'
import { participantNumberService } from '../services/participantNumberService'
import type { IssueParticipantNumbersResult } from '../api/participantNumberApi'

type Row = CandidateStudent & { number: string | null }

const semesterId = ref('')
const candidates = ref<CandidateStudent[]>([])
const numbers = ref(new Map<string, string>())
const loading = ref(false)
const issuing = ref(false)
const search = ref('')
const page = ref(1)
const pageSize = ref(25)
const lastIssue = ref<IssueParticipantNumbersResult | null>(null)

let requestId = 0

const rows = computed<Row[]>(() =>
  candidates.value.map((row) => ({
    ...row,
    number: numbers.value.get(row.studentId) ?? null,
  })),
)

const issuedCount = computed(
  () => rows.value.filter((row) => row.number !== null).length,
)

const filteredRows = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  if (!keyword) return rows.value
  return rows.value.filter(
    (row) =>
      (row.name ?? '').toLocaleLowerCase('id').includes(keyword) ||
      (row.nis ?? '').toLowerCase().includes(keyword),
  )
})

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const skippedNames = computed(() => {
  const byId = new Map(candidates.value.map((row) => [row.studentId, row]))
  return (lastIssue.value?.skipped ?? []).map((id) => {
    const row = byId.get(id)
    return row ? `${row.name ?? '-'} (${row.nis ?? '-'})` : id
  })
})

const columns: ColumnDef<Row>[] = [
  {
    id: 'nis',
    header: 'NIS',
    meta: { align: 'left', mobileLabel: 'NIS' },
    cell: ({ row }) => row.original.nis ?? '-',
  },
  {
    id: 'name',
    header: 'Nama',
    meta: { align: 'left', strong: true, mobileLabel: 'Nama' },
    cell: ({ row }) => row.original.name ?? '-',
  },
  {
    id: 'grade',
    header: 'Tingkat',
    meta: { align: 'center', mobileLabel: 'Tingkat' },
    cell: ({ row }) => row.original.gradeName ?? '-',
  },
  {
    id: 'class',
    header: 'Kelas',
    meta: { align: 'center', mobileLabel: 'Kelas' },
    cell: ({ row }) => row.original.className ?? '-',
  },
  {
    id: 'number',
    header: 'Nomor Peserta',
    meta: {
      align: 'center',
      mobileLabel: 'Nomor Peserta',
      mobileValue: (row: Row) => row.number ?? 'Belum diterbitkan',
    },
    cell: ({ row }) =>
      row.original.number ??
      h(Badge, { variant: 'warning' }, () => 'Belum diterbitkan'),
  },
]

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

async function load(id: string) {
  const current = ++requestId
  loading.value = true
  try {
    const roster = await examEventService.loadCandidates(id)
    const found = await participantNumberService.loadNumbers(
      id,
      roster.map((row) => row.studentId),
    )
    if (current !== requestId) return
    candidates.value = roster
    numbers.value = found
  } catch (err: unknown) {
    if (current !== requestId) return
    candidates.value = []
    numbers.value = new Map()
    toast.error(getIndonesianErrorMessage(err, 'Gagal memuat nomor peserta.'))
  } finally {
    if (current === requestId) loading.value = false
  }
}

async function issue() {
  if (!semesterId.value || issuing.value) return
  issuing.value = true
  try {
    const result = await participantNumberService.issue(semesterId.value)
    lastIssue.value = result
    toast.success(`${result.issued} nomor peserta diterbitkan.`)
    await load(semesterId.value)
  } catch (err: unknown) {
    toast.error(getIndonesianErrorMessage(err, 'Gagal menerbitkan nomor.'))
  } finally {
    issuing.value = false
  }
}

watch(semesterId, (id) => {
  page.value = 1
  lastIssue.value = null
  if (id) void load(id)
  else {
    candidates.value = []
    numbers.value = new Map()
  }
})

watch(search, () => {
  page.value = 1
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Nomor Peserta</CardTitle>
        <Button
          class="shrink-0"
          :disabled="!semesterId || issuing"
          @click="issue"
        >
          <Hash class="size-4" />
          {{ issuing ? 'Menerbitkan...' : 'Terbitkan nomor' }}
        </Button>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <dl
          class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
        >
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Terdaftar</dt>
            <dd class="font-medium">{{ rows.length }}</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Sudah bernomor</dt>
            <dd class="font-medium">{{ issuedCount }}</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Belum bernomor</dt>
            <dd
              :class="[
                'font-medium',
                rows.length - issuedCount > 0 && 'text-warning',
              ]"
            >
              {{ rows.length - issuedCount }}
            </dd>
          </div>
        </dl>
        <Alert
          v-if="lastIssue && skippedNames.length"
          variant="destructive"
        >
          <AlertTitle>
            {{ skippedNames.length }} siswa dilewati karena belum memiliki
            tingkat kelas
          </AlertTitle>
          <AlertDescription>
            {{ skippedNames.join(', ') }}
          </AlertDescription>
        </Alert>
        <DataTable
          mobile="cards"
          :columns="columns"
          :data="pagedRows"
          :page="page"
          :page-size="pageSize"
          :total-items="filteredRows.length"
          :is-loading="loading"
          item-label="siswa"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <AcademicPeriodFilter v-model:semester-id="semesterId" />
          </template>
          <template #header-right>
            <SearchInput
              v-model="search"
              class="sm:w-40"
              label="Cari nama atau NIS"
            />
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-model="search"
              label="Cari nama atau NIS"
              class="w-full"
            />
          </template>
          <template #empty>
            <div class="space-y-3 text-center">
              <p>
                {{
                  search
                    ? 'Tidak ada siswa yang cocok dengan pencarian.'
                    : 'Belum ada siswa terdaftar pada semester ini.'
                }}
              </p>
              <Button
                v-if="search"
                variant="outline"
                @click="search = ''"
              >
                Atur Ulang
              </Button>
            </div>
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
