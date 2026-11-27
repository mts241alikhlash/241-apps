<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import { categoryOf } from '@/features/exam-shared/examType'
import {
  canManageMakeup,
  canReadMakeup,
} from '@/features/exam-shared/makeupAccess'
import { usePackageSubjects } from '@/features/exam-shared/usePackageSubjects'
import {
  ActionCell,
  BackButton,
  DataTable,
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
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import MakeupDialog from '@/features/exam-schedule/components/MakeupDialog.vue'
import MakeupParticipantsDialog from '@/features/exam-schedule/components/MakeupParticipantsDialog.vue'
import type { MakeupOrigin } from '@/features/exam-schedule/types'
import type { GradingSchedule } from '../types'
import { buildGradingScheduleColumns } from '../components/gradingColumns'
import {
  useEventGradingSchedules,
  compareClassroom,
  useGradingSchedules,
  type GradingEventOption,
} from '../composables/useGradingLists'

interface SubjectNode {
  id: string
  subject: string
  startsAt: string
  endsAt: string
  classes: GradingSchedule[]
}

type Row = GradingEventOption | SubjectNode | GradingSchedule

const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuthSession()
const makeupTarget = ref<MakeupOrigin | null>(null)
const participantsTarget = ref<GradingSchedule | null>(null)
const { category, sectionPrefix } = useRouteCategory()
const { subjectOf } = usePackageSubjects()
const subjectName = (schedule: GradingSchedule) =>
  subjectOf(schedule.packageId, schedule.title)

function originOf(schedule: GradingSchedule): MakeupOrigin {
  return {
    id: schedule.id,
    packageId: schedule.packageId,
    packageTitle: subjectName(schedule),
    classroomName: schedule.classroomName,
    durationMinutes: schedule.durationMinutes,
    endsAt: schedule.endsAt,
  }
}
const semesterId = ref('')
const page = ref(1)
const pageSize = ref(25)

const isExam = computed(() => category.value !== 'NON_EXAM')
const paged = useGradingSchedules(page, pageSize, category, semesterId)
const byEvent = useEventGradingSchedules(page, pageSize)
if (isExam.value) void byEvent.refresh()

const loading = computed(() =>
  isExam.value ? byEvent.loading.value : paged.loading.value,
)
const listError = computed(() =>
  isExam.value ? byEvent.listError.value : paged.listError.value,
)
const refresh = () => (isExam.value ? byEvent.refresh() : paged.refresh())

watch(semesterId, () => (page.value = 1), { flush: 'sync' })

const paramValue = (name: string): string | null => {
  const value = route.params[name]
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw !== '' ? raw : null
}
const eventParam = computed(() => paramValue('eventId'))
const subjectParam = computed(() => paramValue('subjectId'))

const activeEvent = computed(
  () =>
    byEvent.events.value.find((item) => item.id === eventParam.value) ?? null,
)

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const subjectNodes = computed<SubjectNode[]>(() => {
  if (activeEvent.value === null) return []
  const groups = new Map<string, SubjectNode>()
  for (const schedule of byEvent.schedulesOf(activeEvent.value.id)) {
    const subject = subjectName(schedule)
    const key = `${schedule.startsAt}-${schedule.endsAt}-${slug(subject)}`
    const node = groups.get(key) ?? {
      id: key,
      subject,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
      classes: [],
    }
    node.classes.push(schedule)
    groups.set(key, node)
  }
  return [...groups.values()].sort(
    (left, right) =>
      left.startsAt.localeCompare(right.startsAt) ||
      left.subject.localeCompare(right.subject, 'id'),
  )
})

const activeSubject = computed(
  () =>
    subjectNodes.value.find((item) => item.id === subjectParam.value) ?? null,
)

const level = computed<'period' | 'subject' | 'class' | 'flat'>(() => {
  if (!isExam.value) return 'flat'
  if (activeSubject.value) return 'class'
  if (activeEvent.value) return 'subject'
  return 'period'
})

const sumOf = (rows: GradingSchedule[], key: 'sessions' | 'awaitingGrading') =>
  rows.reduce((total, row) => total + row[key], 0)

const levelRows = computed<Row[]>(() => {
  if (level.value === 'flat') return paged.schedules.value
  if (level.value === 'class') {
    return [...(activeSubject.value?.classes ?? [])].sort((left, right) =>
      compareClassroom(left.classroomName, right.classroomName),
    )
  }
  if (level.value === 'subject') return subjectNodes.value
  return [...byEvent.events.value].sort((left, right) =>
    left.startsAt.localeCompare(right.startsAt),
  )
})

const totalItems = computed(() =>
  level.value === 'flat' ? paged.totalItems.value : levelRows.value.length,
)

const pageRows = computed(() => {
  if (level.value === 'flat') return paged.schedules.value
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

const dateText = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(iso))
const clock = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(iso))
    .replace('.', ':')

const baseHref = computed(() => `${sectionPrefix.value}/grading`)

function goTo(eventId: string | null, subjectId: string | null = null) {
  if (eventId === null) {
    void router.push(baseHref.value)
    return
  }
  const tail = subjectId === null ? '' : `/${subjectId}`
  void router.push(`${baseHref.value}/period/${eventId}${tail}`)
}

function goBack() {
  if (level.value === 'class') goTo(eventParam.value)
  else goTo(null)
}

const pageTitle = computed(() => {
  if (level.value === 'class') return activeSubject.value?.subject ?? ''
  if (level.value === 'subject') return activeEvent.value?.name ?? ''
  return isExam.value ? 'Penilaian Ujian' : 'Penilaian Non-ujian'
})

const backLabel = computed(() =>
  level.value === 'class'
    ? 'Kembali ke daftar mapel'
    : 'Kembali ke semua periode',
)

const itemLabel = computed(() =>
  level.value === 'class'
    ? 'kelas'
    : level.value === 'subject'
      ? 'mapel'
      : level.value === 'period'
        ? 'periode'
        : 'ujian',
)

useBreadcrumbs(() => [
  { title: isExam.value ? 'Ujian' : 'Non-ujian', href: '#' },
  {
    title:
      pageTitle.value && level.value === 'period'
        ? pageTitle.value
        : isExam.value
          ? 'Penilaian Ujian'
          : 'Penilaian Non-ujian',
    href: baseHref.value,
  },
  ...(activeEvent.value ? [{ title: activeEvent.value.name, href: '#' }] : []),
  ...(activeSubject.value
    ? [{ title: activeSubject.value.subject, href: '#' }]
    : []),
])

function openGradingSchedule(schedule: GradingSchedule) {
  void router.push({
    path: `${baseHref.value}/${schedule.id}`,
    query: {
      judul: subjectName(schedule),
      ...(isExam.value && eventParam.value
        ? { periode: eventParam.value }
        : {}),
      ...(isExam.value && subjectParam.value
        ? { mapel: subjectParam.value }
        : {}),
    },
  })
}

function openGradingRow(row: Row) {
  if ('classes' in row) {
    goTo(eventParam.value, row.id)
    return
  }
  if ('packageId' in row) {
    openGradingSchedule(row)
    return
  }
  goTo(row.id)
}

const classColumns = computed(() =>
  buildGradingScheduleColumns({
    subjectName,
    canMakeup: (schedule) =>
      canManageMakeup(categoryOf(schedule.type), hasPermission),
    canParticipants: canReadMakeup(hasPermission),
    onMakeup: (schedule) => {
      makeupTarget.value = originOf(schedule)
    },
    onParticipants: (schedule) => {
      participantsTarget.value = schedule
    },
    onOpen: openGradingSchedule,
  }),
)

const periodColumns = computed<ColumnDef<GradingEventOption>[]>(() => [
  {
    id: 'name',
    header: 'Periode Ujian',
    meta: {
      mobile: 'title',
      mobileValue: (row: GradingEventOption) => row.name,
    },
    cell: ({ row }) => row.original.name,
  },
  {
    id: 'start',
    header: 'Tanggal Mulai',
    meta: {
      align: 'center',
      mobileValue: (row: GradingEventOption) => dateText(row.startsAt),
    },
    cell: ({ row }) => dateText(row.original.startsAt),
  },
  {
    id: 'end',
    header: 'Tanggal Selesai',
    meta: {
      align: 'center',
      mobileValue: (row: GradingEventOption) => dateText(row.endsAt),
    },
    cell: ({ row }) => dateText(row.original.endsAt),
  },
  {
    id: 'awaiting',
    header: 'Perlu Dinilai',
    meta: {
      align: 'center',
      mobileValue: (row: GradingEventOption) =>
        sumOf(byEvent.schedulesOf(row.id), 'awaitingGrading'),
    },
    cell: ({ row }) =>
      String(sumOf(byEvent.schedulesOf(row.original.id), 'awaitingGrading')),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        viewLabel: 'Buka',
        hideEdit: true,
        hideDelete: true,
        onView: () => goTo(row.original.id),
      }),
  },
])

const subjectColumns = computed<ColumnDef<SubjectNode>[]>(() => [
  {
    id: 'subject',
    header: 'Mata Pelajaran',
    meta: { mobile: 'title', mobileValue: (row: SubjectNode) => row.subject },
    cell: ({ row }) => row.original.subject,
  },
  {
    id: 'date',
    header: 'Tanggal',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectNode) => dateText(row.startsAt),
    },
    cell: ({ row }) => dateText(row.original.startsAt),
  },
  {
    id: 'time',
    header: 'Waktu',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectNode) =>
        `${clock(row.startsAt)} - ${clock(row.endsAt)}`,
    },
    cell: ({ row }) =>
      `${clock(row.original.startsAt)} - ${clock(row.original.endsAt)}`,
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
      mobileValue: (row: SubjectNode) => sumOf(row.classes, 'sessions'),
    },
    cell: ({ row }) => String(sumOf(row.original.classes, 'sessions')),
  },
  {
    id: 'awaiting',
    header: 'Perlu Dinilai',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectNode) => sumOf(row.classes, 'awaitingGrading'),
    },
    cell: ({ row }) => String(sumOf(row.original.classes, 'awaitingGrading')),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        viewLabel: 'Buka',
        hideEdit: true,
        hideDelete: true,
        onView: () => goTo(eventParam.value, row.original.id),
      }),
  },
])

const columns = computed(() => {
  if (level.value === 'period') return periodColumns.value
  if (level.value === 'subject') return subjectColumns.value
  return classColumns.value
})

watch([eventParam, subjectParam], () => (page.value = 1))

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex min-w-0 items-center gap-3">
          <BackButton
            v-if="level === 'subject' || level === 'class'"
            :label="backLabel"
            @click="goBack"
          />
          <CardTitle class="font-semibold">{{ pageTitle }}</CardTitle>
        </div>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <div
          v-if="listError"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-control">
            {{ listError }}
          </p>
          <Button
            variant="outline"
            @click="refresh()"
          >
            Coba lagi
          </Button>
        </div>
        <DataTable
          v-else
          mobile="cards"
          :columns="columns as ColumnDef<Row>[]"
          :data="pageRows"
          :page="page"
          :page-size="pageSize"
          :total-items="totalItems"
          :is-loading="loading"
          :item-label="itemLabel"
          @row-click="openGradingRow"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <AcademicPeriodFilter
              v-if="!isExam"
              v-model:semester-id="semesterId"
            />
          </template>
          <template #empty>
            <DataTableEmpty
              message="Belum ada ujian yang dikerjakan siswa kelas Anda."
            />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>

    <MakeupDialog
      v-if="makeupTarget"
      :open="true"
      :schedule="makeupTarget"
      @update:open="(value: boolean) => !value && (makeupTarget = null)"
      @created="refresh()"
    />

    <MakeupParticipantsDialog
      v-if="participantsTarget"
      :open="true"
      :schedule-id="participantsTarget.id"
      :type="participantsTarget.type"
      :title="`${subjectName(participantsTarget)} · ${participantsTarget.classroomName ?? '-'}`"
      @update:open="(value: boolean) => !value && (participantsTarget = null)"
    />
  </div>
</template>
