<script setup lang="ts">
import { computed, h, nextTick, ref, useId, watch } from 'vue'
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
} from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
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
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { examEventService } from '@/features/exam-event/services/examEventService'
import {
  EVENT_STATUSES,
  eventStatusLabel,
  eventStatusVariant,
  type ExamEvent,
} from '@/features/exam-event/types'
import { examTypeLabel } from '@/features/exam-schedule/types'
import { compareGrade } from '@/features/exam-shared/classroomName'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import QuestionKeySheet from '../documents/QuestionKeySheet.vue'
import { formatPrintDate, formatPrintRange, formatPrintTime } from '../format'
import { waitForPrintImages } from '../printImages'
import {
  questionKeySheetService,
  type LoadedQuestionKeySheet,
  type QuestionKeyTarget,
} from '../services/questionKeySheetService'

interface SubjectGroup {
  id: string
  subject: string
  grades: QuestionKeyTarget[]
}

type Row = ExamEvent | SubjectGroup | QuestionKeyTarget

const route = useRoute()
const router = useRouter()
const statusFieldId = useId()

const events = ref<ExamEvent[]>([])
const eventsLoaded = ref(false)
const targets = ref<QuestionKeyTarget[]>([])
const targetsLoaded = ref(false)
const targetsForEvent = ref<string | null>(null)
const semesterId = ref('')
const status = ref('ALL')
const search = ref('')
const page = ref(1)
const pageSize = ref(25)
const loadingEvents = ref(false)
const loadingTargets = ref(false)
const printing = ref(false)
const previewOpen = ref(false)
const preview = ref<LoadedQuestionKeySheet | null>(null)
const printList = ref<LoadedQuestionKeySheet[]>([])

const loading = computed(() => loadingEvents.value || loadingTargets.value)

function readParam(name: 'eventId' | 'subjectId'): string | null {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}

const eventId = computed(() => readParam('eventId'))
const subjectId = computed(() => readParam('subjectId'))

const activeEvent = computed(
  () => events.value.find((event) => event.id === eventId.value) ?? null,
)

const subjects = computed<SubjectGroup[]>(() => {
  const groups = new Map<string, SubjectGroup>()
  for (const target of targets.value) {
    const group = groups.get(target.subjectId) ?? {
      id: target.subjectId,
      subject: target.subjectName,
      grades: [],
    }
    group.grades.push(target)
    groups.set(target.subjectId, group)
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      grades: [...group.grades].sort((left, right) =>
        compareGrade(left.gradeName, right.gradeName),
      ),
    }))
    .sort((left, right) => left.subject.localeCompare(right.subject, 'id'))
})

const activeSubject = computed(() =>
  targetsForEvent.value === activeEvent.value?.id
    ? (subjects.value.find((group) => group.id === subjectId.value) ?? null)
    : null,
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
    return activeSubject.value.grades.filter((item) => matches(item.gradeName))
  }
  return subjects.value.filter((group) => matches(group.subject))
})

const paginatedRows = computed(() => {
  if (activeEvent.value) return levelRows.value
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

const pageTitle = computed(() => {
  if (activeSubject.value) return activeSubject.value.subject
  if (activeEvent.value) return activeEvent.value.name
  return 'Daftar Soal dan Kunci'
})

const itemLabel = computed(() => {
  if (activeSubject.value) return 'tingkat'
  if (activeEvent.value) return 'mata pelajaran'
  return 'periode'
})

const searchLabel = computed(() => {
  if (activeSubject.value) return 'Cari tingkat'
  if (activeEvent.value) return 'Cari mata pelajaran'
  return 'Cari periode'
})

const printTargetsList = computed<QuestionKeyTarget[]>(() => {
  if (activeSubject.value) return activeSubject.value.grades
  if (activeEvent.value) return targets.value
  return []
})

const eventDateFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  dateStyle: 'long',
})

function formatEventDate(iso: string): string {
  return eventDateFormat.format(new Date(iso))
}

function goTo(nextEventId: string | null, nextSubjectId?: string | null) {
  const params: Record<string, string> = {}
  if (nextEventId !== null) params.eventId = nextEventId
  if (nextEventId !== null && nextSubjectId) params.subjectId = nextSubjectId
  void router.push({
    name: 'ExamPrintQuestionKeys',
    params,
  })
}

async function loadEvents() {
  loadingEvents.value = true
  try {
    const result = await examEventService.loadEvents({ limit: 200 })
    if (!result.success) {
      toast.error('Gagal memuat periode ujian.')
      return
    }
    events.value = result.data
    eventsLoaded.value = true
  } finally {
    loadingEvents.value = false
  }
}

async function loadTargets(targetEventId: string | null) {
  if (targetEventId === null) {
    targets.value = []
    targetsLoaded.value = false
    targetsForEvent.value = null
    loadingTargets.value = false
    return
  }
  loadingTargets.value = true
  targetsLoaded.value = false
  targetsForEvent.value = null
  try {
    const loaded = await questionKeySheetService.loadTargets(targetEventId)
    if (eventId.value !== targetEventId) return
    targets.value = loaded
    targetsForEvent.value = targetEventId
    targetsLoaded.value = true
  } catch {
    if (eventId.value !== targetEventId) return
    toast.error('Gagal memuat daftar soal.')
    targets.value = []
  } finally {
    if (eventId.value === targetEventId) loadingTargets.value = false
  }
}

watch(
  eventId,
  (next) => {
    void loadTargets(next)
  },
  { immediate: true },
)

watch([eventId, subjectId], () => {
  search.value = ''
  page.value = 1
})

watch([search, semesterId, status], () => {
  page.value = 1
})

watch(
  [loading, eventsLoaded, targetsLoaded, activeEvent, activeSubject],
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
      subjectId.value !== null &&
      activeEvent.value !== null &&
      targetsLoaded.value &&
      targetsForEvent.value === activeEvent.value.id &&
      activeSubject.value === null
    ) {
      goTo(activeEvent.value.id)
    }
  },
)

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Cetak Dokumen', href: '#' },
  {
    title: 'Daftar Soal dan Kunci',
    href: activeEvent.value ? '/exam/print/question-keys' : '#',
  },
  ...(activeEvent.value
    ? [
        {
          title: activeEvent.value.name,
          href: activeSubject.value
            ? `/exam/print/question-keys/${activeEvent.value.id}`
            : '#',
        },
      ]
    : []),
  ...(activeSubject.value
    ? [{ title: activeSubject.value.subject, href: '#' }]
    : []),
])

async function printLoadedTargets(list: QuestionKeyTarget[]) {
  const loaded = await questionKeySheetService.loadSheets(list)
  if (loaded.length === 0) {
    toast.info('Tidak ada soal untuk dicetak.')
    return
  }
  await questionKeySheetService.preloadSheetImages(loaded)
  printList.value = loaded
  try {
    await nextTick()
    await waitForPrintImages()
    document.body.classList.add('printing-stack')
    window.print()
  } finally {
    document.body.classList.remove('printing-stack')
    printList.value = []
  }
}

async function printTargets(list: QuestionKeyTarget[]) {
  if (printing.value || list.length === 0) return
  printing.value = true
  try {
    await printLoadedTargets(list)
  } catch {
    toast.error('Gagal memuat daftar soal dan kunci.')
  } finally {
    printing.value = false
  }
}

async function printEvent(targetEventId: string) {
  if (printing.value) return
  printing.value = true
  try {
    const list =
      targetsForEvent.value === targetEventId && targetsLoaded.value
        ? targets.value
        : await questionKeySheetService.loadTargets(targetEventId)
    if (list.length === 0) {
      toast.info('Tidak ada paket soal pada periode ini.')
      return
    }
    await printLoadedTargets(list)
  } catch {
    toast.error('Gagal memuat daftar soal dan kunci.')
  } finally {
    printing.value = false
  }
}

async function openPreview(target: QuestionKeyTarget) {
  if (printing.value) return
  printing.value = true
  try {
    const [loaded] = await questionKeySheetService.loadSheets([target])
    if (loaded === undefined) {
      toast.info('Paket soal tidak ditemukan.')
      return
    }
    await questionKeySheetService.preloadSheetImages([loaded])
    preview.value = loaded
    previewOpen.value = true
  } catch {
    toast.error('Gagal memuat daftar soal dan kunci.')
  } finally {
    printing.value = false
  }
}

const printItem = (action: () => void) => ({
  label: 'Cetak',
  icon: Printer,
  onClick: action,
})

const eventColumns = computed<ColumnDef<ExamEvent>[]>(() => [
  {
    id: 'type',
    header: 'Jenis',
    meta: {
      align: 'center',
      mobileLabel: 'Jenis',
      mobileValue: (row: ExamEvent) => examTypeLabel(row.type),
    },
    cell: ({ row }) => examTypeLabel(row.original.type),
  },
  {
    id: 'name',
    header: 'Periode Ujian',
    meta: {
      strong: true,
      mobile: 'title',
      mobileValue: (row: ExamEvent) => row.name,
    },
    cell: ({ row }) => row.original.name,
  },
  {
    id: 'startDate',
    header: 'Tanggal Mulai',
    meta: {
      align: 'center',
      mobileLabel: 'Tanggal Mulai',
      mobileValue: (row: ExamEvent) => formatEventDate(row.startsAt),
    },
    cell: ({ row }) => formatEventDate(row.original.startsAt),
  },
  {
    id: 'endDate',
    header: 'Tanggal Selesai',
    meta: {
      align: 'center',
      mobileLabel: 'Tanggal Selesai',
      mobileValue: (row: ExamEvent) => formatEventDate(row.endsAt),
    },
    cell: ({ row }) => formatEventDate(row.original.endsAt),
  },
  {
    id: 'status',
    header: 'Status',
    meta: {
      align: 'center',
      mobileLabel: 'Status',
      mobileValue: (row: ExamEvent) => eventStatusLabel(row.status),
    },
    cell: ({ row }) =>
      h(Badge, { variant: eventStatusVariant(row.original.status) }, () =>
        eventStatusLabel(row.original.status),
      ),
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
        items: [printItem(() => void printEvent(row.original.id))],
        onManage: () => goTo(row.original.id),
      }),
  },
])

const subjectColumns = computed<ColumnDef<SubjectGroup>[]>(() => [
  {
    id: 'subject',
    header: 'Mata Pelajaran',
    meta: {
      strong: true,
      mobile: 'title',
      mobileValue: (row: SubjectGroup) => row.subject,
    },
    cell: ({ row }) => row.original.subject,
  },
  {
    id: 'grades',
    header: 'Jumlah Tingkat',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectGroup) => row.grades.length,
    },
    cell: ({ row }) => String(row.original.grades.length),
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
        items: [printItem(() => void printTargets(row.original.grades))],
        onManage: () => goTo(activeEvent.value?.id ?? null, row.original.id),
      }),
  },
])

const gradeColumns = computed<ColumnDef<QuestionKeyTarget>[]>(() => [
  {
    id: 'grade',
    header: 'Tingkat',
    meta: {
      strong: true,
      mobile: 'title',
      mobileValue: (row: QuestionKeyTarget) => row.gradeName,
    },
    cell: ({ row }) => row.original.gradeName,
  },
  {
    id: 'date',
    header: 'Hari, Tanggal',
    meta: {
      align: 'center',
      mobileLabel: 'Hari, Tanggal',
      mobileValue: (row: QuestionKeyTarget) => formatPrintDate(row.startsAt),
    },
    cell: ({ row }) => formatPrintDate(row.original.startsAt),
  },
  {
    id: 'start',
    header: 'Jam Mulai',
    meta: {
      align: 'center',
      mobileLabel: 'Jam Mulai',
      mobileValue: (row: QuestionKeyTarget) => formatPrintTime(row.startsAt),
    },
    cell: ({ row }) => formatPrintTime(row.original.startsAt),
  },
  {
    id: 'end',
    header: 'Jam Selesai',
    meta: {
      align: 'center',
      mobileLabel: 'Jam Selesai',
      mobileValue: (row: QuestionKeyTarget) => formatPrintTime(row.endsAt),
    },
    cell: ({ row }) => formatPrintTime(row.original.endsAt),
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
        items: [printItem(() => void printTargets([row.original]))],
        onManage: () => void openPreview(row.original),
      }),
  },
])

const columns = computed(() => {
  if (!activeEvent.value) return eventColumns.value
  if (activeSubject.value) return gradeColumns.value
  return subjectColumns.value
})

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

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
            :label="
              activeSubject
                ? 'Kembali ke daftar mata pelajaran'
                : 'Kembali ke daftar periode'
            "
            @click="goTo(activeSubject ? activeEvent.id : null)"
          />
          <CardTitle class="font-semibold">{{ pageTitle }}</CardTitle>
        </div>
        <Button
          v-if="activeEvent"
          class="shrink-0"
          :disabled="loading || printing || printTargetsList.length === 0"
          @click="printTargets(printTargetsList)"
        >
          <Printer class="size-4" />
          {{ printing ? 'Menyiapkan…' : 'Cetak' }}
        </Button>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto pt-2 px-4 pb-4"
      >
        <DataTable
          mobile="cards"
          :columns="columns as ColumnDef<Row>[]"
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
                    ? 'Belum ada paket soal pada periode ini.'
                    : 'Belum ada periode ujian.'
              "
            />
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
          <DialogTitle>Pratinjau Daftar Soal dan Kunci</DialogTitle>
          <DialogDescription>
            Naskah soal dan kunci jawaban untuk arsip.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4 overflow-x-hidden">
          <div
            v-if="preview"
            class="mx-auto w-full max-w-[190mm] rounded-md border p-2 print:hidden"
          >
            <QuestionKeySheet
              :subject="preview.target.subjectName"
              :grade="preview.target.gradeName"
              :package-title="preview.pkg.title"
              :date="formatPrintDate(preview.target.startsAt)"
              :time-range="
                formatPrintRange(preview.target.startsAt, preview.target.endsAt)
              "
              :items="preview.pkg.items"
              stacked
            />
          </div>
        </DialogBody>
        <DialogFooter standard>
          <Button
            :disabled="preview === null || printing"
            @click="preview && printTargets([preview.target])"
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
        <QuestionKeySheet
          v-for="sheet in printList"
          :key="sheet.target.activityId"
          :subject="sheet.target.subjectName"
          :grade="sheet.target.gradeName"
          :package-title="sheet.pkg.title"
          :date="formatPrintDate(sheet.target.startsAt)"
          :time-range="
            formatPrintRange(sheet.target.startsAt, sheet.target.endsAt)
          "
          :items="sheet.pkg.items"
          stacked
        />
      </div>
    </div>
  </div>
</template>
