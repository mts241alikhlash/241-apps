<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

const PAGE_SIZE = 20

const semesterId = ref('')
const candidates = ref<CandidateStudent[]>([])
const numbers = ref(new Map<string, string>())
const loading = ref(false)
const issuing = ref(false)
const search = ref('')
const page = ref(1)
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
  const start = (page.value - 1) * PAGE_SIZE
  return filteredRows.value.slice(start, start + PAGE_SIZE)
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
    id: 'classroom',
    header: 'Kelas',
    meta: { align: 'left', mobileLabel: 'Kelas' },
    cell: ({ row }) => row.original.classroomName ?? '-',
  },
  {
    id: 'number',
    header: 'Nomor Peserta',
    meta: { align: 'left', mobileLabel: 'Nomor Peserta' },
    cell: ({ row }) => row.original.number ?? 'Belum diterbitkan',
  },
]

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
        class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-4 pb-4 pt-2"
      >
        <div class="flex flex-wrap items-end gap-2">
          <AcademicPeriodFilter v-model:semester-id="semesterId" />
          <SearchInput
            v-model="search"
            label="Cari nama atau NIS"
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge variant="outline">Terdaftar {{ rows.length }}</Badge>
          <Badge variant="outline">Sudah bernomor {{ issuedCount }}</Badge>
          <Badge variant="outline">
            Belum bernomor {{ rows.length - issuedCount }}
          </Badge>
        </div>
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
          :page-size="PAGE_SIZE"
          :total-items="filteredRows.length"
          :is-loading="loading"
          item-label="siswa"
          @update:page="page = $event"
        >
          <template #empty>
            <p>Belum ada siswa terdaftar pada semester ini.</p>
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
