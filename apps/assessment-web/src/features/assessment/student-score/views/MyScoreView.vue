<script setup lang="ts">
import { DataTable, DataTableEmpty, SearchInput } from '@mts241alikhlash/ui'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { computed, h, onMounted, ref, watch } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Badge } from '@mts241alikhlash/ui/badge'
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { studentScoreApi } from '../api/studentScoreApi'
import type { StudentScoreItem } from '../types'

const rows = ref<StudentScoreItem[]>([])
const loading = ref(false)
const search = ref('')
const page = ref(1)
const pageSize = ref(25)

const TYPE_LABELS: Record<string, string> = {
  DAILY: 'Harian',
  MIDTERM: 'UTS',
  FINAL: 'UAS',
  ASSIGNMENT: 'Tugas',
  PRACTICAL: 'Praktik',
}

const TYPE_ORDER: Record<string, number> = {
  DAILY: 1,
  ASSIGNMENT: 2,
  PRACTICAL: 3,
  MIDTERM: 4,
  FINAL: 5,
}

const sortedRows = computed(() => {
  return [...rows.value].sort((a, b) => {
    const subjectA = a.assessmentItem?.teachingAssignment?.subject?.name ?? ''
    const subjectB = b.assessmentItem?.teachingAssignment?.subject?.name ?? ''
    const compareSubject = subjectA.localeCompare(subjectB, 'id')
    if (compareSubject !== 0) return compareSubject

    const typeA = a.assessmentItem?.type ?? ''
    const typeB = b.assessmentItem?.type ?? ''
    const orderA = TYPE_ORDER[typeA] ?? 99
    const orderB = TYPE_ORDER[typeB] ?? 99
    if (orderA !== orderB) return orderA - orderB

    const itemA = a.assessmentItem?.name ?? ''
    const itemB = b.assessmentItem?.name ?? ''
    return itemA.localeCompare(itemB, 'id')
  })
})

const filteredRows = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  if (!keyword) return sortedRows.value
  return sortedRows.value.filter((row) => {
    const subject = row.assessmentItem?.teachingAssignment?.subject?.name ?? ''
    const assessment = row.assessmentItem?.name ?? ''
    const teacher =
      row.assessmentItem?.teachingAssignment?.employee?.user?.profile?.name ??
      ''
    return [subject, assessment, teacher].some((value) =>
      value.toLocaleLowerCase('id').includes(keyword),
    )
  })
})

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const typeText = (row: StudentScoreItem) => {
  const type = row.assessmentItem?.type
  return type ? (TYPE_LABELS[type] ?? type) : '-'
}

const scoreText = (row: StudentScoreItem) =>
  row.score === null || row.score === undefined
    ? 'Belum dinilai'
    : String(row.score)

const columns: ColumnDef<StudentScoreItem>[] = [
  {
    id: 'subject',
    header: 'Mata Pelajaran',
    meta: { align: 'left', strong: true, mobileLabel: 'Mata Pelajaran' },
    cell: ({ row }) =>
      row.original.assessmentItem?.teachingAssignment?.subject?.name ?? '-',
  },
  {
    id: 'employee',
    header: 'Guru Pengampu',
    meta: {
      align: 'left',
      mobileLabel: 'Guru Pengampu',
      mobileValue: (row: StudentScoreItem) =>
        row.assessmentItem?.teachingAssignment?.employee?.user?.profile?.name ??
        '-',
    },
    cell: ({ row }) =>
      row.original.assessmentItem?.teachingAssignment?.employee?.user?.profile
        ?.name ?? '-',
  },
  {
    id: 'assessment',
    header: 'Penilaian',
    meta: {
      align: 'left',
      mobileLabel: 'Penilaian',
      mobileValue: (row: StudentScoreItem) => row.assessmentItem?.name ?? '-',
    },
    cell: ({ row }) => row.original.assessmentItem?.name ?? '-',
  },
  {
    id: 'type',
    header: 'Jenis',
    meta: {
      align: 'center',
      mobileLabel: 'Jenis',
      mobileValue: typeText,
    },
    cell: ({ row }) => {
      const type = row.original.assessmentItem?.type
      if (!type) return '-'
      return h(Badge, { variant: 'secondary' }, () => TYPE_LABELS[type] ?? type)
    },
  },
  {
    accessorKey: 'score',
    header: 'Nilai',
    meta: {
      align: 'center',
      mobileLabel: 'Nilai',
      mobileValue: scoreText,
    },
    cell: ({ row }) => {
      const score = row.original.score
      return score === null || score === undefined
        ? h('span', { class: 'text-muted-foreground' }, 'Belum dinilai')
        : h('span', { class: 'tabular-nums' }, String(score))
    },
  },
]

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

watch(search, () => {
  page.value = 1
})

async function load() {
  loading.value = true
  try {
    const res = await studentScoreApi.getMyScores({ limit: 500 })
    rows.value = res.data?.data ?? []
  } catch (error: unknown) {
    rows.value = []
    toast.error(getIndonesianErrorMessage(error, 'Gagal memuat nilai Anda.'))
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Nilai Saya</CardTitle>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <DataTable
          mobile="cards"
          :columns="columns"
          :data="pagedRows"
          :page="page"
          :page-size="pageSize"
          :total-items="filteredRows.length"
          :is-loading="loading"
          item-label="nilai"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #header-right>
            <SearchInput
              v-model="search"
              class="sm:w-48"
              label="Cari mapel atau penilaian"
            />
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-model="search"
              label="Cari mapel atau penilaian"
              class="w-full"
            />
          </template>
          <template #empty>
            <DataTableEmpty
              :message="
                search.trim()
                  ? 'Tidak ada nilai yang cocok dengan pencarian.'
                  : 'Belum ada penilaian untuk Anda pada semester ini. Nilai muncul di sini setelah guru membuat penilaian dan mengisinya.'
              "
            />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
