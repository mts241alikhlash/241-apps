<script setup lang="ts">
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { DataTable, DatePicker } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { AlertTriangle, Plus } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'
import CorrectionDialog from '../components/CorrectionDialog.vue'
import ManualEntryDialog from '../components/ManualEntryDialog.vue'
import { createColumns } from '../components/columns'
import { employeeAttendanceService } from '../services/employeeAttendanceService'
import { useEmployeeAttendanceStore } from '../stores/employeeAttendanceStore'
import type { DailyPresence } from '../types'

const store = useEmployeeAttendanceStore()
const correctionOpen = ref(false)
const manualOpen = ref(false)
const selected = ref<DailyPresence | null>(null)

function openCorrection(day: DailyPresence) {
  selected.value = day
  correctionOpen.value = true
}

const tableColumns = createColumns(openCorrection)

watch(
  () => [store.selectedDate, store.statusFilter],
  () => void employeeAttendanceService.fetchDay(),
)

onMounted(() => void employeeAttendanceService.fetchDay())
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <CardTitle size="lg"> Kehadiran Pegawai </CardTitle>
        <Button @click="manualOpen = true">
          <Plus class="mr-2 h-4 w-4" />
          Catat Manual
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <div class="flex flex-wrap items-center gap-3">
          <DatePicker
            v-model="store.selectedDate"
            class="w-[180px]"
          />
        </div>

        <div
          v-if="store.anomalies.length > 0"
          class="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {{ store.anomalies.length }} catatan perlu diperiksa, ada yang tidak
            tap pulang, atau tap pulang tanpa tap masuk.
          </p>
        </div>

        <DataTable
          :columns="tableColumns"
          :data="store.days"
          :is-loading="store.loading"
          item-label="kehadiran pegawai"
        />

        <CorrectionDialog
          v-model:open="correctionOpen"
          :record="selected"
        />
        <ManualEntryDialog v-model:open="manualOpen" />
      </CardContent>
    </Card>
  </div>
</template>
