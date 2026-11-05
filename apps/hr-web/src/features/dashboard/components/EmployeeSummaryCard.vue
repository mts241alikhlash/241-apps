<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { dashboardApi } from '../api/dashboardApi'
import DashboardCard from './DashboardCard.vue'

const query = useQuery({
  queryKey: ['dashboard', 'employee-summary'],
  queryFn: dashboardApi.employeeSummary,
})
</script>

<template>
  <DashboardCard
    title="Pegawai Aktif"
    :loading="query.isPending.value"
    :error="query.isError.value"
    :empty="query.data.value?.activeTotal === 0"
    empty-text="Belum ada pegawai aktif."
  >
    <p class="text-2xl font-semibold tabular-nums">
      {{ query.data.value?.activeTotal }}
    </p>
    <ul class="mt-2 space-y-1 tabular-nums">
      <li
        v-for="row in query.data.value?.byEmploymentType"
        :key="`type-${row.name}`"
        class="flex justify-between"
      >
        <span>{{ row.name }}</span>
        <span class="font-medium">{{ row.total }}</span>
      </li>
    </ul>
    <ul class="mt-2 space-y-1 tabular-nums">
      <li
        v-for="row in query.data.value?.byPositionCategory"
        :key="`category-${row.name}`"
        class="flex justify-between"
      >
        <span>{{ row.name }}</span>
        <span class="font-medium">{{ row.total }}</span>
      </li>
    </ul>
  </DashboardCard>
</template>
