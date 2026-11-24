<script setup lang="ts">
import { computed, h, nextTick, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import {
  ActionCell,
  BackButton,
  DataTable,
  DataTableEmpty,
  SearchInput,
  ServiceUnavailable,
} from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Printer } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { isOutageMessage } from '@mts241alikhlash/web-shared/utils/service-error'
import { examEventService } from '@/features/exam-event/services/examEventService'
import {
  EVENT_STATUSES,
  eventStatusLabel,
  type ExamEvent,
} from '@/features/exam-event/types'
import { examTypeLabel } from '@/features/exam-schedule/types'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { usePackageSubjects } from '@/features/exam-shared/usePackageSubjects'
import { buildPrintEventColumns } from '../components/printEventColumns'
import AttendanceSheet from '../documents/AttendanceSheet.vue'
import { formatPrintDate, formatPrintRange } from '../format'
import { waitForPrintImages } from '../printImages'
import { examPrintService } from '../services/examPrintService'
import type { PrintPack, PrintSchedule } from '../types'
import {
  buildAttendanceDays,
  filterAttendanceDays,
  type AttendanceDay,
  type AttendanceRoom,
  type AttendanceSubject,
} from '../utils/attendanceUnits'

type Row = ExamEvent | AttendanceDay | AttendanceSubject | AttendanceRoom

const route = useRoute()
const router = useRouter()
const statusFieldId = useId()
const { subjectOf } = usePackageSubjects()

const events = ref<ExamEvent[]>([])
const eventsLoaded = ref(false)
const pack = ref<PrintPack | null>(null)
const schedules = ref<PrintSchedule[]>([])
const gradeClassrooms = ref<ReadonlyMap<string, readonly string[]>>(new Map())
const dataLoaded = ref(false)
const dataForEvent = ref<string | null>(null)
const loadingEvents = ref(false)
const loadingData = ref(false)
const error = ref<string | null>(null)

const semesterId = ref('')
const status = ref('ALL')
const search = ref('')
const page = ref(1)
const pageSize = ref(25)
const previewOpen = ref(false)
const previewRoom = ref<AttendanceRoom | null>(null)
const batch = ref<AttendanceRoom[]>([])
const printing = ref(false)

const loading = computed(() => loadingEvents.value || loadingData.value)

const paramValue = (name: 'eventId' | 'dayId' | 'subjectId'): string | null => {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}

const eventId = computed(() => paramValue('eventId'))
const dayId = computed(() => paramValue('dayId'))
const subjectId = computed(() => paramValue('subjectId'))

const activeEvent = computed(
  () => events.value.find((event) => event.id === eventId.value) ?? null,
)

const allDays = computed(() =>
  pack.value === null
    ? []
    : buildAttendanceDays(
        pack.value,
        schedules.value,
        (item) => subjectOf(item.packageId, item.packageTitle),
        gradeClassrooms.value,
      ),
)

const hasEventData = computed(
  () =>
    dataForEvent.value !== null && dataForEvent.value === activeEvent.value?.id,
)

const days = computed(() =>
  hasEventData.value ? filterAttendanceDays(allDays.value, search.value) : [],
)

const availableDays = computed(() => (hasEventData.value ? allDays.value : []))

const activeDay = computed(
  () => availableDays.value.find((day) => day.id === dayId.value) ?? null,
)

const activeSubject = computed(
  () =>
    activeDay.value?.subjects.find((item) => item.id === subjectId.value) ??
    null,
)

function matches(text: string): boolean {
  const needle = search.value.trim().toLowerCase()
  return needle === '' || text.toLowerCase().includes(needle)
}

const levelRows = computed<Row[]>(() => {
  if (!activeEvent.value) {
    return events.value.filter(
      (event) =>
        (!semesterId.value || event.semesterId === semesterId.value) &&
        (status.value === 'ALL' || event.status === status.value) &&
        (matches(event.name) ||
          matches(examTypeLabel(event.type)) ||
          matches(eventStatusLabel(event.status))),
    )
  }
  if (activeSubject.value) {
    return activeSubject.value.rooms.filter(
      (room) =>
        matches(room.roomCode) ||
        matches(room.roomName) ||
        matches(room.subject),
    )
  }
  if (activeDay.value) {
    return activeDay.value.subjects.filter(
      (item) =>
        matches(item.subject) ||
        item.rooms.some(
          (room) => matches(room.roomCode) || matches(room.roomName),
        ),
    )
  }
  return days.value
})

const paginatedRows = computed(() => {
  if (activeEvent.value) return levelRows.value
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

const printTargets = computed<AttendanceRoom[]>(() => {
  if (activeSubject.value) return activeSubject.value.rooms
  if (activeDay.value) {
    return activeDay.value.subjects.flatMap((item) => item.rooms)
  }
  if (activeEvent.value) {
    return allDays.value.flatMap((day) =>
      day.subjects.flatMap((item) => item.rooms),
    )
  }
  return []
})

const dateOf = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'long',
  }).format(new Date(iso))

const clock = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))

const pageTitle = computed(() => {
  if (activeSubject.value) return activeSubject.value.subject
  if (activeDay.value) return dateOf(activeDay.value.startsAt)
  if (activeEvent.value) return activeEvent.value.name
  return 'Daftar Hadir Peserta'
})

const backLabel = computed(() => {
  if (activeSubject.value) return 'Kembali ke daftar mapel'
  if (activeDay.value) return 'Kembali ke semua hari'
  return 'Kembali ke daftar periode'
})

const itemLabel = computed(() => {
  if (activeSubject.value) return 'ruangan'
  if (activeDay.value) return 'mapel'
  if (activeEvent.value) return 'hari'
  return 'periode'
})

const searchLabel = computed(() =>
  activeEvent.value ? 'Cari ruangan atau mapel' : 'Cari periode',
)

function goTo(
  nextEventId: string | null,
  nextDayId: string | null = null,
  nextSubjectId: string | null = null,
) {
  const params: Record<string, string> = {}
  if (nextEventId !== null) params.eventId = nextEventId
  if (nextEventId !== null && nextDayId !== null) params.dayId = nextDayId
  if (nextEventId !== null && nextDayId !== null && nextSubjectId !== null) {
    params.subjectId = nextSubjectId
  }
  void router.push({ name: 'ExamPrintStudentAttendance', params })
}

function goBack() {
  if (activeSubject.value && activeEvent.value) {
    goTo(activeEvent.value.id, dayId.value)
    return
  }
  if (activeDay.value && activeEvent.value) {
    goTo(activeEvent.value.id)
    return
  }
  goTo(null)
}

async function fetchAttendanceBundle(targetEventId: string) {
  const packResult = await examPrintService.loadPack(targetEventId)
  if (!packResult.success)
    return { success: false as const, error: packResult.error }
  const [scheduleResult, classroomsResult] = await Promise.all([
    examPrintService.loadActivitySchedules(packResult.data.event),
    examPrintService.loadGradeClassrooms(),
  ])
  if (!scheduleResult.success) {
    return { success: false as const, error: scheduleResult.error }
  }
  if (!classroomsResult.success) {
    return { success: false as const, error: classroomsResult.error }
  }
  return {
    success: true as const,
    pack: packResult.data,
    schedules: scheduleResult.data,
    gradeClassrooms: classroomsResult.data,
  }
}

async function loadEvents() {
  loadingEvents.value = true
  error.value = null
  try {
    const result = await examEventService.loadEvents({ limit: 200 })
    if (!result.success) {
      error.value = result.error
      return
    }
    events.value = result.data
    eventsLoaded.value = true
  } finally {
    loadingEvents.value = false
  }
}

async function loadEventData(targetEventId: string | null) {
  if (targetEventId === null) {
    pack.value = null
    schedules.value = []
    gradeClassrooms.value = new Map()
    dataLoaded.value = false
    dataForEvent.value = null
    loadingData.value = false
    return
  }
  loadingData.value = true
  error.value = null
  dataLoaded.value = false
  dataForEvent.value = null
  try {
    const result = await fetchAttendanceBundle(targetEventId)
    if (eventId.value !== targetEventId) return
    if (!result.success) {
      error.value = result.error
      pack.value = null
      schedules.value = []
      gradeClassrooms.value = new Map()
      return
    }
    pack.value = result.pack
    schedules.value = result.schedules
    gradeClassrooms.value = result.gradeClassrooms
    dataForEvent.value = targetEventId
    dataLoaded.value = true
  } finally {
    if (eventId.value === targetEventId) loadingData.value = false
  }
}

function reloadCurrent() {
  if (!eventsLoaded.value) void loadEvents()
  if (eventId.value !== null) void loadEventData(eventId.value)
}

function openPreview(room: AttendanceRoom) {
  previewRoom.value = room
  previewOpen.value = true
}

async function printRooms(rooms: AttendanceRoom[]) {
  if (printing.value || rooms.length === 0) return
  printing.value = true
  try {
    batch.value = [...rooms].sort(
      (left, right) =>
        left.startsAt.localeCompare(right.startsAt) ||
        left.roomName.localeCompare(right.roomName, 'id'),
    )
    await nextTick()
    await waitForPrintImages()
    printSheet()
  } finally {
    batch.value = []
    printing.value = false
  }
}

async function printEvent(event: ExamEvent) {
  if (printing.value) return
  const result =
    dataForEvent.value === event.id && pack.value !== null
      ? {
          success: true as const,
          pack: pack.value,
          schedules: schedules.value,
          gradeClassrooms: gradeClassrooms.value,
        }
      : await fetchAttendanceBundle(event.id)
  if (!result.success) {
    toast.error(result.error)
    return
  }
  const rooms = buildAttendanceDays(
    result.pack,
    result.schedules,
    (item) => subjectOf(item.packageId, item.packageTitle),
    result.gradeClassrooms,
  ).flatMap((day) => day.subjects.flatMap((subject) => subject.rooms))
  if (rooms.length === 0) {
    toast.info('Belum ada daftar hadir pada periode ini.')
    return
  }
  await printRooms(rooms)
}

function printSheet() {
  document.body.classList.add('printing-stack')
  window.print()
  document.body.classList.remove('printing-stack')
}

const printItem = (action: () => void) => ({
  label: 'Cetak',
  icon: Printer,
  onClick: action,
})

const eventColumns = buildPrintEventColumns({
  formatDate: dateOf,
  onView: (event) => goTo(event.id),
  onPrint: (event) => void printEvent(event),
})

const dayColumns: ColumnDef<AttendanceDay>[] = [
  {
    id: 'date',
    header: 'Tanggal',
    meta: {
      mobile: 'title',
      mobileValue: (row: AttendanceDay) => dateOf(row.startsAt),
    },
    cell: ({ row }) => dateOf(row.original.startsAt),
  },
  {
    id: 'subjects',
    header: 'Jumlah Mata Pelajaran',
    meta: {
      align: 'center',
      mobileValue: (row: AttendanceDay) => row.subjectCount,
    },
    cell: ({ row }) => String(row.original.subjectCount),
  },
  {
    id: 'rooms',
    header: 'Jumlah Ruang',
    meta: {
      align: 'center',
      mobileValue: (row: AttendanceDay) => row.roomCount,
    },
    cell: ({ row }) => String(row.original.roomCount),
  },
  {
    id: 'students',
    header: 'Jumlah Peserta',
    meta: {
      align: 'center',
      mobileValue: (row: AttendanceDay) => row.studentCount,
    },
    cell: ({ row }) => String(row.original.studentCount),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        manageLabel: 'Lihat',
        hideEdit: true,
        hideDelete: true,
        items: [
          printItem(
            () =>
              void printRooms(
                row.original.subjects.flatMap((item) => item.rooms),
              ),
          ),
        ],
        onManage: () => goTo(activeEvent.value?.id ?? null, row.original.id),
      }),
  },
]

const subjectColumns: ColumnDef<AttendanceSubject>[] = [
  {
    id: 'subject',
    header: 'Mata Pelajaran',
    meta: {
      mobile: 'title',
      mobileValue: (row: AttendanceSubject) => row.subject,
    },
    cell: ({ row }) => row.original.subject,
  },
  {
    id: 'start',
    header: 'Jam Mulai',
    meta: {
      align: 'center',
      mobileValue: (row: AttendanceSubject) => clock(row.startsAt),
    },
    cell: ({ row }) => clock(row.original.startsAt),
  },
  {
    id: 'end',
    header: 'Jam Selesai',
    meta: {
      align: 'center',
      mobileValue: (row: AttendanceSubject) => clock(row.endsAt),
    },
    cell: ({ row }) => clock(row.original.endsAt),
  },
  {
    id: 'rooms',
    header: 'Jumlah Ruang',
    meta: {
      align: 'center',
      mobileValue: (row: AttendanceSubject) => row.roomCount,
    },
    cell: ({ row }) => String(row.original.roomCount),
  },
  {
    id: 'students',
    header: 'Jumlah Peserta',
    meta: {
      align: 'center',
      mobileValue: (row: AttendanceSubject) => row.studentCount,
    },
    cell: ({ row }) => String(row.original.studentCount),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        manageLabel: 'Lihat',
        hideEdit: true,
        hideDelete: true,
        items: [printItem(() => void printRooms(row.original.rooms))],
        onManage: () =>
          goTo(
            activeEvent.value?.id ?? null,
            row.original.dayKey,
            row.original.id,
          ),
      }),
  },
]

const roomColumns: ColumnDef<AttendanceRoom>[] = [
  {
    id: 'room',
    header: 'Ruangan',
    meta: {
      align: 'center',
      mobile: 'title',
      mobileValue: (row: AttendanceRoom) => row.roomName,
    },
    cell: ({ row }) => row.original.roomName,
  },
  {
    id: 'students',
    header: 'Jumlah Peserta',
    meta: {
      align: 'center',
      mobileValue: (row: AttendanceRoom) => row.students.length,
    },
    cell: ({ row }) => String(row.original.students.length),
  },
  {
    id: 'supervisor',
    header: 'Pengawas',
    meta: {
      mobileValue: (row: AttendanceRoom) => row.supervisorName ?? '-',
    },
    cell: ({ row }) => row.original.supervisorName ?? '-',
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        viewLabel: 'Pratinjau',
        hideEdit: true,
        hideDelete: true,
        items: [printItem(() => void printRooms([row.original]))],
        onView: () => openPreview(row.original),
      }),
  },
]

const columns = computed(() => {
  if (!activeEvent.value) return eventColumns as unknown as ColumnDef<Row>[]
  if (activeSubject.value) return roomColumns as unknown as ColumnDef<Row>[]
  if (activeDay.value) return subjectColumns as unknown as ColumnDef<Row>[]
  return dayColumns as unknown as ColumnDef<Row>[]
})

const sheetDate = computed(() =>
  previewRoom.value === null
    ? '-'
    : formatPrintDate(previewRoom.value.startsAt),
)
const sheetRange = computed(() =>
  previewRoom.value === null
    ? '-'
    : formatPrintRange(previewRoom.value.startsAt, previewRoom.value.endsAt),
)

watch(
  eventId,
  (next) => {
    void loadEventData(next)
  },
  { immediate: true },
)

watch(
  [search, semesterId, status],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

watch([eventId, dayId, subjectId], () => {
  search.value = ''
  page.value = 1
  previewOpen.value = false
})

watch(
  [loading, eventsLoaded, dataLoaded, activeEvent, activeDay, activeSubject],
  () => {
    if (loading.value) return
    if (
      eventId.value !== null &&
      eventsLoaded.value &&
      activeEvent.value === null
    ) {
      goTo(null)
      return
    }
    if (
      activeEvent.value === null ||
      !dataLoaded.value ||
      dataForEvent.value !== activeEvent.value.id
    ) {
      return
    }
    if (dayId.value !== null && activeDay.value === null) {
      goTo(activeEvent.value.id)
    } else if (
      dayId.value !== null &&
      subjectId.value !== null &&
      activeSubject.value === null
    ) {
      goTo(activeEvent.value.id, dayId.value)
    }
  },
)

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Cetak Dokumen', href: '#' },
  {
    title: 'Daftar Hadir Peserta',
    href: activeEvent.value ? '/exam/print/student-attendance' : '#',
  },
  ...(activeEvent.value
    ? [
        {
          title: activeEvent.value.name,
          href: activeDay.value
            ? `/exam/print/student-attendance/${activeEvent.value.id}`
            : '#',
        },
      ]
    : []),
  ...(activeDay.value && activeEvent.value
    ? [
        {
          title: dateOf(activeDay.value.startsAt),
          href: activeSubject.value
            ? `/exam/print/student-attendance/${activeEvent.value.id}/${activeDay.value.id}`
            : '#',
        },
      ]
    : []),
  ...(activeSubject.value
    ? [{ title: activeSubject.value.subject, href: '#' }]
    : []),
])

void loadEvents()
</script>

<template>
  <div class="print-body flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex min-w-0 items-center gap-3">
          <BackButton
            v-if="activeEvent"
            :label="backLabel"
            @click="goBack"
          />
          <CardTitle class="font-semibold">
            {{ pageTitle }}
          </CardTitle>
        </div>
        <Button
          v-if="activeEvent"
          class="shrink-0"
          :disabled="loading || printing || printTargets.length === 0"
          @click="printRooms(printTargets)"
        >
          <Printer class="size-4" />
          Cetak
        </Button>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
        <ServiceUnavailable
          v-if="error && isOutageMessage(error)"
          class="mx-4"
          subject="Daftar hadir peserta"
          :message="error"
          :retry="reloadCurrent"
          :is-retrying="loading"
        />
        <div
          v-else-if="error"
          class="m-4 space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-control">{{ error }}</p>
          <Button
            variant="outline"
            @click="reloadCurrent"
          >
            Coba lagi
          </Button>
        </div>
        <template v-else>
          <DataTable
            mobile="cards"
            :columns="columns"
            :data="paginatedRows"
            :page="page"
            :page-size="pageSize"
            :total-items="levelRows.length"
            :is-loading="loading"
            :item-label="itemLabel"
            :hide-pagination="activeEvent !== null"
            @update:page="page = $event"
            @update:page-size="changePageSize"
          >
            <template
              v-if="!activeEvent"
              #filters
            >
              <AcademicPeriodFilter v-model:semester-id="semesterId" />
              <FloatingLabelField
                label="Status"
                :for="statusFieldId"
                class="w-fit min-w-32"
                floating
              >
                <Select v-model="status">
                  <SelectTrigger
                    :id="statusFieldId"
                    class="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua</SelectItem>
                    <SelectItem
                      v-for="option in EVENT_STATUSES"
                      :key="option"
                      :value="option"
                    >
                      {{ eventStatusLabel(option) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FloatingLabelField>
            </template>
            <template #header-right>
              <SearchInput
                v-model="search"
                class="sm:w-40"
                :label="searchLabel"
              />
            </template>
            <template #mobile-toolbar>
              <SearchInput
                v-model="search"
                :label="searchLabel"
                class="w-full"
              />
            </template>
            <template #empty>
              <DataTableEmpty
                :message="
                  search
                    ? 'Tidak ada daftar hadir yang cocok dengan pencarian.'
                    : activeEvent
                      ? 'Belum ada jadwal pada periode ini.'
                      : 'Belum ada periode ujian.'
                "
              />
            </template>
          </DataTable>
        </template>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="previewOpen">
      <DialogContent
        size="xl"
        class="sm:max-w-[min(calc(100%-2rem),210mm)]"
      >
        <DialogHeader standard>
          <DialogTitle>Pratinjau Daftar Hadir Peserta</DialogTitle>
          <DialogDescription>
            Daftar hadir satu ruangan sebelum dicetak.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4 overflow-x-hidden">
          <div
            v-if="previewRoom"
            class="mx-auto w-full max-w-[190mm] rounded-md border p-2 print:hidden"
          >
            <AttendanceSheet
              :room-name="previewRoom.roomName"
              :date="sheetDate"
              :packages="previewRoom.subject"
              :time-range="sheetRange"
              :students="previewRoom.students"
              :paginate="false"
              :supervisor-name="previewRoom.supervisorName"
              :technician-name="previewRoom.technicianName"
            />
          </div>
        </DialogBody>
        <DialogFooter standard>
          <Button
            :disabled="previewRoom === null"
            @click="printSheet"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div
      v-if="batch.length === 0 && previewRoom !== null && previewOpen"
      class="print-only"
    >
      <AttendanceSheet
        :room-name="previewRoom.roomName"
        :date="sheetDate"
        :packages="previewRoom.subject"
        :time-range="sheetRange"
        :students="previewRoom.students"
        :supervisor-name="previewRoom.supervisorName"
        :technician-name="previewRoom.technicianName"
      />
    </div>

    <div
      v-if="batch.length > 0"
      class="print-only"
    >
      <div class="print-stack">
        <AttendanceSheet
          v-for="room in batch"
          :key="room.key"
          stacked
          :room-name="room.roomName"
          :date="formatPrintDate(room.startsAt)"
          :packages="room.subject"
          :time-range="formatPrintRange(room.startsAt, room.endsAt)"
          :students="room.students"
          :supervisor-name="room.supervisorName"
          :technician-name="room.technicianName"
        />
      </div>
    </div>
  </div>
</template>
