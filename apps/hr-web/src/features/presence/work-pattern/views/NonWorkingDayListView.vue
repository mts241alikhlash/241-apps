<script setup lang="ts">
import { lookupService } from '@/features/lookup'
import type { CalendarTypeOption } from '@/features/lookup'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Label } from '@mts241alikhlash/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { CalendarPlus, Check } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { createNonWorkingDayColumns } from '../components/nonWorkingDayColumns'
import {
  importPreview,
  loading,
  nonWorkingDays,
  workPatternService,
} from '../services/workPatternService'
import type { NonWorkingDay } from '../types'

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

const year = ref(currentYear)
const activeAcademicYearId = ref('')
const calendarTypes = ref<CalendarTypeOption[]>([])
const selectedTypeId = ref('')
const syncDialogOpen = ref(false)

const selectedYear = computed({
  get: () => String(year.value),
  set: (val: string) => {
    year.value = Number(val)
  },
})

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return value
  }
}

async function loadData() {
  try {
    const [years, types] = await Promise.all([
      lookupService.listAcademicYears(),
      lookupService.listCalendarTypes(),
    ])
    const activeYear = years.find((ay) => ay.isActive)
    if (activeYear) activeAcademicYearId.value = activeYear.id

    calendarTypes.value = types
    if (calendarTypes.value.length === 1) {
      const first = calendarTypes.value[0]
      if (first) selectedTypeId.value = first.id
    }
  } catch (error: unknown) {
    toast.error(getIndonesianErrorMessage(error, 'Gagal memuat data.'))
  }
}

async function handlePreview() {
  if (!activeAcademicYearId.value || !selectedTypeId.value) return
  await workPatternService.previewFromCalendar(
    activeAcademicYearId.value,
    selectedTypeId.value,
  )
}

async function handleConfirmImport() {
  await workPatternService.confirmImport(year.value)
  syncDialogOpen.value = false
}

async function handleDelete(day: NonWorkingDay) {
  const confirmed = window.confirm(`Hapus hari libur "${day.name}"?`)
  if (confirmed) {
    await workPatternService.deleteNonWorkingDay(day.id, year.value)
  }
}

const tableColumns = computed(() =>
  createNonWorkingDayColumns((day) => void handleDelete(day)),
)

watch(year, () => void workPatternService.fetchNonWorkingDays(year.value))
onMounted(() => {
  void workPatternService.fetchNonWorkingDays(year.value)
  void loadData()
})
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader plain>
        <CardTitle size="lg"> Hari Libur </CardTitle>
        <Button
          variant="outline"
          :disabled="!activeAcademicYearId"
          @click="syncDialogOpen = true"
        >
          <CalendarPlus class="h-4 w-4" />
          Sinkron Kalender
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <div class="flex flex-wrap items-center gap-3">
          <Select v-model="selectedYear">
            <SelectTrigger class="w-[120px]">
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
        </div>

        <DataTable
          :columns="tableColumns"
          :data="nonWorkingDays"
          :is-loading="loading"
          item-label="hari libur"
        />
      </CardContent>
    </Card>
  </div>

  <Dialog v-model:open="syncDialogOpen">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader standard>
        <DialogTitle>Sinkron dari Kalender Akademik</DialogTitle>
        <DialogDescription />
      </DialogHeader>

      <DialogBody class="space-y-4">
        <div
          v-if="calendarTypes.length > 1"
          class="space-y-1.5"
        >
          <Label>Tipe Kalender</Label>
          <Select v-model="selectedTypeId">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih tipe kalender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="ct in calendarTypes"
                :key="ct.id"
                :value="ct.id"
              >
                {{ ct.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          v-if="importPreview.length > 0"
          class="space-y-2 pt-2 border-t"
        >
          <p class="text-sm text-muted-foreground">
            <strong class="text-foreground font-semibold">
              {{ importPreview.length }} tanggal
            </strong>
            siap diimpor ke tahun {{ year }}.
          </p>
          <div
            class="max-h-44 overflow-y-auto rounded-lg border divide-y text-sm"
          >
            <p
              v-for="entry in importPreview"
              :key="entry.date + entry.name"
              class="px-3 py-2"
            >
              {{ formatDate(entry.date) }} – {{ entry.name }}
            </p>
          </div>
        </div>
      </DialogBody>

      <DialogFooter standard>
        <Button
          variant="outline"
          @click="syncDialogOpen = false"
        >
          Batal
        </Button>
        <Button
          v-if="importPreview.length === 0"
          :disabled="!selectedTypeId"
          @click="handlePreview"
        >
          <CalendarPlus class="h-4 w-4" />
          Lihat Pratinjau
        </Button>
        <Button
          v-else
          @click="handleConfirmImport"
        >
          <Check class="h-4 w-4" />
          Konfirmasi Impor
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
