<script setup lang="ts">
import type { AcceptableValue } from '@mts241alikhlash/ui/select'
import { computed, ref } from 'vue'
import { DataTable, DataTableEmpty, SearchInput } from '@mts241alikhlash/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { createAttendanceInputColumns } from './attendanceInputColumns'
import type { AttendanceInputRow, AttendanceStatus } from '../types'
import {
  ATTENDANCE_STATUS_OPTIONS,
  toAttendanceStatus,
} from '../constants/attendance-status'

const props = defineProps<{
  rows: AttendanceInputRow[]
  loading: boolean
  emptyMessage?: string
}>()

const emit = defineEmits<{ 'update:rows': [value: AttendanceInputRow[]] }>()

const selectedRows = ref<AttendanceInputRow[]>([])
const search = ref('')

function confirmed(row: AttendanceInputRow): AttendanceInputRow {
  return { ...row, fromGate: false, needsDecision: false }
}

function handleStatusChange(enrollmentId: string, status: AttendanceStatus) {
  const index = props.rows.findIndex((r) => r.enrollmentId === enrollmentId)
  if (index === -1) return
  const updated = [...props.rows]
  const row = updated[index]
  if (!row) return
  updated[index] = { ...confirmed(row), status }
  emit('update:rows', updated)
}

function handleNoteChange(enrollmentId: string, note: string) {
  const index = props.rows.findIndex((r) => r.enrollmentId === enrollmentId)
  if (index === -1) return
  const updated = [...props.rows]
  const row = updated[index]
  if (!row) return
  updated[index] = { ...confirmed(row), note }
  emit('update:rows', updated)
}

function applyBulkStatus(value: AcceptableValue) {
  const status = toAttendanceStatus(value)
  if (!status || selectedRows.value.length === 0) return
  const selectedIds = new Set(selectedRows.value.map((r) => r.enrollmentId))
  const updated = props.rows.map((row) => {
    if (selectedIds.has(row.enrollmentId)) {
      return { ...confirmed(row), status }
    }
    return row
  })
  emit('update:rows', updated)
}

function handleSelectionChange(rows: AttendanceInputRow[]) {
  selectedRows.value = rows
}

const columns = computed(() =>
  createAttendanceInputColumns({
    onStatusChange: handleStatusChange,
    onNoteChange: handleNoteChange,
  }),
)

const tableData = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  return [...props.rows]
    .sort((a, b) =>
      (a.studentName ?? '').localeCompare(b.studentName ?? '', 'id'),
    )
    .filter((r) => {
      if (!keyword) return true
      return (
        (r.studentName ?? '').toLocaleLowerCase('id').includes(keyword) ||
        (r.nis ?? '').toLocaleLowerCase('id').includes(keyword)
      )
    })
    .map((r) => ({
      ...r,
      id: r.enrollmentId,
    }))
})
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
    @selection-change="handleSelectionChange"
  >
    <template
      v-if="$slots.filters"
      #filters
    >
      <slot name="filters" />
    </template>
    <template
      v-if="rows.length > 0"
      #header-left
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-control text-muted-foreground">
          {{ selectedRows.length }}/{{ rows.length }} dipilih
        </span>
        <Select
          :disabled="selectedRows.length === 0"
          :model-value="undefined"
          @update:model-value="applyBulkStatus"
        >
          <SelectTrigger class="w-44">
            <SelectValue
              :placeholder="`Ubah status (${selectedRows.length}) ke...`"
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in ATTENDANCE_STATUS_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </template>
    <template #header-right>
      <SearchInput
        v-model="search"
        class="sm:w-48"
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
    <template
      v-if="$slots['mobile-filter']"
      #mobile-filter
    >
      <slot name="mobile-filter" />
    </template>
    <template #empty>
      <DataTableEmpty
        :message="
          search.trim()
            ? 'Tidak ada siswa yang cocok dengan pencarian.'
            : (emptyMessage ?? 'Belum ada data siswa.')
        "
      />
    </template>
  </DataTable>
</template>
