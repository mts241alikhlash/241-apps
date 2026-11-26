<script setup lang="ts">
import { DataTable, DataTableEmpty, SearchInput } from '@mts241alikhlash/ui'
import { computed, ref } from 'vue'
import {
  createStudentScoreInputColumns,
  type StudentScoreTableRow,
} from './studentScoreInputColumns'
import StudentScoreNoteDialog from './StudentScoreNoteDialog.vue'
import type { StudentNoteTarget, StudentScoreRosterItem } from '../types'

const props = defineProps<{
  rows: StudentScoreRosterItem[]
  loading: boolean
  maxScore: number
}>()

const emit = defineEmits<{
  'update:rows': [value: StudentScoreRosterItem[]]
}>()

const searchQuery = ref('')
const noteDialogOpen = ref(false)
const noteTarget = ref<StudentNoteTarget | null>(null)

function handleScoreChange(enrollmentId: string, value: string) {
  const index = props.rows.findIndex((r) => r.enrollmentId === enrollmentId)
  if (index === -1) return
  const row = props.rows[index]
  if (!row) return

  let score: number | null = null
  if (value !== '') {
    const parsed = Number(value)
    score = Number.isNaN(parsed)
      ? null
      : Math.min(Math.max(parsed, 0), props.maxScore)
  }

  const updated = [...props.rows]
  updated[index] = { ...row, score }
  emit('update:rows', updated)
}

function handleNoteChange(enrollmentId: string, note: string) {
  const index = props.rows.findIndex((r) => r.enrollmentId === enrollmentId)
  if (index === -1) return
  const row = props.rows[index]
  if (!row) return

  const updated = [...props.rows]
  updated[index] = { ...row, note }
  emit('update:rows', updated)
}

function openNoteDialog(row: StudentScoreTableRow) {
  noteTarget.value = {
    enrollmentId: row.enrollmentId,
    studentName: row.studentName,
    nis: row.nis,
    note: row.note,
  }
  noteDialogOpen.value = true
}

const columns = computed(() =>
  createStudentScoreInputColumns({
    maxScore: props.maxScore,
    onScoreChange: handleScoreChange,
    onEditNote: openNoteDialog,
  }),
)

const tableData = computed<StudentScoreTableRow[]>(() => {
  const keyword = searchQuery.value.trim().toLocaleLowerCase('id')
  const filtered = keyword
    ? props.rows.filter(
        (row) =>
          row.studentName.toLocaleLowerCase('id').includes(keyword) ||
          row.nis.toLocaleLowerCase('id').includes(keyword) ||
          (row.nisn ?? '').toLocaleLowerCase('id').includes(keyword),
      )
    : props.rows

  return filtered.map((row, index) => ({
    ...row,
    id: row.enrollmentId,
    rowNumber: index + 1,
  }))
})

const emptyMessage = computed(() =>
  props.rows.length === 0
    ? 'Kelas ini belum punya siswa aktif di semester berjalan.'
    : 'Tidak ada siswa yang cocok dengan pencarian.',
)
</script>

<template>
  <DataTable
    mobile="cards"
    :columns="columns"
    :data="tableData"
    :is-loading="loading"
    item-label="siswa"
    :hide-per-page="true"
    :hide-pagination="true"
    :page-size="500"
  >
    <template #header-right>
      <SearchInput
        v-model="searchQuery"
        class="sm:w-48"
        label="Cari nama, NIS, NISN"
        :disabled="rows.length === 0"
      />
    </template>
    <template #mobile-toolbar>
      <SearchInput
        v-model="searchQuery"
        class="w-full"
        label="Cari nama, NIS, NISN"
        :disabled="rows.length === 0"
      />
    </template>
    <template #empty>
      <DataTableEmpty :message="emptyMessage" />
    </template>
  </DataTable>

  <StudentScoreNoteDialog
    v-model:open="noteDialogOpen"
    :student="noteTarget"
    @apply="handleNoteChange"
  />
</template>
