<script setup lang="ts">
import { computed, h, onScopeDispose, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import { Printer } from '@lucide/vue'
import { toast } from 'vue-sonner'
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
import {
  compareClassroom,
  compareGrade,
} from '@/features/exam-shared/classroomName'
import { buildPrintEventColumns } from '../components/printEventColumns'
import {
  ALL_SCOPES,
  usePrintScope,
  type PrintScopeOption,
} from '../composables/usePrintScope'
import { PRINT_DOCUMENTS } from '../documents'
import PrintParticipantDocument from '../documents/PrintParticipantDocument.vue'
import { gradeOf } from '../format'
import { examPrintService } from '../services/examPrintService'
import type { PrintDocumentKey, PrintPack, PrintPackRoom } from '../types'

type Row = ExamEvent | PrintPackRoom

const CAKUPAN = {
  all: 'Semua dokumen',
  room: 'Per ruangan',
  class: 'Per kelas',
  grade: 'Per tingkat',
} as const

type Cakupan = keyof typeof CAKUPAN

const props = defineProps<{ doc: PrintDocumentKey }>()

const route = useRoute()
const router = useRouter()
const statusFieldId = useId()
const scopeFieldId = useId()
const targetFieldId = useId()
const { scope, printWith } = usePrintScope()

const definition = computed(() => PRINT_DOCUMENTS[props.doc])
const kind = computed<'card' | 'seat'>(() =>
  props.doc === 'cards' ? 'card' : 'seat',
)

const events = ref<ExamEvent[]>([])
const eventsLoaded = ref(false)
const pack = ref<PrintPack | null>(null)
const printOverridePack = ref<PrintPack | null>(null)
const dataLoaded = ref(false)
const dataForEvent = ref<string | null>(null)
const loadingEvents = ref(false)
const loadingData = ref(false)
const resetting = ref(false)
const confirmingReset = ref(false)
const printOpen = ref(false)
const cakupan = ref<Cakupan>('all')
const target = ref('')
const error = ref<string | null>(null)

const semesterId = ref('')
const status = ref('ALL')
const search = ref('')
const page = ref(1)
const pageSize = ref(25)

const loading = computed(() => loadingEvents.value || loadingData.value)

const paramValue = (name: 'eventId' | 'roomId'): string | null => {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}

const eventId = computed(() => paramValue('eventId'))
const roomId = computed(() => paramValue('roomId'))

const activeEvent = computed(
  () => events.value.find((event) => event.id === eventId.value) ?? null,
)

const hasEventData = computed(
  () =>
    dataForEvent.value !== null && dataForEvent.value === activeEvent.value?.id,
)

const activePack = computed(() => (hasEventData.value ? pack.value : null))

const rooms = computed<PrintPackRoom[]>(() =>
  [...(activePack.value?.rooms ?? [])].sort((left, right) =>
    left.code.localeCompare(right.code, 'id', { numeric: true }),
  ),
)

const activeRoom = computed(() =>
  hasEventData.value
    ? (rooms.value.find((room) => room.id === roomId.value) ?? null)
    : null,
)

const warnings = computed(() => activePack.value?.warnings ?? [])

const credentialsHeld = computed(() =>
  (pack.value?.rooms ?? []).some((room) =>
    room.students.some((student) => student.credential != null),
  ),
)

function warnBeforeLeave(event: BeforeUnloadEvent) {
  event.preventDefault()
}

watch(credentialsHeld, (held) => {
  if (held) window.addEventListener('beforeunload', warnBeforeLeave)
  else window.removeEventListener('beforeunload', warnBeforeLeave)
})
onScopeDispose(() =>
  window.removeEventListener('beforeunload', warnBeforeLeave),
)

const hasContent = computed(() =>
  activeRoom.value
    ? activeRoom.value.students.length > 0
    : rooms.value.some((room) => room.students.length > 0),
)

const dateOf = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'long',
  }).format(new Date(iso))

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
  return rooms.value.filter(
    (room) =>
      matches(room.code) || matches(room.name) || matches(room.building ?? ''),
  )
})

const paginatedRows = computed(() => {
  if (activeEvent.value) return levelRows.value
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

const pageTitle = computed(() => {
  if (activeRoom.value)
    return `${activeRoom.value.code} · ${activeRoom.value.name}`
  if (activeEvent.value) return activeEvent.value.name
  return definition.value.title
})

const backLabel = computed(() =>
  activeRoom.value ? 'Kembali ke daftar ruangan' : 'Kembali ke daftar periode',
)

const itemLabel = computed(() => (activeEvent.value ? 'ruangan' : 'periode'))

const searchLabel = computed(() =>
  activeEvent.value ? 'Cari ruangan' : 'Cari periode',
)

const routeName = computed(() => `ExamPrint-${props.doc}`)

function goTo(nextEventId: string | null, nextRoomId: string | null = null) {
  const params: Record<string, string> = {}
  if (nextEventId !== null) params.eventId = nextEventId
  if (nextEventId !== null && nextRoomId !== null) params.roomId = nextRoomId
  void router.push({ name: routeName.value, params })
}

function goBack() {
  if (activeRoom.value && activeEvent.value) {
    goTo(activeEvent.value.id)
    return
  }
  goTo(null)
}

const scopes = computed<PrintScopeOption[]>(() => {
  const classes = [
    ...new Set(
      rooms.value.flatMap((room) =>
        room.students
          .map((student) => student.classroomName)
          .filter((name): name is string => name !== null),
      ),
    ),
  ].sort(compareClassroom)
  const grades = [
    ...new Set(
      classes.map((name) => gradeOf(name)).filter((grade) => grade !== null),
    ),
  ].sort(compareGrade)
  return [
    ...rooms.value.map((room) => ({
      key: `room:${room.id}`,
      label: `${room.code} · ${room.name}`,
      group: 'room' as const,
    })),
    ...classes.map((name) => ({
      key: `class:${name}`,
      label: name,
      group: 'class' as const,
    })),
    ...grades.map((grade) => ({
      key: `grade:${grade}`,
      label: `Tingkat ${grade}`,
      group: 'grade' as const,
    })),
  ]
})

const availableCakupan = computed(() =>
  (Object.keys(CAKUPAN) as Cakupan[]).filter(
    (key) => key === 'all' || scopes.value.some((item) => item.group === key),
  ),
)

const targetScopes = computed(() =>
  scopes.value.filter((item) => item.group === cakupan.value),
)

const targetLabel = computed(() =>
  cakupan.value === 'grade'
    ? 'Tingkat'
    : cakupan.value === 'room'
      ? 'Ruang'
      : 'Kelas',
)

const targetPlaceholder = computed(() =>
  cakupan.value === 'grade'
    ? 'Pilih tingkat'
    : cakupan.value === 'room'
      ? 'Pilih ruangan'
      : 'Pilih kelas',
)

const canConfirm = computed(
  () =>
    cakupan.value === 'all' ||
    targetScopes.value.some((item) => item.key === target.value),
)

function openPrint() {
  if (activeRoom.value) {
    void printWith(`room:${activeRoom.value.id}`)
    return
  }
  cakupan.value = 'all'
  target.value = ''
  printOpen.value = true
}

const asText = (value: AcceptableValue) =>
  typeof value === 'string' ? value : ''

function changeCakupan(value: AcceptableValue) {
  const next = asText(value)
  if (
    next !== 'all' &&
    next !== 'room' &&
    next !== 'class' &&
    next !== 'grade'
  ) {
    return
  }
  cakupan.value = next
  target.value = ''
}

function confirmPrint() {
  if (!canConfirm.value) return
  printOpen.value = false
  void printWith(target.value === '' ? ALL_SCOPES : target.value)
}

const printSourcePack = computed(
  () => printOverridePack.value ?? activePack.value,
)

const printedRooms = computed<PrintPackRoom[]>(() => {
  const sourceRooms = printSourcePack.value?.rooms ?? []
  if (scope.value === ALL_SCOPES) {
    return activeRoom.value ? [activeRoom.value] : sourceRooms
  }
  if (scope.value.startsWith('room:')) {
    const id = scope.value.slice('room:'.length)
    return sourceRooms.filter((room) => room.id === id)
  }
  if (scope.value.startsWith('one:')) {
    const studentId = scope.value.slice('one:'.length)
    return sourceRooms
      .map((room) => ({
        ...room,
        students: room.students.filter(
          (student) => student.studentId === studentId,
        ),
      }))
      .filter((room) => room.students.length > 0)
  }
  const isGrade = scope.value.startsWith('grade:')
  const value = scope.value.slice(isGrade ? 'grade:'.length : 'class:'.length)
  return sourceRooms
    .map((room) => ({
      ...room,
      students: room.students.filter((student) =>
        isGrade
          ? gradeOf(student.classroomName) === value
          : student.classroomName === value,
      ),
    }))
    .filter((room) => room.students.length > 0)
})

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

async function printEvent(event: ExamEvent) {
  const packResult =
    dataForEvent.value === event.id && pack.value !== null
      ? { success: true as const, data: pack.value }
      : await examPrintService.loadPack(event.id)
  if (!packResult.success) {
    toast.error(packResult.error)
    return
  }
  if (!packResult.data.rooms.some((room) => room.students.length > 0)) {
    toast.info('Belum ada peserta pada periode ini.')
    return
  }
  printOverridePack.value = packResult.data
  try {
    await printWith(ALL_SCOPES)
  } finally {
    printOverridePack.value = null
  }
}

async function confirmReset() {
  confirmingReset.value = false
  const current = pack.value
  if (!activeEvent.value || current === null) return
  resetting.value = true
  const result = await examPrintService.resetCredentials(
    activeEvent.value.id,
    activeRoom.value?.id,
  )
  resetting.value = false
  if (!result.success) {
    error.value = result.error
    return
  }
  const issued = new Map(
    result.data.items.map((item) => [
      item.studentId,
      { identifier: item.identifier, password: item.password },
    ]),
  )
  pack.value = {
    ...current,
    rooms: current.rooms.map((room) => ({
      ...room,
      students: room.students.map((student) => ({
        ...student,
        credential: issued.get(student.studentId) ?? student.credential ?? null,
      })),
    })),
  }
}

const eventColumns = buildPrintEventColumns({
  formatDate: dateOf,
  onView: (event) => goTo(event.id),
  onPrint: (event) => void printEvent(event),
})

const roomColumns: ColumnDef<PrintPackRoom>[] = [
  {
    id: 'code',
    header: 'Kode',
    meta: {
      align: 'center',
      mobileLabel: 'Kode',
      mobileValue: (row: PrintPackRoom) => row.code,
    },
    cell: ({ row }) => row.original.code,
  },
  {
    id: 'name',
    header: 'Ruangan',
    meta: {
      strong: true,
      mobile: 'title',
      mobileValue: (row: PrintPackRoom) => row.name,
    },
    cell: ({ row }) => row.original.name,
  },
  {
    id: 'building',
    header: 'Gedung',
    meta: {
      align: 'center',
      mobileLabel: 'Gedung',
      mobileValue: (row: PrintPackRoom) => row.building ?? '-',
    },
    cell: ({ row }) => row.original.building ?? '-',
  },
  {
    id: 'students',
    header: 'Jumlah Peserta',
    meta: {
      align: 'center',
      mobileLabel: 'Jumlah Peserta',
      mobileValue: (row: PrintPackRoom) => row.students.length,
    },
    cell: ({ row }) => String(row.original.students.length),
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
            onClick: () => void printWith(`room:${row.original.id}`),
          },
        ],
        onManage: () => goTo(activeEvent.value?.id ?? null, row.original.id),
      }),
  },
]

const columns = computed(() =>
  activeEvent.value
    ? (roomColumns as unknown as ColumnDef<Row>[])
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

watch([eventId, roomId], () => {
  search.value = ''
  page.value = 1
})

watch([loading, eventsLoaded, dataLoaded, activeEvent, activeRoom], () => {
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
    roomId.value !== null &&
    activeEvent.value !== null &&
    dataLoaded.value &&
    dataForEvent.value === activeEvent.value.id &&
    activeRoom.value === null
  ) {
    goTo(activeEvent.value.id)
  }
})

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

useBreadcrumbs(() => {
  const baseHref = `/exam/print/${props.doc}`
  return [
    { title: 'Ujian', href: '#' },
    { title: 'Cetak Dokumen', href: '#' },
    {
      title: definition.value.title,
      href: activeEvent.value ? baseHref : '#',
    },
    ...(activeEvent.value
      ? [
          {
            title: activeEvent.value.name,
            href: activeRoom.value
              ? `${baseHref}/${activeEvent.value.id}`
              : '#',
          },
        ]
      : []),
    ...(activeRoom.value
      ? [
          {
            title: `${activeRoom.value.code} · ${activeRoom.value.name}`,
            href: '#',
          },
        ]
      : []),
  ]
})

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
          <CardTitle class="font-semibold">{{ pageTitle }}</CardTitle>
        </div>
        <div
          v-if="activeEvent"
          class="flex shrink-0 items-center gap-2"
        >
          <Button
            v-if="doc === 'cards'"
            variant="outline"
            :disabled="resetting || !hasContent"
            @click="confirmingReset = true"
          >
            Reset password
          </Button>
          <Button
            :disabled="loading || !hasContent"
            @click="openPrint"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </div>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <ServiceUnavailable
          v-if="error && isOutageMessage(error)"
          class="mx-4"
          :subject="definition.title"
          :message="error"
          :retry="reloadCurrent"
          :is-retrying="loading"
        />
        <div
          v-else-if="error"
          class="m-4 space-y-3 rounded-md border p-4 print:hidden"
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
          <p
            v-for="warning in warnings"
            :key="warning"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive print:hidden"
            role="alert"
          >
            {{ warning }}
          </p>

          <DataTable
            v-if="!activeRoom"
            class="print:hidden"
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
                      ? 'Belum ada ruangan pada periode ini.'
                      : 'Belum ada periode ujian.'
                "
              />
            </template>
          </DataTable>

          <PrintParticipantDocument
            v-if="printSourcePack !== null || activeRoom !== null"
            :kind="kind"
            :rooms="printedRooms"
            :table-rooms="activeRoom ? [activeRoom] : []"
            :show-table="activeRoom !== null"
            @print-one="printWith(`one:${$event}`)"
          />
        </template>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="printOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Cetak {{ definition.title }}</DialogTitle>
          <DialogDescription>
            Pilih bagian dokumen yang dicetak.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <FloatingLabelField
            label="Cakupan"
            :for="scopeFieldId"
            floating
          >
            <Select
              :model-value="cakupan"
              @update:model-value="changeCakupan"
            >
              <SelectTrigger
                :id="scopeFieldId"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="key in availableCakupan"
                  :key="key"
                  :value="key"
                >
                  {{ CAKUPAN[key] }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>

          <FloatingLabelField
            v-if="cakupan !== 'all'"
            :label="targetLabel"
            :for="targetFieldId"
            floating
          >
            <Select v-model="target">
              <SelectTrigger
                :id="targetFieldId"
                class="w-full"
              >
                <SelectValue :placeholder="targetPlaceholder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in targetScopes"
                  :key="item.key"
                  :value="item.key"
                >
                  {{ item.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter standard>
          <Button
            variant="outline"
            @click="printOpen = false"
          >
            Batal
          </Button>
          <Button
            :disabled="!canConfirm"
            @click="confirmPrint"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="confirmingReset">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Reset password siswa?</DialogTitle>
          <DialogDescription>
            Kata sandi lama semua siswa pada tampilan ini tidak berlaku lagi.
            Kartu yang sudah tercetak sebelumnya ikut tidak berlaku. Kata sandi
            baru hanya tampil di halaman ini dan hilang bila halaman dimuat
            ulang, jadi cetak sebelum meninggalkannya.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter standard>
          <Button
            variant="outline"
            @click="confirmingReset = false"
          >
            Batal
          </Button>
          <Button
            :disabled="resetting"
            @click="confirmReset"
          >
            Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
