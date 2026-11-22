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
import type { AcceptableValue } from '@mts241alikhlash/ui/select'
import { Printer } from '@lucide/vue'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { isOutageMessage } from '@mts241alikhlash/web-shared/utils/service-error'
import { usePackageSubjects } from '@/features/exam-shared/usePackageSubjects'
import AttendanceSheet from '../documents/AttendanceSheet.vue'
import { usePrintPack } from '../composables/usePrintPack'
import { formatPrintDate, formatPrintRange } from '../format'
import { waitForPrintImages } from '../printImages'
import {
  buildAttendanceDays,
  filterAttendanceDays,
  type AttendanceDay,
  type AttendanceRoom,
  type AttendanceSubject,
} from '../utils/attendanceUnits'

const route = useRoute()
const router = useRouter()
const state = usePrintPack({ withSchedules: true })
const { subjectOf } = usePackageSubjects()

const eventFieldId = useId()
const search = ref('')
const page = ref(1)
const pageSize = ref(25)
const previewOpen = ref(false)
const previewRoom = ref<AttendanceRoom | null>(null)
const batch = ref<AttendanceRoom[]>([])
const printing = ref(false)

const paramValue = (name: string): string | null => {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}

const dayId = computed(() => paramValue('dayId'))
const subjectId = computed(() => paramValue('subjectId'))

const allDays = computed(() =>
  state.pack.value === null
    ? []
    : buildAttendanceDays(state.pack.value, state.schedules.value, (item) =>
        subjectOf(item.packageId, item.packageTitle),
      ),
)
const days = computed(() => filterAttendanceDays(allDays.value, search.value))

const activeDay = computed(
  () => days.value.find((day) => day.id === dayId.value) ?? null,
)
const activeSubject = computed(
  () =>
    activeDay.value?.subjects.find((item) => item.id === subjectId.value) ??
    null,
)

type Row = AttendanceDay | AttendanceSubject | AttendanceRoom

const levelRows = computed<Row[]>(() => {
  if (activeSubject.value) return activeSubject.value.rooms
  if (activeDay.value) return activeDay.value.subjects
  return days.value
})

const paginatedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

const printTargets = computed<AttendanceRoom[]>(() => {
  if (activeSubject.value) return activeSubject.value.rooms
  if (activeDay.value) {
    return activeDay.value.subjects.flatMap((item) => item.rooms)
  }
  return days.value.flatMap((day) => day.subjects.flatMap((item) => item.rooms))
})

const dateOf = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(iso))

const clock = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))

const pageTitle = computed(() => {
  if (activeSubject.value) return activeSubject.value.subject
  if (activeDay.value) return dateOf(activeDay.value.startsAt)
  return 'Daftar Hadir Peserta'
})

const backLabel = computed(() =>
  activeSubject.value ? 'Kembali ke daftar mapel' : 'Kembali ke semua hari',
)

const itemLabel = computed(() =>
  activeSubject.value ? 'ruangan' : activeDay.value ? 'mapel' : 'hari',
)

function goTo(day: string | null, subject: string | null = null) {
  const params: Record<string, string> = {}
  if (day !== null) params.dayId = day
  if (day !== null && subject !== null) params.subjectId = subject
  void router.push({ name: 'ExamPrintStudentAttendance', params })
}

function goBack() {
  if (activeSubject.value) goTo(dayId.value)
  else goTo(null)
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
    header: 'Jumlah Mapel',
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
        onManage: () => goTo(row.original.id),
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
        onManage: () => goTo(row.original.dayKey, row.original.id),
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

const columns = computed(
  () =>
    (activeSubject.value
      ? roomColumns
      : activeDay.value
        ? subjectColumns
        : dayColumns) as unknown as ColumnDef<Row>[],
)

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

async function changeEvent(value: AcceptableValue) {
  if (typeof value !== 'string' || value === '') return
  previewOpen.value = false
  goTo(null)
  await state.changeEvent(value)
}

watch(
  search,
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

watch(
  () => [route.params.dayId, route.params.subjectId],
  () => {
    page.value = 1
    previewOpen.value = false
  },
)

watch([days, () => route.params.dayId], () => {
  if (state.loading.value) return
  if (dayId.value !== null && activeDay.value === null) goTo(null)
  else if (
    dayId.value !== null &&
    subjectId.value !== null &&
    activeSubject.value === null
  ) {
    goTo(dayId.value)
  }
})

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Daftar Hadir Peserta', href: '/exam/print/student-attendance' },
  ...(activeDay.value
    ? [
        {
          title: dateOf(activeDay.value.startsAt),
          href: `/exam/print/student-attendance/${activeDay.value.id}`,
        },
      ]
    : []),
  ...(activeSubject.value
    ? [{ title: activeSubject.value.subject, href: '#' }]
    : []),
])
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
            v-if="activeDay"
            :label="backLabel"
            @click="goBack"
          />
          <CardTitle class="font-semibold">
            {{ pageTitle }}
          </CardTitle>
        </div>
        <Button
          class="shrink-0"
          :disabled="
            state.loading.value || printing || printTargets.length === 0
          "
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
          v-if="state.error.value && isOutageMessage(state.error.value)"
          class="mx-4"
          subject="Daftar hadir peserta"
          :message="state.error.value"
          :retry="state.loadPack"
          :is-retrying="state.loading.value"
        />
        <div
          v-else-if="state.error.value"
          class="m-4 space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-control">{{ state.error.value }}</p>
          <Button
            variant="outline"
            @click="state.loadPack"
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
            :is-loading="state.loading.value"
            :item-label="itemLabel"
            @update:page="page = $event"
            @update:page-size="changePageSize"
          >
            <template #filters>
              <FloatingLabelField
                label="Periode Ujian"
                :for="eventFieldId"
                class="w-fit min-w-40"
                floating
              >
                <Select
                  :model-value="state.eventId.value"
                  @update:model-value="changeEvent"
                >
                  <SelectTrigger
                    :id="eventFieldId"
                    class="w-full"
                  >
                    <SelectValue placeholder="Pilih periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="event in state.events.value"
                      :key="event.id"
                      :value="event.id"
                    >
                      {{ event.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FloatingLabelField>
            </template>
            <template #header-right>
              <SearchInput
                v-model="search"
                class="sm:w-40"
                label="Cari ruangan atau mapel"
              />
            </template>
            <template #mobile-toolbar>
              <SearchInput
                v-model="search"
                label="Cari ruangan atau mapel"
                class="w-full"
              />
            </template>
            <template #empty>
              <DataTableEmpty
                :message="
                  search
                    ? 'Tidak ada daftar hadir yang cocok dengan pencarian.'
                    : 'Belum ada jadwal pada periode ini.'
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
