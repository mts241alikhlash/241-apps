<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { RouterLink } from 'vue-router'
import { dashboardApi } from '../api/dashboardApi'
import DashboardCard from './DashboardCard.vue'

const query = useQuery({
  queryKey: ['dashboard', 'pending-leaves'],
  queryFn: dashboardApi.pendingLeaves,
})
</script>

<template>
  <DashboardCard
    title="Cuti Menunggu Persetujuan"
    :loading="query.isPending.value"
    :error="query.isError.value"
  >
    <p class="text-2xl font-semibold tabular-nums">
      {{ query.data.value?.total }}
    </p>
    <RouterLink
      to="/attendance/leave-approvals"
      class="text-primary underline"
    >
      Buka persetujuan cuti
    </RouterLink>
  </DashboardCard>
</template>
