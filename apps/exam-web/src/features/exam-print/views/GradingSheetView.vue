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
import { usePackageSubjects } from '@/features/exam-shared/usePackageSubjects'
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import type { GradingSchedule } from '@/features/exam-grading/types'
import { dayKeyOf } from '@/features/exam-schedule/utils/groupSchedules'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
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

type Row = DayNode | SubjectNode | GradingSchedule | SessionPerson

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
const eventFieldId = useId()

interface EventOption {
  id: string
  name: string
  startsAt: string
  endsAt: string
}

const events = ref<EventOption[]>([])
const eventId = ref('')

const semesterId = ref('')
const search = ref('')
const gradeFilter = ref(ALL)
const page = ref(1)
const pageSize = ref(25)
const loading = ref(false)
const printing = ref(false)
const loadedSchedules = ref<GradingSchedule[]>([])
const schedules = computed(() => {
  if (!isExam.value) return loadedSchedules.value
  const event = events.value.find((item) => item.id === eventId.value)
  if (event === undefined) return []
  return loadedSchedules.value.filter(
    (item) => item.startsAt >= event.startsAt && item.startsAt <= event.endsAt,
  )
})
const people = ref<SessionPerson[]>([])
const peopleLoading = ref(false)
const previewOpen = ref(false)
const preview = ref<LoadedSheet | null>(null)
const printList = ref<LoadedSheet[]>([])

const paramValue = (name: string): string | null => {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}

const dayId = computed(() => paramValue('dayId'))
const subjectId = computed(() => paramValue('subjectId'))
const classId = computed(() => paramValue('classId'))

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
  ].sort(),
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
      (left.classroomName ?? '').localeCompare(
        right.classroomName ?? '',
        'id',
        {
          numeric: true,
        },
      ),
    ),
)

function matches(text: string): boolean {
  const needle = search.value.trim().toLowerCase()
  return needle === '' || text.toLowerCase().includes(needle)
}

const levelRows = computed<Row[]>(() => {
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
  return 'Lembar Pemeriksaan Uraian'
})

const backLabel = computed(() =>
  activeClass.value
    ? 'Kembali ke daftar kelas'
    : activeSubject.value
      ? 'Kembali ke daftar mapel'
      : 'Kembali ke semua hari',
)

const itemLabel = computed(() =>
  activeClass.value
    ? 'siswa'
    : activeSubject.value
      ? 'kelas'
      : activeDay.value
        ? 'mapel'
        : 'hari',
)

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
  return days.value.flatMap((day) =>
    day.subjects.flatMap((item) => item.classes),
  )
})

function goTo(
  day: string | null,
  subject: string | null = null,
  klass: string | null = null,
) {
  const params: Record<string, string> = {}
  if (day !== null) params.dayId = day
  if (day !== null && subject !== null) params.subjectId = subject
  if (day !== null && subject !== null && klass !== null) {
    params.classId = klass
  }
  void router.push({
    name: isExam.value ? 'ExamPrintGradingSheet' : 'ClassworkPrintGradingSheet',
    params,
  })
}

function goBack() {
  if (activeClass.value) goTo(dayId.value, subjectId.value)
  else if (activeSubject.value) goTo(dayId.value)
  else goTo(null)
}

async function loadSchedules() {
  loading.value = true
  try {
    loadedSchedules.value = await gradingSheetService.loadSchedules(
      category.value,
      isExam.value ? '' : semesterId.value,
    )
  } catch {
    toast.error('Gagal memuat daftar ujian.')
    loadedSchedules.value = []
  } finally {
    loading.value = false
  }
}

watch(semesterId, () => {
  page.value = 1
  if (!isExam.value) void loadSchedules()
})

async function loadEvents() {
  const result = await examEventService.loadEvents({ limit: 200 })
  if (!result.success) {
    toast.error('Gagal memuat periode ujian.')
    return
  }
  events.value = result.data.map((event) => ({
    id: event.id,
    name: event.name,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
  }))
  const active = result.data.find((event) => event.status === 'ACTIVE')
  eventId.value = active?.id ?? result.data[0]?.id ?? ''
}

watch(eventId, (_next, previous) => {
  page.value = 1
  if (previous !== '' && dayId.value !== null) goTo(null)
})

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

watch([dayId, subjectId, classId, gradeFilter, search], () => {
  page.value = 1
})

watch([days, () => route.params.dayId], () => {
  if (loading.value) return
  if (dayId.value !== null && activeDay.value === null) goTo(null)
})

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
      ? '/exam/print/grading-sheet'
      : '/classwork/print/grading-sheet',
  },
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
        onManage: () => goTo(row.original.id),
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
        onManage: () => goTo(row.original.dayKey, row.original.id),
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
        onManage: () => goTo(dayId.value, subjectId.value, row.original.id),
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
  if (activeClass.value) return personColumns.value
  if (activeSubject.value) return classColumns.value
  if (activeDay.value) return subjectColumns.value
  return dayColumns.value
})

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

const searchLabel = computed(() =>
  activeClass.value
    ? 'Cari nama atau nomor peserta'
    : activeSubject.value
      ? 'Cari kelas'
      : activeDay.value
        ? 'Cari mata pelajaran'
        : 'Cari tanggal',
)

if (isExam.value) void loadEvents()
void loadSchedules()
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
          <CardTitle class="font-semibold">{{ pageTitle }}</CardTitle>
        </div>
        <Button
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
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <AcademicPeriodFilter
              v-if="!isExam && !activeSubject"
              v-model:semester-id="semesterId"
            />
            <FloatingLabelField
              v-if="isExam && !activeSubject"
              label="Periode Ujian"
              :for="eventFieldId"
              class="w-fit min-w-40"
              floating
            >
              <Select v-model="eventId">
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
