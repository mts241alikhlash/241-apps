<script setup lang="ts">
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { formatPeriod } from '../../shared/money'
import { BackButton } from '@mts241alikhlash/ui'
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PayslipCard from '../components/PayslipCard.vue'
import { loading, payslip, payslipService } from '../services/payslipService'

const router = useRouter()

const route = useRoute()

onMounted(() => void payslipService.fetchById(String(route.params.id)))

useBreadcrumbs(() => {
  const name = payslip.value
    ? `${payslip.value.employee.displayName ?? payslip.value.employee.identifier} · ${formatPeriod(payslip.value.run.year, payslip.value.run.month)}`
    : null
  if (!name) return null
  const trail = route.meta.breadcrumbs ?? []
  return [...trail.slice(0, -1), { title: name }]
})
</script>

<template>
  <div class="space-y-4 p-4 sm:p-6">
    <PayslipCard
      v-if="payslip"
      :payslip="payslip"
    >
      <template #leading>
        <BackButton
          label="Kembali ke penggajian"
          @click="router.push(`/payroll/runs/${payslip.run.id}`)"
        />
      </template>
    </PayslipCard>
    <div
      v-else-if="loading"
      class="text-muted-foreground py-12 text-center text-sm"
    >
      Memuat…
    </div>
  </div>
</template>
