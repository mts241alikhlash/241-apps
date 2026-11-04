<script setup lang="ts">
import { DataTable } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { CalendarDays, Download, Lock, Unlock } from '@lucide/vue'
import { computed, onMounted, watch } from 'vue'
import { recapColumns } from '../components/recapColumns'
import { employeeAttendanceService } from '../services/employeeAttendanceService'
import { useEmployeeAttendanceStore } from '../stores/employeeAttendanceStore'

const store = useEmployeeAttendanceStore()

const MONTH_OPTIONS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
]

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

const selectedMonth = computed({
  get: () => String(store.recapMonth),
  set: (val: string) => {
    store.recapMonth = Number(val)
  },
})

const selectedYear = computed({
  get: () => String(store.recapYear),
  set: (val: string) => {
    store.recapYear = Number(val)
  },
})

watch(
  () => [store.recapYear, store.recapMonth],
  () => void employeeAttendanceService.fetchRecap(),
)

onMounted(() => void employeeAttendanceService.fetchRecap())
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
        <CardTitle size="lg"> Rekap Kehadiran Bulanan </CardTitle>
        <Button
          variant="outline"
          @click="employeeAttendanceService.exportRecap()"
        >
          <Download class="mr-2 h-4 w-4" />
          Ekspor
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <div class="flex flex-wrap items-center gap-3">
          <Select v-model="selectedMonth">
            <SelectTrigger class="w-[125px]">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="m in MONTH_OPTIONS"
                :key="m.value"
                :value="String(m.value)"
              >
                {{ m.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="selectedYear">
            <SelectTrigger class="w-[85px]">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="y in YEAR_OPTIONS"
                :key="y"
                :value="String(y)"
              >
                {{ y }}
              </SelectItem>
            </SelectContent>
          </Select>

          <div
            v-if="store.recap"
            class="flex flex-wrap items-center gap-2.5 md:ml-auto"
          >
            <div
              class="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <CalendarDays class="h-3.5 w-3.5 text-foreground/70" />
              <span>
                Total:
                <strong class="text-foreground font-semibold">
                  {{ store.recap.period.workingDays }} Hari Kerja
                </strong>
              </span>
            </div>

            <Badge
              variant="outline"
              class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium shadow-none"
              :class="
                store.recap.period.status === 'CLOSED'
                  ? 'border-amber-300/80 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                  : 'border-emerald-300/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              "
            >
              <component
                :is="store.recap.period.status === 'CLOSED' ? Lock : Unlock"
                class="h-3.5 w-3.5 shrink-0"
              />
              <span>
                {{
                  store.recap.period.status === 'CLOSED'
                    ? 'Periode Ditutup'
                    : 'Periode Terbuka'
                }}
              </span>
            </Badge>
          </div>
        </div>

        <DataTable
          :columns="recapColumns"
          :data="store.recap?.rows ?? []"
          :is-loading="store.loading"
          item-label="rekap kehadiran pegawai"
        />
      </CardContent>
    </Card>
  </div>
</template>
