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
import {
  formatScore,
  type GradingSchedule,
} from '@/features/exam-grading/types'
import { examTypeLabel } from '@/features/exam-schedule/types'
import { usePackageSubjects } from '@/features/exam-shared/usePackageSubjects'
import {
  compareClassroom,
  gradeOfClassroom,
} from '@/features/exam-shared/classroomName'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import StudentRecapSheet from '../documents/StudentRecapSheet.vue'
import StudentScoreRecapSheet from '../documents/StudentScoreRecapSheet.vue'
import { formatPrintDate, formatPrintRange, formatPrintTime } from '../format'
import { waitForPrintImages } from '../printImages'
import {
  gradingSheetService,
  type LoadedSheet,
  type SessionPerson,
} from '../services/gradingSheetService'

interface SubjectNode {
  id: string
  subject: string
  classes: GradingSchedule[]
}

type Row = ExamEvent | SubjectNode | GradingSchedule | SessionPerson

const SESSION_LABELS: Record<string, string> = {
  SUBMITTED: 'Terkumpul',
  GRADED: 'Dinilai',
  EXPIRED: 'Waktu habis',
}

const route = useRoute()
const router = useRouter()
const { subjectOf, ready: subjectsReady } = usePackageSubjects()
const statusFieldId = useId()

const events = ref<ExamEvent[]>([])
const eventsLoaded = ref(false)
const loadedSchedules = ref<GradingSchedule[]>([])
const schedulesLoaded = ref(false)
const people = ref<SessionPerson[]>([])
const peopleLoaded = ref(false)
const semesterId = ref('')
const status = ref('ALL')
const gradeFilter = ref('ALL')
const search = ref('')
const gradeFieldId = useId()
const page = ref(1)
const pageSize = ref(25)
const loadingInit = ref(false)
const loadingPeople = ref(false)
const printing = ref(false)
const previewOpen = ref(false)
const preview = ref<LoadedSheet | null>(null)
const scorePreviewOpen = ref(false)
const scorePreview = ref<LoadedSheet | null>(null)
const printList = ref<LoadedSheet[]>([])
const scorePrintList = ref<LoadedSheet[]>([])

const loading = computed(() => loadingInit.value || loadingPeople.value)

function readParam(name: 'eventId' | 'subjectId' | 'classId'): string | null {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}

const eventId = computed(() => readParam('eventId'))
const subjectId = computed(() => readParam('subjectId'))
const classId = computed(() => readParam('classId'))

const activeEvent = computed(
  () => events.value.find((event) => event.id === eventId.value) ?? null,
)

const subjectName = (schedule: GradingSchedule) =>
  subjectOf(schedule.packageId, schedule.title)

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const schedulesOfEvent = (event: ExamEvent): GradingSchedule[] =>
  loadedSchedules.value.filter(
    (item) =>
      item.kind !== 'MAKEUP' &&
      item.startsAt >= event.startsAt &&
      item.startsAt <= event.endsAt,
  )

const eventSchedules = computed<GradingSchedule[]>(() =>
  activeEvent.value ? schedulesOfEvent(activeEvent.value) : [],
)

const subjects = computed<SubjectNode[]>(() => {
  const groups = new Map<string, SubjectNode>()
  for (const schedule of eventSchedules.value) {
    const subject = subjectName(schedule)
    const id = slug(subject)
    const node = groups.get(id) ?? {
      id,
      subject,
      classes: [],
    }
    node.classes.push(schedule)
    groups.set(id, node)
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      classes: [...group.classes].sort((left, right) =>
        compareClassroom(left.classroomName, right.classroomName),
      ),
    }))
    .sort((left, right) => left.subject.localeCompare(right.subject, 'id'))
})

const activeSubject = computed(
  () => subjects.value.find((item) => item.id === subjectId.value) ?? null,
)

const activeClass = computed(
  () =>
    activeSubject.value?.classes.find((item) => item.id === classId.value) ??
    null,
)

function matches(text: string): boolean {
  const needle = search.value.trim().toLowerCase()
  return needle === '' || text.toLowerCase().includes(needle)
}

const gradeOptions = computed<string[]>(() => {
  if (!activeSubject.value) return []
  const seen = new Set<string>()
  const list: string[] = []
  for (const item of activeSubject.value.classes) {
    const label = gradeOfClassroom(item.classroomName)
    if (label !== '-' && !seen.has(label)) {
      seen.add(label)
      list.push(label)
    }
  }
  return list
})

const filteredSubjectClasses = computed<GradingSchedule[]>(() => {
  if (!activeSubject.value) return []
  return activeSubject.value.classes.filter(
    (item) =>
      (gradeFilter.value === 'ALL' ||
        gradeOfClassroom(item.classroomName) === gradeFilter.value) &&
      matches(item.classroomName ?? ''),
  )
})

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
  if (activeClass.value) {
    return people.value.filter(
      (person) =>
        matches(person.studentName ?? '') ||
        matches(person.participantNumber ?? ''),
    )
  }
  if (activeSubject.value) {
    return filteredSubjectClasses.value
  }
  return subjects.value.filter((group) => matches(group.subject))
})

const paginatedRows = computed(() => {
  if (activeEvent.value) return levelRows.value
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

const pageTitle = computed(() => {
  if (activeClass.value) {
    return `${activeSubject.value?.subject ?? ''} · ${activeClass.value.classroomName ?? '-'}`
  }
  if (activeSubject.value) return activeSubject.value.subject
  if (activeEvent.value) return activeEvent.value.name
  return 'Rekap Soal Siswa'
})

const itemLabel = computed(() => {
  if (activeClass.value) return 'siswa'
  if (activeSubject.value) return 'kelas'
  if (activeEvent.value) return 'mata pelajaran'
  return 'periode'
})

const searchLabel = computed(() => {
  if (activeClass.value) return 'Cari siswa'
  if (activeSubject.value) return 'Cari kelas'
  if (activeEvent.value) return 'Cari mata pelajaran'
  return 'Cari periode'
})

const backTarget = computed<{
  label: string
  eventId: string | null
  subjectId?: string | null
} | null>(() => {
  if (!activeEvent.value) return null
  if (activeClass.value && activeSubject.value) {
    return {
      label: 'Kembali ke daftar kelas',
      eventId: activeEvent.value.id,
      subjectId: activeSubject.value.id,
    }
  }
  if (activeSubject.value) {
    return {
      label: 'Kembali ke daftar mata pelajaran',
      eventId: activeEvent.value.id,
    }
  }
  return {
    label: 'Kembali ke daftar periode',
    eventId: null,
  }
})

const printTargetsList = computed<GradingSchedule[]>(() => {
  if (activeClass.value) return [activeClass.value]
  if (activeSubject.value) return filteredSubjectClasses.value
  if (activeEvent.value) return eventSchedules.value
  return []
})

const eventDateFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  dateStyle: 'long',
})

function formatEventDate(iso: string): string {
  return eventDateFormat.format(new Date(iso))
}

function goTo(
  nextEventId: string | null,
  nextSubjectId?: string | null,
  nextClassId?: string | null,
) {
  const params: Record<string, string> = {}
  if (nextEventId !== null) params.eventId = nextEventId
  if (nextEventId !== null && nextSubjectId) params.subjectId = nextSubjectId
  if (nextEventId !== null && nextSubjectId && nextClassId) {
    params.classId = nextClassId
  }
  void router.push({
    name: 'ExamPrintStudentRecap',
    params,
  })
}

async function init() {
  loadingInit.value = true
  try {
    const [eventsResult, schedules] = await Promise.all([
      examEventService.loadEvents({ limit: 200 }),
      gradingSheetService.loadSchedules('EXAM', ''),
    ])
    if (!eventsResult.success) {
      toast.error('Gagal memuat periode ujian.')
    } else {
      events.value = eventsResult.data
      eventsLoaded.value = true
    }
    loadedSchedules.value = schedules
    schedulesLoaded.value = true
  } catch {
    toast.error('Gagal memuat data rekap soal siswa.')
  } finally {
    loadingInit.value = false
  }
}

watch(
  activeClass,
  async (klass) => {
    if (klass === null) {
      people.value = []
      peopleLoaded.value = false
      loadingPeople.value = false
      return
    }
    loadingPeople.value = true
    peopleLoaded.value = false
    try {
      const rows = await gradingSheetService.loadPeople(klass)
      if (activeClass.value?.id !== klass.id) return
      people.value = rows
      peopleLoaded.value = true
    } catch {
      if (activeClass.value?.id !== klass.id) return
      toast.error('Gagal memuat daftar siswa.')
      people.value = []
    } finally {
      if (activeClass.value?.id === klass.id) loadingPeople.value = false
    }
  },
  { immediate: true },
)

watch([eventId, subjectId, classId], () => {
  search.value = ''
  gradeFilter.value = 'ALL'
  page.value = 1
})

watch([search, semesterId, status, gradeFilter], () => {
  page.value = 1
})

watch(
  [
    loading,
    eventsLoaded,
    schedulesLoaded,
    subjectsReady,
    activeEvent,
    activeSubject,
    activeClass,
  ],
  () => {
    if (loading.value || !subjectsReady.value) return
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
      schedulesLoaded.value &&
      activeSubject.value === null
    ) {
      goTo(activeEvent.value.id)
      return
    }
    if (
      classId.value !== null &&
      activeEvent.value !== null &&
      activeSubject.value !== null &&
      schedulesLoaded.value &&
      activeClass.value === null
    ) {
      goTo(activeEvent.value.id, activeSubject.value.id)
    }
  },
)

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Cetak Dokumen', href: '#' },
  {
    title: 'Rekap Soal Siswa',
    href: activeEvent.value ? '/exam/print/student-recap' : '#',
  },
  ...(activeEvent.value
    ? [
        {
          title: activeEvent.value.name,
          href: activeSubject.value
            ? `/exam/print/student-recap/${activeEvent.value.id}`
            : '#',
        },
      ]
    : []),
  ...(activeSubject.value
    ? [
        {
          title: activeSubject.value.subject,
          href: activeClass.value
            ? `/exam/print/student-recap/${activeEvent.value?.id}/${activeSubject.value.id}`
            : '#',
        },
      ]
    : []),
  ...(activeClass.value
    ? [{ title: activeClass.value.classroomName ?? '-', href: '#' }]
    : []),
])

async function loadRecapSheets(
  targets: GradingSchedule[],
  onlyStudentId?: string,
): Promise<LoadedSheet[]> {
  const sorted = [...targets].sort(
    (left, right) =>
      left.startsAt.localeCompare(right.startsAt) ||
      compareClassroom(left.classroomName, right.classroomName),
  )
  const loaded: LoadedSheet[] = []
  for (const schedule of sorted) {
    const sheet = await gradingSheetService.loadSheet(
      schedule,
      subjectName(schedule),
      onlyStudentId,
      { manualOnly: false, includeTeacher: true },
    )
    if (sheet.students.length > 0) loaded.push(sheet)
  }
  return loaded
}

async function printSchedules(
  targets: GradingSchedule[],
  onlyStudentId?: string,
) {
  if (printing.value || targets.length === 0) return
  printing.value = true
  try {
    const loaded = await loadRecapSheets(targets, onlyStudentId)
    if (loaded.length === 0) {
      toast.info('Tidak ada sesi siswa untuk dicetak.')
      return
    }
    printList.value = loaded
    await nextTick()
    await waitForPrintImages()
    document.body.classList.add('printing-stack')
    window.print()
  } catch {
    toast.error('Gagal memuat rekap soal siswa.')
  } finally {
    document.body.classList.remove('printing-stack')
    printList.value = []
    printing.value = false
  }
}

async function printScoreSheets(targets: GradingSchedule[]) {
  if (printing.value || targets.length === 0) return
  printing.value = true
  try {
    const loaded = await loadRecapSheets(targets)
    if (loaded.length === 0) {
      toast.info('Tidak ada sesi siswa untuk dicetak.')
      return
    }
    scorePrintList.value = loaded
    await nextTick()
    await waitForPrintImages()
    document.body.classList.add('printing-stack')
    window.print()
  } catch {
    toast.error('Gagal memuat rekap nilai siswa.')
  } finally {
    document.body.classList.remove('printing-stack')
    scorePrintList.value = []
    printing.value = false
  }
}

async function openScorePreview(klass: GradingSchedule) {
  if (printing.value) return
  printing.value = true
  try {
    const [sheet] = await loadRecapSheets([klass])
    if (sheet === undefined) {
      toast.info('Data nilai siswa tidak ditemukan.')
      return
    }
    scorePreview.value = sheet
    scorePreviewOpen.value = true
  } catch {
    toast.error('Gagal memuat rekap nilai siswa.')
  } finally {
    printing.value = false
  }
}

async function openPreview(person: SessionPerson) {
  const klass = activeClass.value
  if (klass === null || printing.value) return
  printing.value = true
  try {
    const [sheet] = await loadRecapSheets([klass], person.studentId)
    if (sheet === undefined) {
      toast.info('Data jawaban siswa tidak ditemukan.')
      return
    }
    preview.value = sheet
    previewOpen.value = true
  } catch {
    toast.error('Gagal memuat rekap soal siswa.')
  } finally {
    printing.value = false
  }
}

const sessionScoreLabel = (person: SessionPerson): string => {
  if (person.rawScore === null && person.maxScore === null) return '-'
  const raw = person.rawScore === null ? '-' : formatScore(person.rawScore)
  const max = person.maxScore === null ? '-' : formatScore(person.maxScore)
  return `${raw} / ${max}`
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
        items: [
          printItem(
            () => void printScoreSheets(schedulesOfEvent(row.original)),
          ),
        ],
        onManage: () => goTo(row.original.id),
      }),
  },
])

const subjectColumns = computed<ColumnDef<SubjectNode>[]>(() => [
  {
    id: 'subject',
    header: 'Mata Pelajaran',
    meta: {
      strong: true,
      mobile: 'title',
      mobileValue: (row: SubjectNode) => row.subject,
    },
    cell: ({ row }) => row.original.subject,
  },
  {
    id: 'classes',
    header: 'Jumlah Kelas',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectNode) => row.classes.length,
    },
    cell: ({ row }) => String(row.original.classes.length),
  },
  {
    id: 'sessions',
    header: 'Jumlah Siswa',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectNode) =>
        row.classes.reduce((sum, item) => sum + item.sessions, 0),
    },
    cell: ({ row }) =>
      String(
        row.original.classes.reduce((sum, item) => sum + item.sessions, 0),
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
        items: [printItem(() => void printScoreSheets(row.original.classes))],
        onManage: () => goTo(activeEvent.value?.id ?? null, row.original.id),
      }),
  },
])

const classColumns = computed<ColumnDef<GradingSchedule>[]>(() => [
  {
    id: 'classroom',
    header: 'Kelas',
    meta: {
      strong: true,
      mobile: 'title',
      mobileValue: (row: GradingSchedule) => row.classroomName ?? '-',
    },
    cell: ({ row }) => row.original.classroomName ?? '-',
  },
  {
    id: 'date',
    header: 'Hari, Tanggal',
    meta: {
      align: 'center',
      mobileLabel: 'Hari, Tanggal',
      mobileValue: (row: GradingSchedule) => formatPrintDate(row.startsAt),
    },
    cell: ({ row }) => formatPrintDate(row.original.startsAt),
  },
  {
    id: 'start',
    header: 'Jam Mulai',
    meta: {
      align: 'center',
      mobileLabel: 'Jam Mulai',
      mobileValue: (row: GradingSchedule) => formatPrintTime(row.startsAt),
    },
    cell: ({ row }) => formatPrintTime(row.original.startsAt),
  },
  {
    id: 'end',
    header: 'Jam Selesai',
    meta: {
      align: 'center',
      mobileLabel: 'Jam Selesai',
      mobileValue: (row: GradingSchedule) => formatPrintTime(row.endsAt),
    },
    cell: ({ row }) => formatPrintTime(row.original.endsAt),
  },
  {
    id: 'sessions',
    header: 'Jumlah Siswa',
    meta: {
      align: 'center',
      mobileValue: (row: GradingSchedule) => row.sessions,
    },
    cell: ({ row }) => String(row.original.sessions),
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
            label: 'Pratinjau Nilai',
            onClick: () => void openScorePreview(row.original),
          },
          {
            label: 'Cetak Nilai',
            icon: Printer,
            onClick: () => void printScoreSheets([row.original]),
          },
          {
            label: 'Cetak Detail Soal',
            icon: Printer,
            onClick: () => void printSchedules([row.original]),
          },
        ],
        onManage: () =>
          goTo(
            activeEvent.value?.id ?? null,
            activeSubject.value?.id ?? null,
            row.original.id,
          ),
      }),
  },
])

const peopleColumns = computed<ColumnDef<SessionPerson>[]>(() => [
  {
    id: 'number',
    header: 'No. Peserta',
    meta: {
      align: 'center',
      mobileLabel: 'No. Peserta',
      mobileValue: (row: SessionPerson) => row.participantNumber ?? '-',
    },
    cell: ({ row }) => row.original.participantNumber ?? '-',
  },
  {
    id: 'name',
    header: 'Nama Siswa',
    meta: {
      strong: true,
      mobile: 'title',
      mobileValue: (row: SessionPerson) => row.studentName ?? '-',
    },
    cell: ({ row }) => row.original.studentName ?? '-',
  },
  {
    id: 'status',
    header: 'Status',
    meta: {
      align: 'center',
      mobileLabel: 'Status',
      mobileValue: (row: SessionPerson) =>
        SESSION_LABELS[row.status] ?? row.status,
    },
    cell: ({ row }) =>
      SESSION_LABELS[row.original.status] ?? row.original.status,
  },
  {
    id: 'score',
    header: 'Nilai',
    meta: {
      align: 'center',
      mobileLabel: 'Nilai',
      mobileValue: (row: SessionPerson) => sessionScoreLabel(row),
    },
    cell: ({ row }) => sessionScoreLabel(row.original),
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
          printItem(
            () =>
              activeClass.value &&
              void printSchedules([activeClass.value], row.original.studentId),
          ),
        ],
        onManage: () => void openPreview(row.original),
      }),
  },
])

function openRecapRow(row: Row) {
  if ('studentId' in row) {
    void openPreview(row)
    return
  }
  if ('packageId' in row) {
    goTo(activeEvent.value?.id ?? null, activeSubject.value?.id ?? null, row.id)
    return
  }
  if ('classes' in row) {
    goTo(activeEvent.value?.id ?? null, row.id)
    return
  }
  goTo(row.id)
}

const columns = computed(() => {
  if (!activeEvent.value) return eventColumns.value
  if (activeClass.value) return peopleColumns.value
  if (activeSubject.value) return classColumns.value
  return subjectColumns.value
})

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

void init()
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
            v-if="backTarget"
            :label="backTarget.label"
            @click="goTo(backTarget.eventId, backTarget.subjectId)"
          />
          <CardTitle class="font-semibold">{{ pageTitle }}</CardTitle>
        </div>
        <Button
          v-if="activeEvent"
          class="shrink-0"
          :disabled="loading || printing || printTargetsList.length === 0"
          @click="printScoreSheets(printTargetsList)"
        >
          <Printer class="size-4" />
          {{ printing ? 'Menyiapkan…' : 'Cetak Nilai' }}
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
          @row-click="openRecapRow"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template
            v-if="
              !activeEvent ||
              (activeSubject && !activeClass && gradeOptions.length > 0)
            "
            #filters
          >
            <template v-if="!activeEvent">
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
            <FloatingLabelField
              v-else
              label="Tingkat"
              :for="gradeFieldId"
              class="w-fit min-w-32"
              floating
            >
              <Select v-model="gradeFilter">
                <SelectTrigger
                  :id="gradeFieldId"
                  class="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem
                    v-for="grade in gradeOptions"
                    :key="grade"
                    :value="grade"
                  >
                    {{ grade }}
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
                  : activeClass
                    ? 'Belum ada siswa yang menyelesaikan ujian ini.'
                    : activeEvent
                      ? 'Belum ada ujian pada periode ini.'
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
          <DialogTitle>Pratinjau Rekap Soal Siswa</DialogTitle>
          <DialogDescription>
            Rekap soal, kunci jawaban, dan jawaban siswa untuk arsip.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4 overflow-x-hidden">
          <div
            v-if="preview"
            class="mx-auto w-full max-w-[190mm] rounded-md border p-2 print:hidden"
          >
            <StudentRecapSheet
              :subject="preview.subject"
              :classroom="preview.schedule.classroomName ?? '-'"
              :date="formatPrintDate(preview.schedule.startsAt)"
              :time-range="
                formatPrintRange(
                  preview.schedule.startsAt,
                  preview.schedule.endsAt,
                )
              "
              :students="preview.students"
              stacked
            />
          </div>
        </DialogBody>
        <DialogFooter standard>
          <Button
            :disabled="preview === null || printing"
            @click="
              preview &&
              preview.students[0] &&
              printSchedules([preview.schedule], preview.students[0].studentId)
            "
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="scorePreviewOpen">
      <DialogContent
        size="xl"
        class="sm:max-w-[min(calc(100%-2rem),210mm)]"
      >
        <DialogHeader standard>
          <DialogTitle>Pratinjau Rekap Nilai Siswa</DialogTitle>
          <DialogDescription>
            Rekap nilai siswa per kelas berdasarkan jenis soal ujian.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4 overflow-x-hidden">
          <div
            v-if="scorePreview"
            class="mx-auto w-full max-w-[190mm] rounded-md border p-2 print:hidden"
          >
            <StudentScoreRecapSheet
              :subject="scorePreview.subject"
              :classroom="scorePreview.schedule.classroomName ?? '-'"
              :date="formatPrintDate(scorePreview.schedule.startsAt)"
              :time-range="
                formatPrintRange(
                  scorePreview.schedule.startsAt,
                  scorePreview.schedule.endsAt,
                )
              "
              :teacher="scorePreview.teacher"
              :students="scorePreview.students"
            />
          </div>
        </DialogBody>
        <DialogFooter standard>
          <Button
            :disabled="scorePreview === null || printing"
            @click="scorePreview && printScoreSheets([scorePreview.schedule])"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div
      v-if="scorePrintList.length > 0"
      class="print-only"
    >
      <div class="print-stack">
        <StudentScoreRecapSheet
          v-for="sheet in scorePrintList"
          :key="sheet.schedule.id"
          :subject="sheet.subject"
          :classroom="sheet.schedule.classroomName ?? '-'"
          :date="formatPrintDate(sheet.schedule.startsAt)"
          :time-range="
            formatPrintRange(sheet.schedule.startsAt, sheet.schedule.endsAt)
          "
          :teacher="sheet.teacher"
          :students="sheet.students"
          stacked
        />
      </div>
    </div>

    <div
      v-if="printList.length > 0"
      class="print-only"
    >
      <div class="print-stack">
        <StudentRecapSheet
          v-for="sheet in printList"
          :key="sheet.schedule.id"
          :subject="sheet.subject"
          :classroom="sheet.schedule.classroomName ?? '-'"
          :date="formatPrintDate(sheet.schedule.startsAt)"
          :time-range="
            formatPrintRange(sheet.schedule.startsAt, sheet.schedule.endsAt)
          "
          :students="sheet.students"
          stacked
        />
      </div>
    </div>
  </div>
</template>
