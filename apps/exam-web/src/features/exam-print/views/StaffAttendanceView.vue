<script setup lang="ts">
import { computed, h, nextTick, ref } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import {
  ActionCell,
  DataTable,
  SearchInput,
  ServiceUnavailable,
  DataTableEmpty,
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
import { usePrintPack } from '../composables/usePrintPack'
import { examRoomService } from '@/features/exam-room/services/examRoomService'
import type { RoomReportSummary } from '@/features/exam-room/types'
import { formatPrintDate, formatPrintRange } from '../format'
import { waitForPrintImages } from '../printImages'
import StaffAttendanceSheet from '../documents/StaffAttendanceSheet.vue'
import type { PrintPackRoom } from '../types'

interface DayEntry {
  id: string
  startsAt: string
  rooms: PrintPackRoom[]
  supervisorCount: number
}

const state = usePrintPack({ withSchedules: true })
const eventFieldId = 'staff-attendance-event'
const search = ref('')
const page = ref(1)
const pageSize = ref(25)

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}
const previewOpen = ref(false)
const previewDay = ref<DayEntry | null>(null)
const reports = ref<RoomReportSummary[]>([])

const dayKeyOf = (iso: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))

const dayLabelOf = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(iso))

const days = computed<DayEntry[]>(() => {
  const rooms = state.pack.value?.rooms ?? []
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
})

const filteredDays = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  if (keyword === '') return days.value
  return days.value.filter((day) =>
    [
      dayLabelOf(day.startsAt),
      ...day.rooms.map((room) => room.name),
      ...day.rooms.flatMap((room) =>
        room.supervisors.map((slot) => slot.name ?? ''),
      ),
    ].some((value) => value.toLocaleLowerCase('id').includes(keyword)),
  )
})

function sheetOf(day: DayEntry) {
  const ownRooms = new Set(day.rooms.map((room) => room.id))
  const rows = [
    ...new Map(
      reports.value
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

const stackDays = ref<DayEntry[]>([])
const stackSheets = computed(() => stackDays.value.map(sheetOf))
const printList = computed(() =>
  stackSheets.value.length > 0
    ? stackSheets.value
    : daySheet.value === null
      ? []
      : [daySheet.value],
)
const printingAll = ref(false)

async function printAll() {
  if (printingAll.value || filteredDays.value.length === 0) return
  printingAll.value = true
  try {
    stackDays.value = filteredDays.value
    await loadReports()
    await nextTick()
    await waitForPrintImages()
    printSheets()
  } finally {
    stackDays.value = []
    printingAll.value = false
  }
}

async function loadReports() {
  const eventId = state.eventId.value
  if (eventId === '') {
    reports.value = []
    return
  }
  const result = await examRoomService.loadReports(eventId)
  reports.value = result.success ? result.data : []
}

function openPreview(day: DayEntry) {
  previewDay.value = day
  previewOpen.value = true
  void loadReports()
}

const paginatedDays = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredDays.value.slice(start, start + pageSize.value)
})

const dayColumns: ColumnDef<DayEntry>[] = [
  {
    id: 'date',
    header: 'Tanggal',
    meta: {
      mobile: 'title',
      mobileValue: (row: DayEntry) => dayLabelOf(row.startsAt),
    },
    cell: ({ row }) => dayLabelOf(row.original.startsAt),
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

async function changeEvent(value: AcceptableValue) {
  if (typeof value !== 'string' || value === '') return
  previewOpen.value = false
  previewDay.value = null
  reports.value = []
  await state.changeEvent(value)
}

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  {
    title: 'Daftar Hadir Pengawas dan Teknisi',
    href: '/exam/print/staff-attendance',
  },
])
</script>

<template>
  <div class="print-body flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">
          Daftar Hadir Pengawas dan Teknisi
        </CardTitle>
        <Button
          class="shrink-0"
          :disabled="
            state.loading.value || filteredDays.length === 0 || printingAll
          "
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
          v-if="state.error.value && isOutageMessage(state.error.value)"
          class="mx-4"
          subject="Daftar hadir pengawas"
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
            :columns="dayColumns"
            :data="paginatedDays"
            :page="page"
            :page-size="pageSize"
            :total-items="filteredDays.length"
            :is-loading="state.loading.value"
            item-label="hari"
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
                label="Cari hari, ruangan, atau pengawas"
              />
            </template>
            <template #mobile-toolbar>
              <SearchInput
                v-model="search"
                label="Cari hari, ruangan, atau pengawas"
                class="w-full"
              />
            </template>
            <template #empty>
              <DataTableEmpty
                :message="
                  search
                    ? 'Tidak ada hari yang cocok dengan pencarian.'
                    : 'Belum ada jadwal pengawas pada periode ini.'
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
      <div
        v-for="sheet in printList"
        :key="sheet.key"
        class="break-after-page last:break-after-auto"
      >
        <StaffAttendanceSheet
          :date="sheet.date"
          :supervisors="sheet.supervisors"
          :technicians="sheet.technicians"
        />
      </div>
    </div>
  </div>
</template>
