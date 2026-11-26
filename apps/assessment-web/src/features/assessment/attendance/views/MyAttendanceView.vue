<script setup lang="ts">
import { Button, TooltipButton } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import AttendanceDetailDialog from '../components/AttendanceDetailDialog.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  UserCheck,
  UserX,
} from '@lucide/vue'
import { computed, onMounted, ref, useId } from 'vue'
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { attendanceApi } from '../api/attendanceApi'
import type { Attendance, AttendanceStatus } from '../types'

const filterId = useId()
const rows = ref<Attendance[]>([])
const loading = ref(false)

const isDetailOpen = ref(false)
const selectedDayAttendances = ref<Attendance[]>([])
const selectedDate = ref<Date | null>(null)

const months = [
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

const dayNames = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
]

const currentYearNum = new Date().getFullYear()
const years = Array.from({ length: 7 }, (_, i) =>
  (currentYearNum - 3 + i).toString(),
)

const selectedMonth = ref(new Date().getMonth())
const selectedYear = ref(new Date().getFullYear())

const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    label: string
    class: string
    badgeVariant: 'success' | 'warning' | 'info' | 'secondary' | 'destructive'
    icon: typeof UserCheck
  }
> = {
  PRESENT: {
    label: 'Hadir',
    class: 'text-success',
    badgeVariant: 'success',
    icon: UserCheck,
  },
  LATE: {
    label: 'Terlambat',
    class: 'text-warning',
    badgeVariant: 'warning',
    icon: Clock,
  },
  SICK: {
    label: 'Sakit',
    class: 'text-info',
    badgeVariant: 'info',
    icon: FileText,
  },
  EXCUSED: {
    label: 'Izin',
    class: 'text-muted-foreground',
    badgeVariant: 'secondary',
    icon: FileText,
  },
  ABSENT: {
    label: 'Alpa',
    class: 'text-destructive',
    badgeVariant: 'destructive',
    icon: UserX,
  },
}

function prevMonth() {
  if (selectedMonth.value === 0) {
    selectedMonth.value = 11
    selectedYear.value -= 1
  } else {
    selectedMonth.value -= 1
  }
}

function nextMonth() {
  if (selectedMonth.value === 11) {
    selectedMonth.value = 0
    selectedYear.value += 1
  } else {
    selectedMonth.value += 1
  }
}

function setToday() {
  selectedMonth.value = new Date().getMonth()
  selectedYear.value = new Date().getFullYear()
}

function toDateKey(dateInput: string | Date): string {
  const d = new Date(dateInput)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const attendanceMap = computed(() => {
  const map = new Map<string, Attendance[]>()
  for (const item of rows.value) {
    if (!item.date) continue
    const key = toDateKey(item.date)
    const existing = map.get(key) ?? []
    existing.push(item)
    map.set(key, existing)
  }
  return map
})

const filteredRows = computed(() => {
  return rows.value.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return (
      d.getMonth() === selectedMonth.value &&
      d.getFullYear() === selectedYear.value
    )
  })
})

const totals = computed(() => {
  const count = (status: string) =>
    filteredRows.value.filter((r) => r.status === status).length
  return {
    present: count('PRESENT'),
    late: count('LATE'),
    sick: count('SICK'),
    excused: count('EXCUSED'),
    absent: count('ABSENT'),
    total: filteredRows.value.length,
  }
})

const statItems = computed(() => [
  {
    label: 'Hadir',
    value: totals.value.present,
    color: STATUS_CONFIG.PRESENT.class,
  },
  {
    label: 'Terlambat',
    value: totals.value.late,
    color: STATUS_CONFIG.LATE.class,
  },
  {
    label: 'Sakit',
    value: totals.value.sick,
    color: STATUS_CONFIG.SICK.class,
  },
  {
    label: 'Izin',
    value: totals.value.excused,
    color: STATUS_CONFIG.EXCUSED.class,
  },
  {
    label: 'Alpa',
    value: totals.value.absent,
    color: STATUS_CONFIG.ABSENT.class,
  },
])

interface CalendarDayCell {
  date: Date
  dateStr: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isSunday: boolean
  attendances: Attendance[]
}

const calendarDays = computed<CalendarDayCell[]>(() => {
  const year = selectedYear.value
  const month = selectedMonth.value

  const today = new Date()
  const todayKey = toDateKey(today)

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  const startDayIndex = (firstDay.getDay() + 6) % 7

  const days: CalendarDayCell[] = []

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i
    const d = new Date(year, month - 1, dayNum)
    const dateStr = toDateKey(d)
    days.push({
      date: d,
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayKey,
      isSunday: d.getDay() === 0,
      attendances: attendanceMap.value.get(dateStr) ?? [],
    })
  }

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const d = new Date(year, month, dayNum)
    const dateStr = toDateKey(d)
    days.push({
      date: d,
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateStr === todayKey,
      isSunday: d.getDay() === 0,
      attendances: attendanceMap.value.get(dateStr) ?? [],
    })
  }

  const totalSlots = Math.ceil(days.length / 7) * 7
  const remaining = totalSlots - days.length
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const d = new Date(year, month + 1, dayNum)
    const dateStr = toDateKey(d)
    days.push({
      date: d,
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayKey,
      isSunday: d.getDay() === 0,
      attendances: attendanceMap.value.get(dateStr) ?? [],
    })
  }

  return days
})

function handleDayClick(day: CalendarDayCell) {
  if (day.attendances.length === 0) return
  selectedDayAttendances.value = day.attendances
  selectedDate.value = day.date
  isDetailOpen.value = true
}

async function load() {
  loading.value = true
  try {
    const res = await attendanceApi.getMyAttendances({ limit: 500 })
    rows.value = res.data?.data ?? []
  } catch (error: unknown) {
    rows.value = []
    toast.error(
      getIndonesianErrorMessage(error, 'Gagal memuat kehadiran Anda.'),
    )
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Kehadiran Saya</CardTitle>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <dl
          class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
        >
          <div
            v-for="item in statItems"
            :key="item.label"
            class="flex flex-col gap-0.5"
          >
            <dt class="text-control text-muted-foreground">{{ item.label }}</dt>
            <dd
              class="font-medium tabular-nums"
              :class="item.color"
            >
              {{ item.value }}
            </dd>
          </div>
        </dl>

        <div class="flex flex-wrap items-end justify-between gap-3">
          <div class="flex items-center gap-2">
            <TooltipButton
              label="Bulan Sebelumnya"
              variant="outline"
              @click="prevMonth"
            >
              <ChevronLeft class="size-4" />
            </TooltipButton>
            <Button
              variant="outline"
              @click="setToday"
            >
              Bulan Ini
            </Button>
            <TooltipButton
              label="Bulan Selanjutnya"
              variant="outline"
              @click="nextMonth"
            >
              <ChevronRight class="size-4" />
            </TooltipButton>
          </div>

          <div class="flex items-end gap-2">
            <FloatingLabelField
              label="Bulan"
              :for="`${filterId}-month`"
              class="w-36"
              floating
            >
              <Select
                :model-value="selectedMonth.toString()"
                @update:model-value="(val) => (selectedMonth = Number(val))"
              >
                <SelectTrigger
                  :id="`${filterId}-month`"
                  class="w-full"
                >
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="(month, idx) in months"
                    :key="idx"
                    :value="idx.toString()"
                  >
                    {{ month }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>

            <FloatingLabelField
              label="Tahun"
              :for="`${filterId}-year`"
              class="w-24"
              floating
            >
              <Select
                :model-value="selectedYear.toString()"
                @update:model-value="(val) => (selectedYear = Number(val))"
              >
                <SelectTrigger
                  :id="`${filterId}-year`"
                  class="w-full"
                >
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="year in years"
                    :key="year"
                    :value="year"
                  >
                    {{ year }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
          </div>
        </div>

        <div class="border rounded-md bg-card overflow-hidden">
          <div
            class="grid grid-cols-7 border-b bg-table-header text-center font-medium text-control"
          >
            <div
              v-for="(day, idx) in dayNames"
              :key="day"
              class="py-2 border-r last:border-r-0"
              :class="idx === 6 ? 'text-destructive' : 'text-muted-foreground'"
            >
              {{ day }}
            </div>
          </div>

          <div class="grid grid-cols-7 auto-rows-fr">
            <div
              v-for="(day, idx) in calendarDays"
              :key="day.dateStr + '-' + idx"
              class="min-h-24 p-1.5 sm:p-2 border-b border-r flex flex-col justify-between transition-colors relative"
              :class="[
                (idx + 1) % 7 === 0 ? 'border-r-0' : '',
                !day.isCurrentMonth
                  ? 'bg-muted/20 text-muted-foreground/40'
                  : day.isSunday
                    ? 'bg-destructive/5'
                    : 'bg-card hover:bg-muted/20',
                day.attendances.length > 0 ? 'cursor-pointer' : '',
              ]"
              @click="handleDayClick(day)"
            >
              <div class="flex items-center justify-between">
                <span
                  class="text-control font-medium inline-flex size-6 items-center justify-center rounded-full tabular-nums"
                  :class="[
                    day.isToday
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : day.isSunday && day.isCurrentMonth
                        ? 'text-destructive'
                        : !day.isCurrentMonth
                          ? 'text-muted-foreground/40'
                          : 'text-foreground',
                  ]"
                >
                  {{ day.dayNumber }}
                </span>

                <span
                  v-if="day.attendances.length > 1"
                  class="text-xs text-muted-foreground tabular-nums"
                >
                  {{ day.attendances.length }} sesi
                </span>
              </div>

              <div class="space-y-1 mt-1 flex-1 flex flex-col justify-end">
                <template
                  v-for="(att, aIdx) in day.attendances.slice(0, 2)"
                  :key="att.id ?? aIdx"
                >
                  <div class="flex justify-center">
                    <Badge
                      :variant="
                        STATUS_CONFIG[att.status]?.badgeVariant ?? 'outline'
                      "
                    >
                      {{ STATUS_CONFIG[att.status]?.label ?? att.status }}
                    </Badge>
                  </div>

                  <p
                    v-if="att.note"
                    class="text-xs text-muted-foreground truncate text-center px-0.5 leading-tight"
                    :title="att.note"
                  >
                    {{ att.note }}
                  </p>
                  <p
                    v-else-if="att.schedule?.timeSlot?.name"
                    class="text-xs text-muted-foreground truncate text-center px-0.5 leading-tight"
                  >
                    {{ att.schedule.timeSlot.name }}
                  </p>
                </template>

                <p
                  v-if="day.attendances.length > 2"
                  class="text-xs text-muted-foreground text-center font-medium"
                >
                  +{{ day.attendances.length - 2 }} lainnya
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter plain />
    </Card>

    <AttendanceDetailDialog
      v-model:open="isDetailOpen"
      :date="selectedDate"
      :attendances="selectedDayAttendances"
    />
  </div>
</template>
