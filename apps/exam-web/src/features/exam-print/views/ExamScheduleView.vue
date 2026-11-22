<script setup lang="ts">
import { computed, h, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import {
  ActionCell,
  BackButton,
  DataTable,
  DataTableEmpty,
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
import { Printer } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { examEventService } from '@/features/exam-event/services/examEventService'
import type { ExamEvent } from '@/features/exam-event/types'
import { examTypeLabel } from '@/features/exam-schedule/types'
import { isOutageMessage } from '@mts241alikhlash/web-shared/utils/service-error'
import { dayKeyOf } from '@/features/exam-schedule/utils/groupSchedules'
import { usePackageSubjects } from '@/features/exam-shared/usePackageSubjects'
import ExamScheduleDocument from '../documents/ExamScheduleDocument.vue'
import { examPrintService } from '../services/examPrintService'
import { waitForPrintImages } from '../printImages'
import type { PrintSchedule } from '../types'

interface DayEntry {
  id: string
  startsAt: string
  endsAt: string
  schedules: PrintSchedule[]
  subjectCount: number
  classCount: number
}

const route = useRoute()
const router = useRouter()
const { subjectOf } = usePackageSubjects()

const events = ref<ExamEvent[]>([])
const schedules = ref<PrintSchedule[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const eventId = computed(() => {
  const value = route.params.eventId
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
})
const activeEvent = computed(
  () => events.value.find((item) => item.id === eventId.value) ?? null,
)
const page = ref(1)
const pageSize = ref(25)
const previewOpen = ref(false)
const previewDay = ref<DayEntry | null>(null)
const printList = ref<PrintSchedule[]>([])
const printEvent = ref<ExamEvent | null>(null)
const printing = ref(false)

const days = computed<DayEntry[]>(() => {
  const byDay = new Map<string, PrintSchedule[]>()
  for (const item of schedules.value) {
    if (item.status === 'CANCELLED' || item.kind === 'MAKEUP') continue
    const key = dayKeyOf(item.startsAt)
    byDay.set(key, [...(byDay.get(key) ?? []), item])
  }
  return [...byDay]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, schedules]) => ({
      id,
      startsAt: schedules.reduce(
        (first, item) => (item.startsAt < first ? item.startsAt : first),
        schedules[0].startsAt,
      ),
      schedules,
      endsAt: schedules.reduce(
        (last, item) => (item.endsAt > last ? item.endsAt : last),
        schedules[0].endsAt,
      ),
      subjectCount: new Set(
        schedules.map((item) => subjectOf(item.packageId, item.packageTitle)),
      ).size,
      classCount: new Set(schedules.map((item) => item.classroomName)).size,
    }))
})

const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return days.value.slice(start, start + pageSize.value)
})

const allSchedules = computed(() => days.value.flatMap((day) => day.schedules))

const levelTotal = computed(() =>
  activeEvent.value === null ? events.value.length : days.value.length,
)

const pagedEvents = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return events.value.slice(start, start + pageSize.value)
})

const fullDateOf = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
  }).format(new Date(iso))

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

function openPreview(day: DayEntry) {
  previewDay.value = day
  previewOpen.value = true
}

const printable = (items: PrintSchedule[]): PrintSchedule[] =>
  items.filter((item) => item.status !== 'CANCELLED' && item.kind !== 'MAKEUP')

async function printEventSchedules(event: ExamEvent) {
  if (printing.value) return
  const notice = toast.loading('Menyiapkan jadwal...')
  const result = await examPrintService.loadSchedules(event)
  toast.dismiss(notice)
  if (!result.success) {
    toast.error(result.error)
    return
  }
  const items = printable(result.data)
  if (items.length === 0) {
    toast.error('Belum ada jadwal pada periode ini.')
    return
  }
  printEvent.value = event
  await printSchedules(items)
}

async function printSchedules(schedules: PrintSchedule[]) {
  if (printing.value || schedules.length === 0) return
  printing.value = true
  try {
    printList.value = schedules
    await nextTick()
    await waitForPrintImages()
    document.body.classList.add('printing-stack')
    window.print()
    document.body.classList.remove('printing-stack')
  } finally {
    printList.value = []
    printEvent.value = null
    printing.value = false
  }
}

const columns: ColumnDef<DayEntry>[] = [
  {
    id: 'date',
    header: 'Hari, Tanggal',
    meta: {
      mobile: 'title',
      mobileValue: (row: DayEntry) => fullDateOf(row.startsAt),
    },
    cell: ({ row }) => fullDateOf(row.original.startsAt),
  },
  {
    id: 'start',
    header: 'Jam Mulai',
    meta: {
      align: 'center',
      mobileValue: (row: DayEntry) => clock(row.startsAt),
    },
    cell: ({ row }) => clock(row.original.startsAt),
  },
  {
    id: 'end',
    header: 'Jam Selesai',
    meta: {
      align: 'center',
      mobileValue: (row: DayEntry) => clock(row.endsAt),
    },
    cell: ({ row }) => clock(row.original.endsAt),
  },
  {
    id: 'subjects',
    header: 'Jumlah Mapel',
    meta: { align: 'center', mobileValue: (row: DayEntry) => row.subjectCount },
    cell: ({ row }) => String(row.original.subjectCount),
  },
  {
    id: 'classes',
    header: 'Jumlah Kelas',
    meta: { align: 'center', mobileValue: (row: DayEntry) => row.classCount },
    cell: ({ row }) => String(row.original.classCount),
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
        items: [
          {
            label: 'Cetak',
            icon: Printer,
            onClick: () => void printSchedules(row.original.schedules),
          },
        ],
        onView: () => openPreview(row.original),
      }),
  },
]

const eventColumns: ColumnDef<ExamEvent>[] = [
  {
    id: 'type',
    header: 'Jenis',
    meta: {
      align: 'center',
      mobileValue: (row: ExamEvent) => examTypeLabel(row.type),
    },
    cell: ({ row }) => examTypeLabel(row.original.type),
  },
  {
    id: 'name',
    header: 'Periode Ujian',
    meta: { mobile: 'title', mobileValue: (row: ExamEvent) => row.name },
    cell: ({ row }) => row.original.name,
  },
  {
    id: 'startDate',
    header: 'Tanggal Mulai',
    meta: {
      align: 'center',
      mobileLabel: 'Tanggal Mulai',
      mobileValue: (row: ExamEvent) => dateOf(row.startsAt),
    },
    cell: ({ row }) => dateOf(row.original.startsAt),
  },
  {
    id: 'endDate',
    header: 'Tanggal Selesai',
    meta: {
      align: 'center',
      mobileLabel: 'Tanggal Selesai',
      mobileValue: (row: ExamEvent) => dateOf(row.endsAt),
    },
    cell: ({ row }) => dateOf(row.original.endsAt),
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
          {
            label: 'Cetak',
            icon: Printer,
            onClick: () => void printEventSchedules(row.original),
          },
        ],
        onManage: () => openEvent(row.original),
      }),
  },
]

function openEvent(event: ExamEvent) {
  page.value = 1
  void router.push({
    name: 'ExamPrint-schedule',
    params: { eventId: event.id },
  })
}

function goBack() {
  previewOpen.value = false
  page.value = 1
  void router.push({ name: 'ExamPrint-schedule' })
}

async function loadEvents() {
  loading.value = true
  error.value = null
  const result = await examEventService.loadEvents({ limit: 200 })
  loading.value = false
  if (result.success) events.value = result.data
  else error.value = result.error
}

async function loadSchedules() {
  const event = activeEvent.value
  schedules.value = []
  if (event === null) return
  loading.value = true
  error.value = null
  const result = await examPrintService.loadSchedules(event)
  loading.value = false
  if (result.success) schedules.value = result.data
  else error.value = result.error
}

async function load() {
  await loadEvents()
  await loadSchedules()
}

onMounted(load)

watch(eventId, () => void loadSchedules())

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Cetak Dokumen', href: '#' },
  { title: 'Jadwal Ujian', href: '/exam/print/schedule' },
  ...(activeEvent.value ? [{ title: activeEvent.value.name, href: '#' }] : []),
])

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

watch(levelTotal, () => {
  const lastPage = Math.max(1, Math.ceil(levelTotal.value / pageSize.value))
  if (page.value > lastPage) page.value = lastPage
})
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
            label="Kembali ke Periode Ujian"
            @click="goBack"
          />
          <CardTitle class="font-semibold">
            {{ activeEvent ? activeEvent.name : 'Jadwal Ujian' }}
          </CardTitle>
        </div>
        <Button
          v-if="activeEvent"
          class="shrink-0"
          :disabled="loading || printing || allSchedules.length === 0"
          @click="printSchedules(allSchedules)"
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
          subject="Jadwal ujian"
          :message="error"
          :retry="load"
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
            @click="load"
          >
            Coba lagi
          </Button>
        </div>
        <DataTable
          v-else-if="activeEvent === null"
          mobile="cards"
          :columns="eventColumns"
          :data="pagedEvents"
          :page="page"
          :page-size="pageSize"
          :total-items="events.length"
          :is-loading="loading"
          item-label="periode ujian"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #empty>
            <DataTableEmpty message="Belum ada periode ujian." />
          </template>
        </DataTable>
        <DataTable
          v-else
          mobile="cards"
          :columns="columns"
          :data="paginated"
          :page="page"
          :page-size="pageSize"
          :total-items="days.length"
          :is-loading="loading"
          item-label="hari"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #empty>
            <DataTableEmpty message="Belum ada jadwal pada periode ini." />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="previewOpen">
      <DialogContent
        size="xl"
        class="sm:max-w-[min(calc(100%-2rem),210mm)]"
      >
        <DialogHeader standard>
          <DialogTitle>Pratinjau Jadwal Ujian</DialogTitle>
          <DialogDescription>
            Jadwal ujian satu hari sebelum dicetak.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4 overflow-x-hidden">
          <div
            v-if="previewDay && activeEvent"
            class="mx-auto w-full max-w-[190mm] rounded-md border p-2"
          >
            <ExamScheduleDocument
              :event="activeEvent"
              :schedules="previewDay.schedules"
            />
          </div>
        </DialogBody>
        <DialogFooter standard>
          <Button
            :disabled="printing || previewDay === null"
            @click="previewDay && printSchedules(previewDay.schedules)"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div
      v-if="printList.length > 0 && (printEvent ?? activeEvent)"
      class="print-only"
    >
      <ExamScheduleDocument
        :event="(printEvent ?? activeEvent)!"
        :schedules="printList"
      />
    </div>
  </div>
</template>
