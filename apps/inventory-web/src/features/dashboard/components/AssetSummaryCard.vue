<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { dashboardApi } from '../api/dashboardApi'
import DashboardCard from './DashboardCard.vue'

const query = useQuery({
  queryKey: ['dashboard', 'assets'],
  queryFn: dashboardApi.assets,
})
</script>

<template>
  <DashboardCard
    title="Ringkasan Aset"
    :loading="query.isPending.value"
    :error="query.isError.value"
    :empty="query.data.value?.total === 0"
    empty-text="Belum ada unit aset."
  >
    <p class="text-2xl font-semibold tabular-nums">
      {{ query.data.value?.total }} unit
    </p>
    <ul class="mt-2 space-y-1 tabular-nums">
      <li
        v-for="row in query.data.value?.byStatus"
        :key="`status-${row.name}`"
        class="flex justify-between"
      >
        <span>{{ row.name }}</span>
        <span class="font-medium">{{ row.total }}</span>
      </li>
    </ul>
    <ul class="mt-2 space-y-1 tabular-nums">
      <li
        v-for="row in query.data.value?.byCondition"
        :key="`condition-${row.name}`"
        class="flex justify-between"
      >
        <span>{{ row.name }}</span>
        <span class="font-medium">{{ row.total }}</span>
      </li>
    </ul>
  </DashboardCard>
</template>
