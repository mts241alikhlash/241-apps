<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AttendanceTrendChart from './AttendanceTrendChart.vue'
import AttendanceSummaryCards from './AttendanceSummaryCards.vue'
import { createRecapColumns } from './columns'
import { DataTable, DataTableEmpty, SearchInput } from '@mts241alikhlash/ui'
import type { AttendanceRecapItem, AttendanceTrendPoint } from '../types'

const props = defineProps<{
  recapItems: AttendanceRecapItem[]
  classPercentage: number
  monthDelta: number | null
  recapLoading: boolean
  trendData: AttendanceTrendPoint[]
}>()

const recapColumns = createRecapColumns()
const search = ref('')
const page = ref(1)
const pageSize = ref(25)

const filteredItems = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  if (!keyword) return props.recapItems
  return props.recapItems.filter(
    (item) =>
      item.studentName.toLocaleLowerCase('id').includes(keyword) ||
      item.nis.toLocaleLowerCase('id').includes(keyword),
  )
})

const pagedItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredItems.value.slice(start, start + pageSize.value)
})

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

watch(search, () => {
  page.value = 1
})
</script>

<template>
  <div class="space-y-4">
    <AttendanceSummaryCards
      :recap-items="recapItems"
      :class-percentage="classPercentage"
      :month-delta="monthDelta"
      :loading="recapLoading"
    />
    <AttendanceTrendChart :trend-data="trendData" />
    <DataTable
      mobile="cards"
      :columns="recapColumns"
      :data="pagedItems"
      :page="page"
      :page-size="pageSize"
      :total-items="filteredItems.length"
      :is-loading="recapLoading"
      item-label="siswa"
      @update:page="page = $event"
      @update:page-size="changePageSize"
    >
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
      <template #empty>
        <DataTableEmpty
          :message="
            search.trim()
              ? 'Tidak ada siswa yang cocok dengan pencarian.'
              : 'Belum ada data rekap kehadiran.'
          "
        />
      </template>
    </DataTable>
  </div>
</template>
