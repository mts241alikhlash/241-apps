<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Filter, Printer } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { ColumnDef } from '@tanstack/vue-table'
import {
  BackButton,
  DataTable,
  SearchInput,
  ServiceUnavailable,
  DataTableEmpty,
} from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { isOutageMessage } from '@mts241alikhlash/web-shared/utils/service-error'
import ReportFileDialog from '../components/ReportFileDialog.vue'
import ReportSubmitDialogs from '../components/ReportSubmitDialogs.vue'
import RoomReportDocument from '../components/RoomReportDocument.vue'
import {
  buildDayColumns,
  buildRoomReportColumns,
  buildSubjectColumns,
} from '../components/roomReportColumns'
import {
  groupReports,
  type DayGroup,
  type SubjectGroup,
} from '../composables/useReportHierarchy'
import { useReportSubmission } from '../composables/useReportSubmission'
import { examEventService } from '../../exam-event/services/examEventService'
import { examRoomService } from '../services/examRoomService'
import type { RoomReport, RoomReportSummary } from '../types'

const reports = ref<RoomReportSummary[]>([])
const events = ref<{ id: string; name: string; status: string }[]>([])
const eventId = ref('')
const eventFieldId = useId()
const mobileEventFieldId = useId()
const filterOpen = ref(false)
const search = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(25)

const previewOpen = ref(false)
const previewDoc = ref<{
  report: RoomReport
  room: {
    name: string
    currentSupervisorName: string | null
    technicianName: string | null
  }
} | null>(null)
const previewLoading = ref(false)

async function openPreview(row: RoomReportSummary) {
  previewDoc.value = null
  previewLoading.value = true
  previewOpen.value = true
  try {
    const [reportResult, rosterResult] = await Promise.all([
      examRoomService.loadReport(row.roomId, row.slotId),
      examRoomService.loadRoster(row.roomId, row.slotId),
    ])
    if (!reportResult.success) return
    previewDoc.value = {
      report: reportResult.data,
      room: {
        name: row.roomName,
        currentSupervisorName:
          rosterResult.meta?.room.currentSupervisorName ?? null,
        technicianName: rosterResult.meta?.room.technicianName ?? null,
      },
    }
  } finally {
    previewLoading.value = false
  }
}

const printOpen = ref(false)
const printScope = ref<'all' | 'day' | 'subject' | 'room'>('all')
const printRoomId = ref('')
const printDayId = ref('')
const printSubjectId = ref('')
const printLoading = ref(false)
const printError = ref<string | null>(null)
const printDocs = ref<
  {
    key: string
    report: RoomReport
    room: {
      name: string
      currentSupervisorName: string | null
      technicianName: string | null
    }
  }[]
>([])

const roomChoices = computed(() => {
  const seen = new Map<string, string>()
  for (const row of reports.value) {
    seen.set(row.roomId, row.roomName)
  }
  return [...seen].map(([id, label]) => ({ id, label }))
})

const canPrint = computed(
  () =>
    !printLoading.value &&
    reports.value.length > 0 &&
    (printScope.value === 'all' ||
      (printScope.value === 'day' && printDayId.value !== '') ||
      (printScope.value === 'subject' && printSubjectId.value !== '') ||
      (printScope.value === 'room' && printRoomId.value !== '')),
)

const dayChoices = computed(() =>
  days.value.map((day) => ({ id: day.id, label: dayLabel(day) })),
)

const subjectChoices = computed(() =>
  days.value.flatMap((day) =>
    day.subjects.map((subject) => ({
      id: subject.id,
      label: `${dayLabel(day)} - ${subject.subjectName}`,
    })),
  ),
)

function printTargets(): RoomReportSummary[] {
  if (printScope.value === 'room') {
    return reports.value
      .filter((row) => row.roomId === printRoomId.value)
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
  }
  if (printScope.value === 'day') {
    return (
      days.value.find((day) => day.id === printDayId.value)?.subjects ?? []
    ).flatMap((subject) => subject.rooms)
  }
  if (printScope.value === 'subject') {
    return days.value
      .flatMap((day) => day.subjects)
      .filter((subject) => subject.id === printSubjectId.value)
      .flatMap((subject) => subject.rooms)
  }
  return days.value.flatMap((day) =>
    day.subjects.flatMap((subject) => subject.rooms),
  )
}

function openPrint(
  scope: 'day' | 'subject' | null = null,
  id: string | null = null,
) {
  printScope.value =
    scope ?? (activeSubject.value ? 'subject' : activeDay.value ? 'day' : 'all')
  printSubjectId.value =
    scope === 'subject' ? (id ?? '') : (activeSubject.value?.id ?? '')
  printDayId.value = scope === 'day' ? (id ?? '') : (activeDay.value?.id ?? '')
  printRoomId.value = ''
  printError.value = null
  printDocs.value = []
  printOpen.value = true
}

async function loadPrintDocs(rows: RoomReportSummary[] = printTargets()) {
  printLoading.value = true
  printError.value = null
  printDocs.value = []
  const targets = [
    ...new Map(
      rows.map((row) => [`${row.roomId}-${row.slotId}`, row]),
    ).values(),
  ]
  try {
    const loaded = await Promise.all(
      targets.map(async (row) => {
        const [reportResult, rosterResult] = await Promise.all([
          examRoomService.loadReport(row.roomId, row.slotId),
          examRoomService.loadRoster(row.roomId, row.slotId),
        ])
        if (!reportResult.success) return null
        return {
          key: `${row.roomId}-${row.slotId}`,
          report: reportResult.data,
          room: {
            name: row.roomName,
            currentSupervisorName:
              rosterResult.meta?.room.currentSupervisorName ?? null,
            technicianName: rosterResult.meta?.room.technicianName ?? null,
          },
        }
      }),
    )
    printDocs.value = loaded.filter((doc) => doc !== null)
    if (printDocs.value.length === 0) {
      printError.value = 'Tidak ada berita acara yang dapat dimuat.'
    }
  } catch {
    printError.value =
      'Dokumen tidak dapat dimuat. Periksa koneksi lalu coba lagi.'
  } finally {
    printLoading.value = false
  }
}

async function waitForImages(): Promise<void> {
  const images = [
    ...document.querySelectorAll<HTMLImageElement>('.report-print-root img'),
  ]
  await Promise.all(
    images.map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          }),
    ),
  )
}

async function runPrint(): Promise<void> {
  await nextTick()
  await waitForImages()
  document.body.classList.add('printing-report')
  window.print()
  document.body.classList.remove('printing-report')
}

async function printPreview() {
  if (previewDoc.value === null) return
  printDocs.value = [{ key: 'preview', ...previewDoc.value }]
  previewOpen.value = false
  await runPrint()
  printDocs.value = []
}

async function printRoomReport(row: RoomReportSummary) {
  await loadPrintDocs([row])
  if (printDocs.value.length === 0) {
    toast.error(printError.value ?? 'Dokumen tidak dapat dimuat.')
    return
  }
  await runPrint()
  printDocs.value = []
}

async function confirmPrint() {
  await loadPrintDocs()
  if (printDocs.value.length === 0) return
  await runPrint()
  printOpen.value = false
}

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
const route = useRoute()
const router = useRouter()

const paramValue = (name: string): string | null => {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}

const dayId = computed(() => paramValue('dayId'))
const subjectId = computed(() => paramValue('subjectId'))

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

const dayLabel = (day: DayGroup): string =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
    new Date(day.startsAt),
  )

const paginatedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

function goBack() {
  if (activeSubject.value) goTo(activeDay.value?.id ?? null)
  else goTo(null)
}

function goTo(day: string | null, subject: string | null = null) {
  void router.push(
    day === null
      ? { name: 'ExamRoomReports' }
      : subject === null
        ? { name: 'ExamRoomReports', params: { dayId: day } }
        : {
            name: 'ExamRoomReports',
            params: { dayId: day, subjectId: subject },
          },
  )
}

const activeEventName = computed(
  () => events.value.find((event) => event.id === eventId.value)?.name ?? '',
)

const { hasPermission } = useAuthSession()
const canReplaceFile = computed(() => hasPermission('exam-rooms.manage-all'))

const submission = useReportSubmission({
  submit: (roomId, slotId, file) =>
    examRoomService.submitReport(roomId, slotId, file, { silent: true }),
  refresh: loadReports,
})

const replaceTarget = ref<RoomReportSummary | null>(null)
const replaceBusy = ref(false)
const replaceError = ref<string | null>(null)

function openReplace(row: RoomReportSummary) {
  replaceError.value = null
  replaceTarget.value = row
}

async function replaceFile(file: File) {
  const row = replaceTarget.value
  if (row === null || replaceBusy.value) return
  replaceBusy.value = true
  const result = await examRoomService.replaceReportFile(
    row.roomId,
    row.slotId,
    file,
  )
  replaceBusy.value = false
  if (!result.success) {
    replaceError.value = result.error
    return
  }
  replaceTarget.value = null
  await loadReports()
}

const columns = computed(() => {
  if (activeSubject.value) {
    return buildRoomReportColumns({
      onOpen: (row) => void openPreview(row),
      onPrint: (row) => void printRoomReport(row),
      onSubmit: (row) => submission.request([row]),
      onDownload: (row) =>
        void examRoomService.downloadReportFile(
          row.roomId,
          row.slotId,
          row.attachmentName,
        ),
      onReplace: openReplace,
      canReplace: canReplaceFile.value,
    }) as unknown as ColumnDef<ReportRow>[]
  }
  if (activeDay.value) {
    return buildSubjectColumns({
      onOpen: (row) => goTo(row.dayKey, row.id),
      onPrint: (row) => openPrint('subject', row.id),
      onSubmit: (row) => submission.request(row.rooms),
    }) as unknown as ColumnDef<ReportRow>[]
  }
  return buildDayColumns({
    onOpen: (row) => goTo(row.id),
    onPrint: (row) => openPrint('day', row.id),
    onSubmit: (row) => submission.requestDay(row.subjects),
  }) as unknown as ColumnDef<ReportRow>[]
})

const itemLabel = computed(() =>
  activeSubject.value ? 'ruangan' : activeDay.value ? 'mapel' : 'hari',
)

const backLabel = computed(() =>
  activeSubject.value ? 'Kembali ke daftar mapel' : 'Kembali ke semua hari',
)

const pageTitle = computed(() => {
  if (activeSubject.value) return activeSubject.value.subjectName
  if (activeDay.value) return dayLabel(activeDay.value)
  return 'Berita Acara'
})

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Berita Acara', href: '/exam/reports' },
  ...(activeDay.value
    ? [
        {
          title: dayLabel(activeDay.value),
          href: `/exam/reports/${activeDay.value.id}`,
        },
      ]
    : []),
  ...(activeSubject.value
    ? [{ title: activeSubject.value.subjectName, href: '#' }]
    : []),
])

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
        <Button
          class="shrink-0"
          :disabled="loading || reports.length === 0"
          @click="openPrint()"
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
          subject="Berita acara"
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
            <template #mobile-filter>
              <Button
                variant="outline"
                class="shrink-0"
                @click="filterOpen = true"
              >
                <Filter class="size-4" />
                Filter
              </Button>
            </template>
            <template #mobile-chips>
              <div
                v-if="activeEventName"
                class="flex flex-wrap gap-2 text-control"
              >
                <Button
                  variant="outline"
                  class="max-w-full"
                  :title="`Hapus filter periode: ${activeEventName}`"
                  @click="changeEvent('')"
                >
                  <span class="truncate">Hapus filter periode</span>
                </Button>
              </div>
            </template>
            <template #empty>
              <DataTableEmpty
                :message="
                  search
                    ? 'Tidak ada berita acara yang cocok dengan pencarian.'
                    : 'Belum ada jadwal pengawasan pada periode ini.'
                "
              />
            </template>
          </DataTable>
        </template>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Berita Acara</DialogTitle>
          <DialogDescription>
            Pilih periode ujian yang berita acaranya ingin dilihat.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <FloatingLabelField
            label="Periode Ujian"
            :for="mobileEventFieldId"
            floating
          >
            <Select
              :model-value="eventId"
              @update:model-value="
                (value) => {
                  filterOpen = false
                  changeEvent(value)
                }
              "
            >
              <SelectTrigger
                :id="mobileEventFieldId"
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
        </DialogBody>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="previewOpen">
      <DialogContent
        size="xl"
        class="sm:max-w-[min(calc(100%-2rem),210mm)]"
      >
        <DialogHeader standard>
          <DialogTitle>Pratinjau Berita Acara</DialogTitle>
          <DialogDescription>
            Berita acara satu ruangan sebelum dicetak.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4 overflow-x-hidden">
          <p
            v-if="previewLoading"
            class="text-control text-muted-foreground"
          >
            Menyiapkan dokumen...
          </p>
          <div
            v-else-if="previewDoc"
            class="mx-auto w-full max-w-[190mm] rounded-md border p-2"
          >
            <RoomReportDocument
              :report="previewDoc.report"
              :room="previewDoc.room"
            />
          </div>
        </DialogBody>
        <DialogFooter standard>
          <Button
            :disabled="previewLoading || previewDoc === null"
            @click="printPreview"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="printOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Cetak Berita Acara</DialogTitle>
          <DialogDescription>
            Pilih berita acara yang dicetak.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <FloatingLabelField
            label="Cakupan"
            :for="`${eventFieldId}-cakupan`"
            floating
          >
            <Select v-model="printScope">
              <SelectTrigger
                :id="`${eventFieldId}-cakupan`"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua berita acara</SelectItem>
                <SelectItem value="day">Per hari</SelectItem>
                <SelectItem value="subject">Per mapel</SelectItem>
                <SelectItem value="room">Per ruangan</SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            v-if="printScope === 'day'"
            label="Hari"
            :for="`${eventFieldId}-hari`"
            floating
          >
            <Select v-model="printDayId">
              <SelectTrigger
                :id="`${eventFieldId}-hari`"
                class="w-full"
              >
                <SelectValue placeholder="Pilih hari" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="day in dayChoices"
                  :key="day.id"
                  :value="day.id"
                >
                  {{ day.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            v-if="printScope === 'subject'"
            label="Mata Pelajaran"
            :for="`${eventFieldId}-mapel`"
            floating
          >
            <Select v-model="printSubjectId">
              <SelectTrigger
                :id="`${eventFieldId}-mapel`"
                class="w-full"
              >
                <SelectValue placeholder="Pilih mapel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in subjectChoices"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            v-if="printScope === 'room'"
            label="Ruang"
            :for="`${eventFieldId}-ruang`"
            floating
          >
            <Select v-model="printRoomId">
              <SelectTrigger
                :id="`${eventFieldId}-ruang`"
                class="w-full"
              >
                <SelectValue placeholder="Pilih ruangan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="room in roomChoices"
                  :key="room.id"
                  :value="room.id"
                >
                  {{ room.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <p
            v-if="printError"
            class="text-control text-destructive"
            role="alert"
          >
            {{ printError }}
          </p>
          <p
            v-if="printLoading"
            class="text-control text-muted-foreground"
          >
            Menyiapkan dokumen...
          </p>
        </DialogBody>
        <DialogFooter standard>
          <Button
            variant="outline"
            @click="printOpen = false"
          >
            Batal
          </Button>
          <Button
            :disabled="!canPrint"
            @click="confirmPrint"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ReportSubmitDialogs :submission="submission" />

    <ReportFileDialog
      :open="replaceTarget !== null"
      title="Ganti Berkas Berita Acara"
      :description="`Unggah berkas pengganti untuk ${replaceTarget?.roomName ?? ''}. Berkas lama dihapus.`"
      confirm-label="Ganti"
      :busy="replaceBusy"
      :error="replaceError"
      @update:open="(open) => !open && (replaceTarget = null)"
      @confirm="replaceFile"
    />

    <Teleport to="body">
      <div
        v-if="printDocs.length > 0"
        class="print-only report-print-root"
      >
        <RoomReportDocument
          v-for="doc in printDocs"
          :key="doc.key"
          :report="doc.report"
          :room="doc.room"
        />
      </div>
    </Teleport>
  </div>
</template>
