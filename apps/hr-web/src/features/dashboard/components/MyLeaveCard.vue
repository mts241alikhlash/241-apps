<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { dashboardApi } from '../api/dashboardApi'
import DashboardCard from './DashboardCard.vue'

const query = useQuery({
  queryKey: ['dashboard', 'me'],
  queryFn: dashboardApi.mine,
})
</script>

<template>
  <DashboardCard
    title="Sisa Cuti Saya"
    :loading="query.isPending.value"
    :error="query.isError.value"
    :empty="(query.data.value?.leaveBalance.length ?? 0) === 0"
    empty-text="Belum ada jatah cuti."
  >
    <ul class="space-y-1">
      <li
        v-for="row in query.data.value?.leaveBalance"
        :key="row.leaveTypeName"
        class="flex justify-between tabular-nums"
      >
        <span>{{ row.leaveTypeName }}</span>
        <span class="font-medium">{{ row.remainingDays }} hari</span>
      </li>
    </ul>
  </DashboardCard>
</template>
