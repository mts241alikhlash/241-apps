<script setup lang="ts">
import type { FilterOption } from '@mts241alikhlash/web-shared/types/filter.types'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import AttendanceRecapTab from '../components/AttendanceRecapTab.vue'
import { useAttendance } from '../composables/useAttendance'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@mts241alikhlash/ui/empty'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { computed, onMounted, ref, useId, watch } from 'vue'

const MONTH_OPTIONS: FilterOption[] = [
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
].map((label, i) => ({ value: String(i + 1), label }))

const {
  classrooms,
  semesters,
  selectedClassroomId,
  selectedSemesterId,
  selectedMonth,
  selectedYear,
  recapItems,
  recapLoading,
  trendData,
  classPercentage,
  monthDelta,
  fetchFilterOptions,
  fetchRecap,
} = useAttendance()

const filterId = useId()
const relatedLoading = ref(false)

const activeSemester = computed(
  () => semesters.value.find((s) => s.id === selectedSemesterId.value) ?? null,
)

const classroomFilterOptions = computed<FilterOption[]>(() =>
  classrooms.value
    .filter(
      (c) =>
        !activeSemester.value ||
        c.academicYearId === activeSemester.value.academicYearId,
    )
    .map((c) => ({
      value: c.id,
      label: c.code ?? '-',
    })),
)

const yearFilterOptions = computed<FilterOption[]>(() => {
  const current = new Date().getFullYear()
  const years = [current - 2, current - 1, current, current + 1]
  return years.map((y) => ({ value: String(y), label: String(y) }))
})

const classroomModel = computed({
  get: () => selectedClassroomId.value ?? '',
  set: (value: string) => {
    selectedClassroomId.value = value
  },
})

const selectedMonthStr = computed({
  get: () => String(selectedMonth.value),
  set: (val: string) => {
    selectedMonth.value = Number(val)
  },
})

const selectedYearStr = computed({
  get: () => String(selectedYear.value),
  set: (val: string) => {
    selectedYear.value = Number(val)
  },
})

const isFilterReady = computed(() =>
  Boolean(selectedClassroomId.value && selectedSemesterId.value),
)

watch(classroomFilterOptions, (options) => {
  if (
    selectedClassroomId.value &&
    !options.some((o) => o.value === selectedClassroomId.value)
  ) {
    selectedClassroomId.value = ''
  }
  if (!selectedClassroomId.value && options.length > 0) {
    selectedClassroomId.value = options[0]?.value ?? ''
  }
})

watch(
  [selectedSemesterId, selectedClassroomId, selectedMonth, selectedYear],
  () => {
    if (isFilterReady.value) {
      void fetchRecap()
    } else {
      recapItems.value = []
      trendData.value = []
    }
  },
)

onMounted(async () => {
  relatedLoading.value = true
  try {
    await fetchFilterOptions()
    const defaultSemester =
      semesters.value.find((s) => s.isActive) ?? semesters.value[0]
    if (defaultSemester && !selectedSemesterId.value) {
      selectedSemesterId.value = defaultSemester.id
    }
    if (!selectedClassroomId.value && classroomFilterOptions.value.length > 0) {
      selectedClassroomId.value = classroomFilterOptions.value[0]?.value ?? ''
    }
  } finally {
    relatedLoading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Rekapitulasi Kehadiran</CardTitle>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <div class="flex flex-wrap items-end gap-2">
          <AcademicPeriodFilter
            v-model:semester-id="selectedSemesterId"
            :semesters="semesters"
          />

          <FloatingLabelField
            label="Kelas"
            :for="`${filterId}-classroom`"
            class="w-fit min-w-28"
            floating
          >
            <Select v-model="classroomModel">
              <SelectTrigger
                :id="`${filterId}-classroom`"
                class="w-full"
              >
                <SelectValue placeholder="Pilih kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in classroomFilterOptions"
                  :key="c.value"
                  :value="c.value"
                >
                  {{ c.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>

          <FloatingLabelField
            label="Bulan"
            :for="`${filterId}-month`"
            class="w-fit min-w-32"
            floating
          >
            <Select v-model="selectedMonthStr">
              <SelectTrigger
                :id="`${filterId}-month`"
                class="w-full"
              >
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="m in MONTH_OPTIONS"
                  :key="m.value"
                  :value="m.value"
                >
                  {{ m.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>

          <FloatingLabelField
            label="Tahun"
            :for="`${filterId}-year`"
            class="w-fit min-w-24"
            floating
          >
            <Select v-model="selectedYearStr">
              <SelectTrigger
                :id="`${filterId}-year`"
                class="w-full"
              >
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="y in yearFilterOptions"
                  :key="y.value"
                  :value="y.value"
                >
                  {{ y.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </div>

        <Empty v-if="!isFilterReady && !relatedLoading">
          <EmptyHeader>
            <EmptyTitle>Belum ada data</EmptyTitle>
            <EmptyDescription>
              {{
                !selectedSemesterId
                  ? semesters.length === 0
                    ? 'Belum ada semester aktif. Aktifkan satu lewat menu Periode Akademik.'
                    : 'Pilih tahun ajaran dan semester terlebih dahulu.'
                  : 'Pilih kelas untuk menampilkan rekapitulasi kehadiran.'
              }}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        <AttendanceRecapTab
          v-else
          :recap-items="recapItems"
          :class-percentage="classPercentage"
          :month-delta="monthDelta"
          :recap-loading="relatedLoading || recapLoading"
          :trend-data="trendData"
        />
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
