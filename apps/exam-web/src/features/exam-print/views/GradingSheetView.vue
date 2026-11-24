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
  type ExamEvent,
} from '@/features/exam-event/types'
import { examTypeLabel } from '@/features/exam-schedule/types'
import { usePackageSubjects } from '@/features/exam-shared/usePackageSubjects'
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import {
  compareClassroom,
  compareGrade,
} from '@/features/exam-shared/classroomName'
import type { GradingSchedule } from '@/features/exam-grading/types'
import { dayKeyOf } from '@/features/exam-schedule/utils/groupSchedules'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { buildPrintEventColumns } from '../components/printEventColumns'
import GradingSheet from '../documents/GradingSheet.vue'
import { formatPrintDate, formatPrintRange, gradeOf } from '../format'
import { waitForPrintImages } from '../printImages'
import {
  gradingSheetService,
  type LoadedSheet,
  type SessionPerson,
} from '../services/gradingSheetService'

interface SubjectNode {
  id: string
  dayKey: string
  subject: string
  startsAt: string
  endsAt: string
  classes: GradingSchedule[]
}

interface DayNode {
  id: string
  startsAt: string
  subjects: SubjectNode[]
}

type Row = ExamEvent | DayNode | SubjectNode | GradingSchedule | SessionPerson

const ALL = 'ALL'
const SESSION_LABELS: Record<string, string> = {
  SUBMITTED: 'Terkumpul',
  GRADED: 'Dinilai',
  EXPIRED: 'Waktu habis',
}

const route = useRoute()
const router = useRouter()
const { subjectOf } = usePackageSubjects()
const { category } = useRouteCategory()
const isExam = computed(() => category.value !== 'NON_EXAM')
const gradeFieldId = useId()
const statusFieldId = useId()

const events = ref<ExamEvent[]>([])
const eventsLoaded = ref(false)
const schedulesLoaded = ref(false)
const loadingEvents = ref(false)
const loadingSchedules = ref(false)

const semesterId = ref('')
const status = ref(ALL)
const search = ref('')
const gradeFilter = ref(ALL)
const page = ref(1)
const pageSize = ref(25)
const printing = ref(false)
const loadedSchedules = ref<GradingSchedule[]>([])
const people = ref<SessionPerson[]>([])
const peopleLoading = ref(false)
const previewOpen = ref(false)
const preview = ref<LoadedSheet | null>(null)
const printList = ref<LoadedSheet[]>([])

const loading = computed(() => loadingEvents.value || loadingSchedules.value)

const paramValue = (name: string): string | null => {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}

const eventId = computed(() => (isExam.value ? paramValue('eventId') : null))
const dayId = computed(() => paramValue('dayId'))
const subjectId = computed(() => paramValue('subjectId'))
const classId = computed(() => paramValue('classId'))

const activeEvent = computed(() =>
  isExam.value
    ? (events.value.find((item) => item.id === eventId.value) ?? null)
    : null,
)

function schedulesOfEvent(
  list: GradingSchedule[],
  event: ExamEvent,
): GradingSchedule[] {
  return list.filter(
    (item) => item.startsAt >= event.startsAt && item.startsAt <= event.endsAt,
  )
}

const schedules = computed(() => {
  if (!isExam.value) return loadedSchedules.value
  if (activeEvent.value === null) return []
  return schedulesOfEvent(loadedSchedules.value, activeEvent.value)
})

const subjectName = (schedule: GradingSchedule) =>
  subjectOf(schedule.packageId, schedule.title)

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const days = computed<DayNode[]>(() => {
  const groups = new Map<string, SubjectNode>()
  for (const schedule of schedules.value) {
    if (schedule.kind === 'MAKEUP') continue
    const subject = subjectName(schedule)
    const key = `${schedule.startsAt}-${schedule.endsAt}-${slug(subject)}`
    const node = groups.get(key) ?? {
      id: key,
      dayKey: dayKeyOf(schedule.startsAt),
      subject,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
      classes: [],
    }
    node.classes.push(schedule)
    groups.set(key, node)
  }
  const byDay = new Map<string, SubjectNode[]>()
  for (const node of groups.values()) {
    const held = byDay.get(node.dayKey) ?? []
    held.push(node)
    byDay.set(node.dayKey, held)
  }
  return [...byDay.entries()]
    .map(([id, subjects]) => ({
      id,
      startsAt: subjects[0].startsAt,
      subjects: subjects.sort(
        (left, right) =>
          left.startsAt.localeCompare(right.startsAt) ||
          left.subject.localeCompare(right.subject, 'id'),
      ),
    }))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
})

const activeDay = computed(
  () => days.value.find((day) => day.id === dayId.value) ?? null,
)
const activeSubject = computed(
  () =>
    activeDay.value?.subjects.find((item) => item.id === subjectId.value) ??
    null,
)
const activeClass = computed(
  () =>
    activeSubject.value?.classes.find((item) => item.id === classId.value) ??
    null,
)

const gradeOptions = computed(() =>
  [
    ...new Set(
      (activeSubject.value?.classes ?? [])
        .map((item) => gradeOf(item.classroomName))
        .filter((grade): grade is string => grade !== null),
    ),
  ].sort(compareGrade),
)

const filteredClasses = computed(() =>
  (activeSubject.value?.classes ?? [])
    .filter(
      (item) =>
        gradeFilter.value === ALL ||
        gradeOf(item.classroomName) === gradeFilter.value,
    )
    .filter((item) => matches(item.classroomName ?? ''))
    .sort((left, right) =>
      compareClassroom(left.classroomName, right.classroomName),
    ),
)

function matches(text: string): boolean {
  const needle = search.value.trim().toLowerCase()
  return needle === '' || text.toLowerCase().includes(needle)
}

const atEventList = computed(() => isExam.value && activeEvent.value === null)

const levelRows = computed<Row[]>(() => {
  if (atEventList.value) {
    return events.value.filter(
      (event) =>
        (!semesterId.value || event.semesterId === semesterId.value) &&
        (status.value === ALL || event.status === status.value) &&
        (matches(event.name) ||
          matches(examTypeLabel(event.type)) ||
          matches(eventStatusLabel(event.status))),
    )
  }
  if (activeClass.value) {
    return people.value.filter((row) =>
      matches(`${row.studentName ?? ''} ${row.participantNumber ?? ''}`),
    )
  }
  if (activeSubject.value) return filteredClasses.value
  if (activeDay.value) {
    return activeDay.value.subjects.filter((item) => matches(item.subject))
  }
  return days.value.filter((day) => matches(dateOf(day.startsAt)))
})

const paginatedRows = computed(() => {
  if (isExam.value && activeEvent.value !== null) return levelRows.value
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

const dateOf = (iso: string): string => formatPrintDate(iso)
const clock = (iso: string): string =>
  formatPrintRange(iso, iso).split(' - ')[0]

const pageTitle = computed(() => {
  if (activeClass.value) {
    return `${activeSubject.value?.subject ?? ''} · ${activeClass.value.classroomName ?? ''}`
  }
  if (activeSubject.value) return activeSubject.value.subject
  if (activeDay.value) return dateOf(activeDay.value.startsAt)
  if (activeEvent.value) return activeEvent.value.name
  return 'Lembar Pemeriksaan Uraian'
})

const backLabel = computed(() => {
  if (activeClass.value) return 'Kembali ke daftar kelas'
  if (activeSubject.value) return 'Kembali ke daftar mapel'
  if (activeDay.value) return 'Kembali ke semua hari'
  return 'Kembali ke daftar periode'
})

const itemLabel = computed(() => {
  if (atEventList.value) return 'periode'
  if (activeClass.value) return 'siswa'
  if (activeSubject.value) return 'kelas'
  if (activeDay.value) return 'mapel'
  return 'hari'
})

const printLabel = computed(() =>
  activeSubject.value && !activeClass.value && gradeFilter.value !== ALL
    ? `Cetak Tingkat ${gradeFilter.value}`
    : 'Cetak',
)

const printTargets = computed<GradingSchedule[]>(() => {
  if (activeClass.value) return [activeClass.value]
  if (activeSubject.value) return filteredClasses.value
  if (activeDay.value) {
    return activeDay.value.subjects.flatMap((item) => item.classes)
  }
  if (!atEventList.value) {
    return days.value.flatMap((day) =>
      day.subjects.flatMap((item) => item.classes),
    )
  }
  return []
})

function goTo(
  nextEventId: string | null,
  nextDayId: string | null = null,
  nextSubjectId: string | null = null,
  nextClassId: string | null = null,
) {
  const params: Record<string, string> = {}
  if (isExam.value) {
    if (nextEventId !== null) params.eventId = nextEventId
    if (nextEventId !== null && nextDayId !== null) params.dayId = nextDayId
    if (nextEventId !== null && nextDayId !== null && nextSubjectId !== null) {
      params.subjectId = nextSubjectId
    }
    if (
      nextEventId !== null &&
      nextDayId !== null &&
      nextSubjectId !== null &&
      nextClassId !== null
    ) {
      params.classId = nextClassId
    }
  } else {
    if (nextDayId !== null) params.dayId = nextDayId
    if (nextDayId !== null && nextSubjectId !== null) {
      params.subjectId = nextSubjectId
    }
    if (nextDayId !== null && nextSubjectId !== null && nextClassId !== null) {
      params.classId = nextClassId
    }
  }
  void router.push({
    name: isExam.value ? 'ExamPrintGradingSheet' : 'ClassworkPrintGradingSheet',
    params,
  })
}

function goBack() {
  const currentEventId = activeEvent.value?.id ?? null
  if (activeClass.value) goTo(currentEventId, dayId.value, subjectId.value)
  else if (activeSubject.value) goTo(currentEventId, dayId.value)
  else if (activeDay.value) goTo(currentEventId)
  else goTo(null)
}

async function loadSchedules(): Promise<GradingSchedule[]> {
  loadingSchedules.value = true
  try {
    const loaded = await gradingSheetService.loadSchedules(
      category.value,
      isExam.value ? '' : semesterId.value,
    )
    loadedSchedules.value = loaded
    schedulesLoaded.value = true
    return loaded
  } catch {
    toast.error('Gagal memuat daftar ujian.')
    loadedSchedules.value = []
    return []
  } finally {
    loadingSchedules.value = false
  }
}

watch(semesterId, () => {
  page.value = 1
  if (!isExam.value) void loadSchedules()
})

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

watch(
  eventId,
  (next) => {
    if (isExam.value && next !== null && !schedulesLoaded.value) {
      void loadSchedules()
    }
  },
  { immediate: true },
)

watch(
  activeClass,
  async (klass) => {
    people.value = []
    if (klass === null) return
    peopleLoading.value = true
    try {
      people.value = await gradingSheetService.loadPeople(klass)
    } catch {
      toast.error('Gagal memuat daftar siswa.')
    } finally {
      peopleLoading.value = false
    }
  },
  { immediate: true },
)

watch([eventId, dayId, subjectId, classId], () => {
  search.value = ''
  gradeFilter.value = ALL
  page.value = 1
})

watch([gradeFilter, search, semesterId, status], () => {
  page.value = 1
})

watch(
  [
    loading,
    eventsLoaded,
    schedulesLoaded,
    activeEvent,
    activeDay,
    activeSubject,
    activeClass,
  ],
  () => {
    if (loading.value) return
    if (
      isExam.value &&
      eventId.value !== null &&
      eventsLoaded.value &&
      activeEvent.value === null
    ) {
      goTo(null)
      return
    }
    if (isExam.value && activeEvent.value === null) return
    if (!schedulesLoaded.value) return
    const currentEventId = activeEvent.value?.id ?? null
    if (dayId.value !== null && activeDay.value === null) {
      goTo(currentEventId)
    } else if (
      dayId.value !== null &&
      subjectId.value !== null &&
      activeSubject.value === null
    ) {
      goTo(currentEventId, dayId.value)
    } else if (
      dayId.value !== null &&
      subjectId.value !== null &&
      classId.value !== null &&
      activeClass.value === null
    ) {
      goTo(currentEventId, dayId.value, subjectId.value)
    }
  },
)

useBreadcrumbs(() => [
  ...(isExam.value
    ? [
        { title: 'Ujian', href: '#' },
        { title: 'Cetak Dokumen', href: '#' },
      ]
    : [{ title: 'Non-ujian', href: '#' }]),
  {
    title: 'Lembar Pemeriksaan Uraian',
    href: isExam.value
      ? activeEvent.value
        ? '/exam/print/grading-sheet'
        : '#'
      : activeDay.value
        ? '/classwork/print/grading-sheet'
        : '#',
  },
  ...(isExam.value && activeEvent.value
    ? [
        {
          title: activeEvent.value.name,
          href: activeDay.value
            ? `/exam/print/grading-sheet/${activeEvent.value.id}`
            : '#',
        },
      ]
    : []),
  ...(activeDay.value
    ? [{ title: dateOf(activeDay.value.startsAt), href: '#' }]
    : []),
  ...(activeSubject.value
    ? [{ title: activeSubject.value.subject, href: '#' }]
    : []),
  ...(activeClass.value
    ? [{ title: activeClass.value.classroomName ?? '', href: '#' }]
    : []),
])

async function loadSheets(
  targets: GradingSchedule[],
  onlyStudentId?: string,
): Promise<LoadedSheet[]> {
  const loaded: LoadedSheet[] = []
  for (const schedule of targets) {
    const sheet = await gradingSheetService.loadSheet(
      schedule,
      subjectName(schedule),
      onlyStudentId,
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
    const sorted = [...targets].sort(
      (left, right) =>
        left.startsAt.localeCompare(right.startsAt) ||
        subjectName(left).localeCompare(subjectName(right), 'id') ||
        (left.classroomName ?? '').localeCompare(
          right.classroomName ?? '',
          'id',
          { numeric: true },
        ),
    )
    const loaded = await loadSheets(sorted, onlyStudentId)
    if (loaded.length === 0) {
      toast.info('Tidak ada jawaban uraian untuk diperiksa.')
      return
    }
    printList.value = loaded
    await nextTick()
    await waitForPrintImages()
    document.body.classList.add('printing-stack')
    window.print()
    document.body.classList.remove('printing-stack')
  } catch {
    toast.error('Gagal memuat jawaban siswa.')
  } finally {
    printList.value = []
    printing.value = false
  }
}

async function printEvent(event: ExamEvent) {
  if (printing.value) return
  const all = schedulesLoaded.value
    ? loadedSchedules.value
    : await loadSchedules()
  const targets = schedulesOfEvent(all, event).filter(
    (schedule) => schedule.kind !== 'MAKEUP',
  )
  if (targets.length === 0) {
    toast.info('Belum ada ujian yang dikerjakan siswa pada periode ini.')
    return
  }
  await printSchedules(targets)
}

async function openPreview(person: SessionPerson) {
  const klass = activeClass.value
  if (klass === null || printing.value) return
  printing.value = true
  try {
    const [sheet] = await loadSheets([klass], person.studentId)
    if (sheet === undefined) {
      toast.info('Siswa ini tidak punya jawaban uraian untuk diperiksa.')
      return
    }
    preview.value = sheet
    previewOpen.value = true
  } catch {
    toast.error('Gagal memuat jawaban siswa.')
  } finally {
    printing.value = false
  }
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

const dayColumns = computed<ColumnDef<DayNode>[]>(() => [
  {
    id: 'date',
    header: 'Tanggal',
    meta: {
      mobile: 'title',
      mobileValue: (row: DayNode) => dateOf(row.startsAt),
    },
    cell: ({ row }) => dateOf(row.original.startsAt),
  },
  {
    id: 'subjects',
    header: 'Jumlah Mata Pelajaran',
    meta: {
      align: 'center',
      mobileValue: (row: DayNode) => row.subjects.length,
    },
    cell: ({ row }) => String(row.original.subjects.length),
  },
  {
    id: 'classes',
    header: 'Jumlah Kelas',
    meta: {
      align: 'center',
      mobileValue: (row: DayNode) =>
        row.subjects.reduce((sum, item) => sum + item.classes.length, 0),
    },
    cell: ({ row }) =>
      String(
        row.original.subjects.reduce(
          (sum, item) => sum + item.classes.length,
          0,
        ),
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
            () =>
              void printSchedules(
                row.original.subjects.flatMap((item) => item.classes),
              ),
          ),
        ],
        onManage: () => goTo(activeEvent.value?.id ?? null, row.original.id),
      }),
  },
])

const subjectColumns = computed<ColumnDef<SubjectNode>[]>(() => [
  {
    id: 'subject',
    header: 'Mata Pelajaran',
    meta: {
      mobile: 'title',
      mobileValue: (row: SubjectNode) => row.subject,
    },
    cell: ({ row }) => row.original.subject,
  },
  {
    id: 'start',
    header: 'Jam Mulai',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectNode) => clock(row.startsAt),
    },
    cell: ({ row }) => clock(row.original.startsAt),
  },
  {
    id: 'end',
    header: 'Jam Selesai',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectNode) => clock(row.endsAt),
    },
    cell: ({ row }) => clock(row.original.endsAt),
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
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        manageLabel: 'Lihat',
        hideEdit: true,
        hideDelete: true,
        items: [printItem(() => void printSchedules(row.original.classes))],
        onManage: () =>
          goTo(
            activeEvent.value?.id ?? null,
            row.original.dayKey,
            row.original.id,
          ),
      }),
  },
])

const classColumns = computed<ColumnDef<GradingSchedule>[]>(() => [
  {
    id: 'classroom',
    header: 'Kelas',
    meta: {
      mobile: 'title',
      mobileValue: (row: GradingSchedule) => row.classroomName ?? '-',
    },
    cell: ({ row }) => row.original.classroomName ?? '-',
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
    id: 'awaiting',
    header: 'Perlu Diperiksa',
    meta: {
      align: 'center',
      mobileValue: (row: GradingSchedule) => row.awaitingGrading,
    },
    cell: ({ row }) => String(row.original.awaitingGrading),
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
        items: [printItem(() => void printSchedules([row.original]))],
        onManage: () =>
          goTo(
            activeEvent.value?.id ?? null,
            dayId.value,
            subjectId.value,
            row.original.id,
          ),
      }),
  },
])

const personColumns = computed<ColumnDef<SessionPerson>[]>(() => [
  {
    id: 'number',
    header: 'Nomor Peserta',
    meta: {
      align: 'center',
      mobileLabel: 'Nomor Peserta',
      mobileValue: (row: SessionPerson) => row.participantNumber ?? '-',
    },
    cell: ({ row }) => row.original.participantNumber ?? '-',
  },
  {
    id: 'name',
    header: 'Nama Peserta',
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
      mobileValue: (row: SessionPerson) => SESSION_LABELS[row.status] ?? '-',
    },
    cell: ({ row }) => SESSION_LABELS[row.original.status] ?? '-',
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
              void printSchedules(printTargets.value, row.original.studentId),
          ),
        ],
        onManage: () => void openPreview(row.original),
      }),
  },
])

const columns = computed(() => {
  if (atEventList.value) return eventColumns
  if (activeClass.value) return personColumns.value
  if (activeSubject.value) return classColumns.value
  if (activeDay.value) return subjectColumns.value
  return dayColumns.value
})

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

const searchLabel = computed(() => {
  if (atEventList.value) return 'Cari periode'
  if (activeClass.value) return 'Cari nama atau nomor peserta'
  if (activeSubject.value) return 'Cari kelas'
  if (activeDay.value) return 'Cari mata pelajaran'
  return 'Cari tanggal'
})

if (isExam.value) void loadEvents()
else void loadSchedules()
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
            v-if="activeEvent || activeDay"
            :label="backLabel"
            @click="goBack"
          />
          <CardTitle class="font-semibold">{{ pageTitle }}</CardTitle>
        </div>
        <Button
          v-if="!atEventList"
          class="shrink-0"
          :disabled="loading || printing || printTargets.length === 0"
          @click="printSchedules(printTargets)"
        >
          <Printer class="size-4" />
          {{ printing ? 'Menyiapkan…' : printLabel }}
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
          :is-loading="loading || peopleLoading"
          :item-label="itemLabel"
          :hide-pagination="isExam && activeEvent !== null"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <template v-if="atEventList">
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
                    <SelectItem :value="ALL">Semua</SelectItem>
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
            <AcademicPeriodFilter
              v-if="!isExam && !activeSubject"
              v-model:semester-id="semesterId"
            />
            <FloatingLabelField
              v-if="activeSubject && !activeClass"
              label="Tingkat"
              :for="gradeFieldId"
              class="w-fit min-w-28"
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
                  <SelectItem :value="ALL">Semua</SelectItem>
                  <SelectItem
                    v-for="grade in gradeOptions"
                    :key="grade"
                    :value="grade"
                  >
                    Kelas {{ grade }}
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
                  : atEventList
                    ? 'Belum ada periode ujian.'
                    : activeClass
                      ? 'Belum ada siswa yang mengumpulkan ujian pada kelas ini.'
                      : 'Belum ada ujian yang dikerjakan siswa pada periode ini.'
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
          <DialogTitle>Pratinjau Lembar Pemeriksaan Uraian</DialogTitle>
          <DialogDescription>
            Lembar jawaban uraian satu siswa untuk diperiksa.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4 overflow-x-hidden">
          <div
            v-if="preview"
            class="mx-auto w-full max-w-[190mm] rounded-md border p-2 print:hidden"
          >
            <GradingSheet
              :subject="preview.subject"
              :classroom="preview.schedule.classroomName ?? '-'"
              :date="formatPrintDate(preview.schedule.startsAt)"
              :time-range="
                formatPrintRange(
                  preview.schedule.startsAt,
                  preview.schedule.endsAt,
                )
              "
              :teacher="preview.teacher"
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
              printSchedules([preview.schedule], preview.students[0]?.studentId)
            "
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
        <GradingSheet
          v-for="sheet in printList"
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
  </div>
</template>
