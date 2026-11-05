<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { RouterLink } from 'vue-router'
import { dashboardApi } from '../api/dashboardApi'
import DashboardCard from './DashboardCard.vue'

const query = useQuery({
  queryKey: ['dashboard', 'pending-approvals'],
  queryFn: dashboardApi.pendingApprovals,
})
</script>

<template>
  <DashboardCard
    title="Persetujuan Menunggu Saya"
    :loading="query.isPending.value"
    :error="query.isError.value"
  >
    <p class="text-2xl font-semibold tabular-nums">{{ query.data.value }}</p>
    <RouterLink
      to="/approvals"
      class="text-primary underline"
    >
      Buka daftar persetujuan
    </RouterLink>
  </DashboardCard>
</template>
