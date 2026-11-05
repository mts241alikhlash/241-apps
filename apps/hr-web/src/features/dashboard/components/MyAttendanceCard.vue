<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { dashboardApi } from '../api/dashboardApi'
import DashboardCard from './DashboardCard.vue'

const query = useQuery({
  queryKey: ['dashboard', 'me'],
  queryFn: dashboardApi.mine,
})

const time = (value: string | null) =>
  value
    ? new Date(value).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'
</script>

<template>
  <DashboardCard
    title="Presensi Saya Hari Ini"
    :loading="query.isPending.value"
    :error="query.isError.value"
    :empty="query.data.value?.today == null"
    empty-text="Belum ada catatan presensi hari ini."
  >
    <p class="text-lg font-medium">{{ query.data.value?.today?.status }}</p>
    <p class="text-muted-foreground tabular-nums">
      Masuk {{ time(query.data.value?.today?.clockIn ?? null) }} · Pulang
      {{ time(query.data.value?.today?.clockOut ?? null) }}
    </p>
  </DashboardCard>
</template>
