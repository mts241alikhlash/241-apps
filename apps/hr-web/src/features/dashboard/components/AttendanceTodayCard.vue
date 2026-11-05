<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { dashboardApi } from '../api/dashboardApi'
import DashboardCard from './DashboardCard.vue'

const query = useQuery({
  queryKey: ['dashboard', 'attendance-today'],
  queryFn: dashboardApi.attendanceToday,
})
</script>

<template>
  <DashboardCard
    title="Kehadiran Pegawai Hari Ini"
    :loading="query.isPending.value"
    :error="query.isError.value"
  >
    <dl class="grid grid-cols-2 gap-2 tabular-nums">
      <dt>Hadir</dt>
      <dd class="font-medium">{{ query.data.value?.present }}</dd>
      <dt>Terlambat</dt>
      <dd class="font-medium">{{ query.data.value?.late }}</dd>
      <dt>Cuti atau izin</dt>
      <dd class="font-medium">{{ query.data.value?.onLeave }}</dd>
      <dt>Belum scan</dt>
      <dd class="font-medium">{{ query.data.value?.notScanned }}</dd>
    </dl>
  </DashboardCard>
</template>
