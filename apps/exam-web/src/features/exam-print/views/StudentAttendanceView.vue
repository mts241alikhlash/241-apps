<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import {
  BackButton,
  DataTable,
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
import { toast } from 'vue-sonner'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { isOutageMessage } from '@mts241alikhlash/web-shared/utils/service-error'
import {
  buildDayColumns,
  buildRoomReportColumns,
  buildSubjectColumns,
} from '@/features/exam-room/components/roomReportColumns'
import {
  groupReports,
  type DayGroup,
  type SubjectGroup,
} from '@/features/exam-room/composables/useReportHierarchy'
import { examRoomService } from '@/features/exam-room/services/examRoomService'
import type {
  RoomMonitorParticipant,
  RoomReportSummary,
} from '@/features/exam-room/types'
import { examEventService } from '@/features/exam-event/services/examEventService'
import AttendanceSheet from '../documents/AttendanceSheet.vue'
import { formatPrintDate, formatPrintRange } from '../format'

const route = useRoute()
const router = useRouter()

const reports = ref<RoomReportSummary[]>([])
const events = ref<{ id: string; name: string; status: string }[]>([])
const eventId = ref('')
const eventFieldId = useId()
const search = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(10)

const previewOpen = ref(false)
const roster = ref<RoomMonitorParticipant[]>([])
const rosterLoading = ref(false)
const rosterError = ref<string | null>(null)

const paramValue = (name: string): string | null => {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}

const dayId = computed(() => paramValue('dayId'))
const subjectId = computed(() => paramValue('subjectId'))
const previewRow = ref<RoomReportSummary | null>(null)
const rosterRoom = ref<{
  currentSupervisorName: string | null
  technicianName: string | null
} | null>(null)

interface BatchSheet {
  key: string
  roomName: string
  date: string
  packages: string
  timeRange: string
  students: {
    studentId: string
    name: string | null
    classroomName: string | null
    participantNumber: string | null
  }[]
  supervisorName: string | null
  technicianName: string | null
}

const batch = ref<BatchSheet[]>([])
const printing = ref(false)

const filteredReports = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  if (!keyword) return reports.value
  return reports.value.filter((row) =>
    [row.roomCode, row.roomName, ...row.subjectNames].some((value) =>
      value.toLocaleLowerCase('id').includes(keyword),
    ),
  )
})

const days = computed(() => groupReports(filteredReports.value))

const activeDay = computed(
  () => days.value.find((day) => day.id === dayId.value) ?? null,
)
const activeSubject = computed(
  () =>
    activeDay.value?.subjects.find((item) => item.id === subjectId.value) ??
    null,
)

type ReportRow = DayGroup | SubjectGroup | RoomReportSummary

const levelRows = computed<ReportRow[]>(() => {
  if (activeSubject.value) return activeSubject.value.rooms
  if (activeDay.value) return activeDay.value.subjects
  return days.value
})

const paginatedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

const dayLabel = (day: DayGroup): string =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
    new Date(day.startsAt),
  )

const pageTitle = computed(() => {
  if (activeSubject.value) return activeSubject.value.subjectName
  if (activeDay.value) return dayLabel(activeDay.value)
  return 'Daftar Hadir Peserta'
})

const backLabel = computed(() => {
  if (activeSubject.value) return 'Kembali ke daftar mapel'
  return 'Kembali ke semua hari'
})

const itemLabel = computed(() =>
  activeSubject.value ? 'ruangan' : activeDay.value ? 'mapel' : 'hari',
)

const columns = computed(() => {
  if (activeSubject.value) {
    return buildRoomReportColumns({
      onOpen: (row) => openPreview(row),
      onPrint: (row) => void printRows([row]),
    }) as unknown as ColumnDef<ReportRow>[]
  }
  if (activeDay.value) {
    return buildSubjectColumns({
      onOpen: (row) => goTo(row.dayKey, row.id),
      onPrint: (row) => void printRows(row.rooms),
    }) as unknown as ColumnDef<ReportRow>[]
  }
  return buildDayColumns({
    onOpen: (row) => goTo(row.id),
    onPrint: (row) =>
      void printRows(row.subjects.flatMap((subject) => subject.rooms)),
  }) as unknown as ColumnDef<ReportRow>[]
})

const packages = computed(() => {
  const subjects = previewRow.value?.subjectNames ?? []
  if (subjects.length > 0) return subjects.join(', ')
  const names = [
    ...new Set(
      roster.value
        .map((row) => row.packageTitle)
        .filter((name) => !!name && name.trim() !== ''),
    ),
  ]
  return names.length > 0 ? names.join(', ') : '-'
})

const sheetStudents = computed(() =>
  roster.value.map((row) => ({
    studentId: row.studentId,
    name: row.studentName,
    classroomName: row.classroomName,
    participantNumber: row.participantNumber,
  })),
)

const sheetDate = computed(() =>
  previewRow.value === null ? '-' : formatPrintDate(previewRow.value.startsAt),
)

const sheetRange = computed(() =>
  previewRow.value === null
    ? '-'
    : formatPrintRange(previewRow.value.startsAt, previewRow.value.endsAt),
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

function openPreview(row: RoomReportSummary) {
  previewRow.value = row
  previewOpen.value = true
  void loadRoster()
}

async function loadRoster() {
  const row = previewRow.value
  if (row === null) {
    roster.value = []
    return
  }
  rosterLoading.value = true
  rosterError.value = null
  try {
    const result = await examRoomService.loadRoster(row.roomId, row.slotId)
    roster.value = result.data
    rosterRoom.value = result.meta?.room ?? null
  } catch {
    roster.value = []
    rosterError.value =
      'Daftar peserta tidak dapat dimuat. Periksa koneksi lalu coba lagi.'
  } finally {
    rosterLoading.value = false
  }
}

async function printRows(rows: RoomReportSummary[]) {
  if (printing.value) return
  printing.value = true
  try {
    const targets = [
      ...new Map(
        rows.map((row) => [`${row.roomId}-${row.slotId}`, row]),
      ).values(),
    ].sort(
      (a, b) =>
        a.startsAt.localeCompare(b.startsAt) ||
        a.roomName.localeCompare(b.roomName, 'id'),
    )
    const loaded = await Promise.all(
      targets.map(async (row): Promise<BatchSheet> => {
        const result = await examRoomService.loadRoster(row.roomId, row.slotId)
        return {
          key: `${row.roomId}-${row.slotId}`,
          roomName: row.roomName,
          date: formatPrintDate(row.startsAt),
          packages:
            row.subjectNames.length > 0 ? row.subjectNames.join(', ') : '-',
          timeRange: formatPrintRange(row.startsAt, row.endsAt),
          students: result.data.map((student) => ({
            studentId: student.studentId,
            name: student.studentName,
            classroomName: student.classroomName,
            participantNumber: student.participantNumber,
          })),
          supervisorName: result.meta?.room.currentSupervisorName ?? null,
          technicianName: result.meta?.room.technicianName ?? null,
        }
      }),
    )
    batch.value = loaded.filter((sheet) => sheet.students.length > 0)
    if (batch.value.length === 0) {
      toast.error('Tidak ada daftar hadir yang dapat dimuat.')
      return
    }
    await nextTick()
    printSheet()
  } catch {
    toast.error('Dokumen tidak dapat dimuat. Periksa koneksi lalu coba lagi.')
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

async function loadReports() {
  loading.value = true
  const result = await examRoomService.loadReports(eventId.value || undefined)
  loading.value = false
  if (result.success) {
    reports.value = result.data
    error.value = null
  } else {
    reports.value = []
    error.value = result.error
  }
}

async function changeEvent(value: AcceptableValue) {
  eventId.value = typeof value === 'string' ? value : ''
  goTo(null)
  await loadReports()
}

async function load() {
  loading.value = true
  try {
    const result = await examEventService.loadEvents({ limit: 200 })
    if (result.success) {
      events.value = result.data.map((event) => ({
        id: event.id,
        name: event.name,
        status: event.status,
      }))
      const active = result.data.find((event) => event.status === 'ACTIVE')
      eventId.value = active?.id ?? result.data[0]?.id ?? ''
    }
  } catch {
    error.value = 'Periode ujian tidak dapat dimuat.'
  }
  await loadReports()
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
  if (loading.value) return
  if (dayId.value !== null && activeDay.value === null) goTo(null)
  else if (
    dayId.value !== null &&
    subjectId.value !== null &&
    activeSubject.value === null
  ) {
    goTo(dayId.value)
  }
})

watch([levelRows, loading], () => {
  if (loading.value) return
  const lastPage = Math.max(
    1,
    Math.ceil(levelRows.value.length / pageSize.value),
  )
  if (page.value > lastPage) page.value = lastPage
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
          title: dayLabel(activeDay.value),
          href: `/exam/print/student-attendance/${activeDay.value.id}`,
        },
      ]
    : []),
  ...(activeSubject.value
    ? [{ title: activeSubject.value.subjectName, href: '#' }]
    : []),
])

onMounted(load)
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
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
        <ServiceUnavailable
          v-if="error && isOutageMessage(error)"
          class="mx-4"
          subject="Daftar hadir peserta"
          :message="error"
          :retry="loadReports"
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
            @click="loadReports"
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
                  :model-value="eventId"
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
                      v-for="event in events"
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
              <div class="space-y-3 text-center">
                <p>
                  {{
                    search
                      ? 'Tidak ada daftar hadir yang cocok dengan pencarian.'
                      : 'Belum ada jadwal pada periode ini.'
                  }}
                </p>
                <Button
                  v-if="search"
                  variant="outline"
                  @click="search = ''"
                >
                  Atur Ulang
                </Button>
              </div>
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
          <p
            v-if="rosterLoading"
            class="text-control text-muted-foreground"
          >
            Menyiapkan dokumen...
          </p>
          <ServiceUnavailable
            v-else-if="rosterError && isOutageMessage(rosterError)"
            subject="Peserta ruangan"
            :message="rosterError"
            :retry="loadRoster"
            :is-retrying="rosterLoading"
          />
          <div
            v-else-if="rosterError"
            class="rounded-md border p-3 text-control"
            role="alert"
          >
            {{ rosterError }}
          </div>
          <div
            v-else
            class="mx-auto w-full max-w-[190mm] rounded-md border p-2 print:hidden"
          >
            <AttendanceSheet
              :room-name="previewRow?.roomName ?? '-'"
              :date="sheetDate"
              :packages="packages"
              :time-range="sheetRange"
              :students="sheetStudents"
              :paginate="false"
              :supervisor-name="rosterRoom?.currentSupervisorName ?? null"
              :technician-name="rosterRoom?.technicianName ?? null"
            />
          </div>
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            variant="outline"
            @click="previewOpen = false"
          >
            Tutup
          </Button>
          <Button
            :disabled="rosterLoading || roster.length === 0"
            @click="printSheet"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div
      v-if="
        batch.length === 0 && previewRow !== null && sheetStudents.length > 0
      "
      class="print-only"
    >
      <AttendanceSheet
        :room-name="previewRow?.roomName ?? '-'"
        :date="sheetDate"
        :packages="packages"
        :time-range="sheetRange"
        :students="sheetStudents"
        :supervisor-name="rosterRoom?.currentSupervisorName ?? null"
        :technician-name="rosterRoom?.technicianName ?? null"
      />
    </div>

    <div
      v-if="batch.length > 0"
      class="print-only"
    >
      <div class="print-stack">
        <AttendanceSheet
          v-for="sheet in batch"
          :key="sheet.key"
          stacked
          :room-name="sheet.roomName"
          :date="sheet.date"
          :packages="sheet.packages"
          :time-range="sheet.timeRange"
          :students="sheet.students"
          :supervisor-name="sheet.supervisorName"
          :technician-name="sheet.technicianName"
        />
      </div>
    </div>
  </div>
</template>
