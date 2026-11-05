<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { RouterLink } from 'vue-router'
import { dashboardApi } from '../api/dashboardApi'
import DashboardCard from './DashboardCard.vue'

const query = useQuery({
  queryKey: ['dashboard', 'latest-payslip-period'],
  queryFn: dashboardApi.latestPayslipPeriod,
})

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]
</script>

<template>
  <DashboardCard
    title="Slip Gaji Terbaru"
    :loading="query.isPending.value"
    :error="query.isError.value"
    :empty="query.data.value == null"
    empty-text="Belum ada slip gaji yang disetujui."
  >
    <p class="text-lg font-medium">
      {{ MONTHS[(query.data.value?.month ?? 1) - 1] }}
      {{ query.data.value?.year }}
    </p>
    <RouterLink
      to="/payroll/my-payslip"
      class="text-primary underline"
    >
      Lihat slip gaji
    </RouterLink>
  </DashboardCard>
</template>
