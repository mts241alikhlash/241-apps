<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { dashboardApi } from '../api/dashboardApi'
import DashboardCard from './DashboardCard.vue'

const query = useQuery({
  queryKey: ['dashboard', 'loans'],
  queryFn: dashboardApi.loans,
})
</script>

<template>
  <DashboardCard
    title="Peminjaman"
    :loading="query.isPending.value"
    :error="query.isError.value"
  >
    <dl class="grid grid-cols-2 gap-2 tabular-nums">
      <dt>Sedang dipinjam</dt>
      <dd class="font-medium">{{ query.data.value?.active }}</dd>
      <dt>Terlambat</dt>
      <dd class="font-medium">{{ query.data.value?.overdue }}</dd>
    </dl>
  </DashboardCard>
</template>
