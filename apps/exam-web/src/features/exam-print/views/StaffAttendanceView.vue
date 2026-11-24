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
import { examRoomService } from '@/features/exam-room/services/examRoomService'
import type { RoomReportSummary } from '@/features/exam-room/types'
import { examTypeLabel } from '@/features/exam-schedule/types'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { buildPrintEventColumns } from '../components/printEventColumns'
import StaffAttendanceSheet from '../documents/StaffAttendanceSheet.vue'
import { formatPrintDate, formatPrintRange } from '../format'
import { waitForPrintImages } from '../printImages'
import { examPrintService } from '../services/examPrintService'
import type { PrintPack, PrintPackRoom } from '../types'

interface DayEntry {
  id: string
  startsAt: string
  rooms: PrintPackRoom[]
  supervisorCount: number
}

interface BuiltStaffSheet {
  key: string
  date: string
  supervisors: {
    key: string
    name: string | null
    roomName: string
    subject: string
    time: string
    startsAt: string
  }[]
  technicians: {
    key: string
    name: string | null
    roomName: string
    time: string
  }[]
}

type Row = ExamEvent | DayEntry

const route = useRoute()
const router = useRouter()
const statusFieldId = useId()

const events = ref<ExamEvent[]>([])
const eventsLoaded = ref(false)
const pack = ref<PrintPack | null>(null)
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
const previewDay = ref<DayEntry | null>(null)
const reports = ref<RoomReportSummary[]>([])
const stackSheets = ref<BuiltStaffSheet[]>([])
const printingAll = ref(false)

const loading = computed(() => loadingEvents.value || loadingData.value)

const eventId = computed(() => {
  const value = route.params.eventId
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
})

const activeEvent = computed(
  () => events.value.find((event) => event.id === eventId.value) ?? null,
)

const hasEventData = computed(
  () =>
    dataForEvent.value !== null && dataForEvent.value === activeEvent.value?.id,
)

const dayKeyOf = (iso: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))

const dateOf = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'long',
  }).format(new Date(iso))

function daysOfRooms(rooms: PrintPackRoom[]): DayEntry[] {
  const map = new Map<string, DayEntry>()
  for (const room of rooms) {
    const keys = new Set(
      room.supervisors.map((slot) => dayKeyOf(slot.startsAt)),
    )
    for (const key of keys) {
      const entry = map.get(key) ?? {
        id: key,
        startsAt: room.supervisors.find(
          (slot) => dayKeyOf(slot.startsAt) === key,
        )!.startsAt,
        rooms: [],
        supervisorCount: 0,
      }
      entry.rooms.push(room)
      map.set(key, entry)
    }
  }
  for (const entry of map.values()) {
    entry.rooms.sort((a, b) => a.name.localeCompare(b.name, 'id'))
    entry.supervisorCount = entry.rooms.reduce(
      (sum, room) =>
        sum +
        room.supervisors.filter((slot) => dayKeyOf(slot.startsAt) === entry.id)
          .length,
      0,
    )
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id))
}

const days = computed<DayEntry[]>(() =>
  hasEventData.value ? daysOfRooms(pack.value?.rooms ?? []) : [],
)

const filteredDays = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  if (keyword === '') return days.value
  return days.value.filter((day) =>
    [
      dateOf(day.startsAt),
      ...day.rooms.map((room) => room.name),
      ...day.rooms.flatMap((room) =>
        room.supervisors.map((slot) => slot.name ?? ''),
      ),
    ].some((value) => value.toLocaleLowerCase('id').includes(keyword)),
  )
})

function matchesEvent(text: string): boolean {
  const needle = search.value.trim().toLowerCase()
  return needle === '' || text.toLowerCase().includes(needle)
}

const levelRows = computed<Row[]>(() => {
  if (!activeEvent.value) {
    return events.value.filter(
      (event) =>
        (!semesterId.value || event.semesterId === semesterId.value) &&
        (status.value === 'ALL' || event.status === status.value) &&
        (matchesEvent(event.name) ||
          matchesEvent(examTypeLabel(event.type)) ||
          matchesEvent(eventStatusLabel(event.status))),
    )
  }
  return filteredDays.value
})

const paginatedRows = computed(() => {
  if (activeEvent.value) return levelRows.value
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

const pageTitle = computed(() =>
  activeEvent.value
    ? activeEvent.value.name
    : 'Daftar Hadir Pengawas dan Teknisi',
)

const itemLabel = computed(() => (activeEvent.value ? 'hari' : 'periode'))

const searchLabel = computed(() =>
  activeEvent.value ? 'Cari hari, ruangan, atau pengawas' : 'Cari periode',
)

function goTo(nextEventId: string | null) {
  void router.push({
    name: 'ExamPrintStaffAttendance',
    params: nextEventId === null ? {} : { eventId: nextEventId },
  })
}

function sheetOf(
  day: DayEntry,
  reportRows: RoomReportSummary[] = reports.value,
): BuiltStaffSheet {
  const ownRooms = new Set(day.rooms.map((room) => room.id))
  const rows = [
    ...new Map(
      reportRows
        .filter(
          (row) =>
            ownRooms.has(row.roomId) && dayKeyOf(row.startsAt) === day.id,
        )
        .map((row) => [row.slotId, row]),
    ).values(),
  ]
  const supervisors = rows
    .map((row) => ({
      key: `${row.roomId}-${row.slotId}`,
      name: row.supervisorName,
      roomName: row.roomName,
      subject:
        row.subjectNames.length === 0 ? '-' : row.subjectNames.join(', '),
      time: formatPrintRange(row.startsAt, row.endsAt),
      startsAt: row.startsAt,
    }))
    .sort(
      (a, b) =>
        a.startsAt.localeCompare(b.startsAt) ||
        a.roomName.localeCompare(b.roomName, 'id'),
    )
  const roomIds = [...new Set(rows.map((row) => row.roomId))]
  const technicians = roomIds
    .map((roomId) => {
      const room = day.rooms.find((item) => item.id === roomId)
      if (room?.technician == null) return null
      const slots = rows
        .filter((row) => row.roomId === roomId)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      const startsAt = slots[0]?.startsAt
      const endsAt = slots[slots.length - 1]?.endsAt
      return {
        key: room.id,
        name: room.technician.name,
        roomName: room.name,
        time:
          startsAt === undefined || endsAt === undefined
            ? '-'
            : formatPrintRange(startsAt, endsAt),
      }
    })
    .filter(
      (
        row,
      ): row is {
        key: string
        name: string | null
        roomName: string
        time: string
      } => row !== null,
    )
    .sort((a, b) => a.roomName.localeCompare(b.roomName, 'id'))
  return {
    key: day.id,
    date: formatPrintDate(day.startsAt),
    supervisors,
    technicians,
  }
}

const daySheet = computed(() =>
  previewDay.value === null ? null : sheetOf(previewDay.value),
)

const printList = computed(() =>
  stackSheets.value.length > 0
    ? stackSheets.value
    : daySheet.value === null
      ? []
      : [daySheet.value],
)

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
    reports.value = []
    dataLoaded.value = false
    dataForEvent.value = null
    loadingData.value = false
    return
  }
  loadingData.value = true
  error.value = null
  dataLoaded.value = false
  dataForEvent.value = null
  reports.value = []
  try {
    const result = await examPrintService.loadPack(targetEventId)
    if (eventId.value !== targetEventId) return
    if (!result.success) {
      error.value = result.error
      pack.value = null
      return
    }
    pack.value = result.data
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

async function loadReports(
  targetEventId: string | null = activeEvent.value?.id ?? null,
) {
  if (!targetEventId) {
    reports.value = []
    return []
  }
  const result = await examRoomService.loadReports(targetEventId)
  const loaded = result.success ? result.data : []
  if (targetEventId === activeEvent.value?.id) reports.value = loaded
  return loaded
}

async function printAll() {
  if (printingAll.value || filteredDays.value.length === 0) return
  printingAll.value = true
  try {
    const loaded = await loadReports()
    stackSheets.value = filteredDays.value.map((day) => sheetOf(day, loaded))
    await nextTick()
    await waitForPrintImages()
    printSheets()
  } finally {
    stackSheets.value = []
    printingAll.value = false
  }
}

async function printEvent(event: ExamEvent) {
  if (printingAll.value) return
  printingAll.value = true
  try {
    const packResult =
      dataForEvent.value === event.id && pack.value !== null
        ? { success: true as const, data: pack.value }
        : await examPrintService.loadPack(event.id)
    if (!packResult.success) {
      toast.error(packResult.error)
      return
    }
    const eventDays = daysOfRooms(packResult.data.rooms)
    if (eventDays.length === 0) {
      toast.info('Belum ada jadwal pengawas pada periode ini.')
      return
    }
    const loaded = await loadReports(event.id)
    stackSheets.value = eventDays.map((day) => sheetOf(day, loaded))
    await nextTick()
    await waitForPrintImages()
    printSheets()
  } finally {
    stackSheets.value = []
    printingAll.value = false
  }
}

function openPreview(day: DayEntry) {
  previewDay.value = day
  previewOpen.value = true
  void loadReports()
}

async function printDay(day: DayEntry) {
  previewDay.value = day
  await loadReports()
  await nextTick()
  await waitForPrintImages()
  printSheets()
}

function printSheets() {
  document.body.classList.add('printing-stack')
  window.print()
  document.body.classList.remove('printing-stack')
}

const eventColumns = buildPrintEventColumns({
  formatDate: dateOf,
  onView: (event) => goTo(event.id),
  onPrint: (event) => void printEvent(event),
})

const dayColumns: ColumnDef<DayEntry>[] = [
  {
    id: 'date',
    header: 'Tanggal',
    meta: {
      mobile: 'title',
      mobileValue: (row: DayEntry) => dateOf(row.startsAt),
    },
    cell: ({ row }) => dateOf(row.original.startsAt),
  },
  {
    id: 'rooms',
    header: 'Ruangan',
    meta: {
      align: 'center',
      mobileValue: (row: DayEntry) => row.rooms.length,
    },
    cell: ({ row }) => String(row.original.rooms.length),
  },
  {
    id: 'supervisors',
    header: 'Pengawas',
    meta: {
      align: 'center',
      mobileValue: (row: DayEntry) => row.supervisorCount,
    },
    cell: ({ row }) => String(row.original.supervisorCount),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        manageLabel: 'Pratinjau',
        hideEdit: true,
        hideDelete: true,
        items: [
          {
            label: 'Cetak',
            icon: Printer,
            onClick: () => void printDay(row.original),
          },
        ],
        onManage: () => openPreview(row.original),
      }),
  },
]

const columns = computed(() =>
  activeEvent.value
    ? (dayColumns as unknown as ColumnDef<Row>[])
    : (eventColumns as unknown as ColumnDef<Row>[]),
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

watch(eventId, () => {
  search.value = ''
  page.value = 1
  previewOpen.value = false
  previewDay.value = null
})

watch([loading, eventsLoaded, activeEvent], () => {
  if (loading.value) return
  if (
    eventId.value !== null &&
    eventsLoaded.value &&
    activeEvent.value === null
  ) {
    goTo(null)
  }
})

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Cetak Dokumen', href: '#' },
  {
    title: 'Daftar Hadir Pengawas dan Teknisi',
    href: activeEvent.value ? '/exam/print/staff-attendance' : '#',
  },
  ...(activeEvent.value ? [{ title: activeEvent.value.name, href: '#' }] : []),
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
            label="Kembali ke daftar periode"
            @click="goTo(null)"
          />
          <CardTitle class="font-semibold">
            {{ pageTitle }}
          </CardTitle>
        </div>
        <Button
          v-if="activeEvent"
          class="shrink-0"
          :disabled="loading || filteredDays.length === 0 || printingAll"
          @click="printAll"
        >
          <Printer class="size-4" />
          {{ printingAll ? 'Menyiapkan…' : 'Cetak' }}
        </Button>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
        <ServiceUnavailable
          v-if="error && isOutageMessage(error)"
          class="mx-4"
          subject="Daftar hadir pengawas"
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
                    ? 'Tidak ada data yang cocok dengan pencarian.'
                    : activeEvent
                      ? 'Belum ada jadwal pengawas pada periode ini.'
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
          <DialogTitle>Pratinjau Daftar Hadir Pengawas dan Teknisi</DialogTitle>
          <DialogDescription>
            Pengawas di halaman pertama, teknisi di halaman berikutnya.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4 overflow-x-hidden">
          <div
            v-if="daySheet"
            class="mx-auto w-full max-w-[190mm] rounded-md border p-2 print:hidden"
          >
            <StaffAttendanceSheet
              :date="daySheet.date"
              :supervisors="daySheet.supervisors"
              :technicians="daySheet.technicians"
            />
          </div>
          <p
            v-else
            class="text-control text-muted-foreground"
          >
            Pilih hari untuk melihat pratinjau.
          </p>
        </DialogBody>
        <DialogFooter standard>
          <Button
            :disabled="daySheet === null"
            @click="printSheets"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div
      v-if="printList.length > 0"
      class="print-only"
    >
      <div class="print-stack">
        <StaffAttendanceSheet
          v-for="sheet in printList"
          :key="sheet.key"
          stacked
          :date="sheet.date"
          :supervisors="sheet.supervisors"
          :technicians="sheet.technicians"
        />
      </div>
    </div>
  </div>
</template>
