<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import {
  ActionCell,
  BackButton,
  DataTable,
  DataTableEmpty,
} from '@mts241alikhlash/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@mts241alikhlash/ui/card'
import { Plus, Printer } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { examEventService } from '@/features/exam-event/services/examEventService'
import type { ExamEvent } from '@/features/exam-event/types'
import { examTypeLabel } from '../types'
import {
  buildScheduleColumns,
  scheduleHasActions,
  type ScheduleColumnOptions,
} from '../components/scheduleColumns'
import MakeupDialog from '../components/MakeupDialog.vue'
import MakeupParticipantsDialog from '../components/MakeupParticipantsDialog.vue'
import AccessCodeDialog from '../components/AccessCodeDialog.vue'
import ScheduleFormDialog from '../components/ScheduleFormDialog.vue'
import { usePackageSubjects } from '@/features/exam-shared/usePackageSubjects'
import { examActivityApi } from '@/features/exam-activity/api/examActivityApi'
import {
  buildTimetable,
  timetableHtml,
} from '@/features/exam-activity/utils/buildTimetable'
import { useScheduleList } from '../composables/useScheduleList'
import { examScheduleService } from '../services/examScheduleService'
import {
  NO_PERIOD,
  dayKeyOf,
  groupDays,
  groupPeriods,
  periodKeyOf,
  type DayGroup,
  type PeriodGroup,
} from '../utils/groupSchedules'
import type { ExamSchedule } from '../types'

const router = useRouter()
const { hasPermission } = useAuthSession()

const { category, sectionPrefix } = useRouteCategory()

const route = useRoute()
const { subjectOf } = usePackageSubjects()
const subjectName = (schedule: ExamSchedule) =>
  subjectOf(schedule.packageId, schedule.packageTitle)

const status = ref('ALL')
const page = ref(1)
const pageSize = ref(1000)

const { schedules, loading, listError, filtersPending, refresh } =
  useScheduleList({ status, category }, page, pageSize)

const periodNames = ref(new Map<string, string>())
const periodEvents = ref(new Map<string, ExamEvent>())

const queryValue = (name: string): string | null => {
  const raw = route.query[name]
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value !== '' ? value : null
}

const periodId = computed(() => queryValue('periode'))
const dayId = computed(() => queryValue('hari'))

const hasPeriods = computed(() =>
  schedules.value.some((item) => item.eventId !== null),
)

const level = computed<'period' | 'day' | 'schedule'>(() => {
  if (hasPeriods.value && periodId.value === null) return 'period'
  if (dayId.value === null) return 'day'
  return 'schedule'
})

const inPeriod = computed(() =>
  hasPeriods.value && periodId.value !== null
    ? schedules.value.filter((item) => periodKeyOf(item) === periodId.value)
    : schedules.value,
)

const periodName = (id: string): string =>
  id === NO_PERIOD
    ? 'Tanpa periode'
    : (periodNames.value.get(id) ?? 'Periode ujian')

const dateText = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  dateStyle: 'long',
})

const levelTitle = computed(() => {
  if (level.value === 'period') return 'Jadwal Ujian'
  if (level.value === 'day') {
    return periodId.value !== null ? periodName(periodId.value) : 'Jadwal Ujian'
  }
  const day = inPeriod.value.find(
    (item) => dayKeyOf(item.startsAt) === dayId.value,
  )
  return day ? dateText.format(new Date(day.startsAt)) : 'Jadwal Ujian'
})

const itemLabel = computed(() =>
  level.value === 'period'
    ? 'periode'
    : level.value === 'day'
      ? 'hari'
      : 'jadwal',
)

function go(periode: string | null, hari: string | null = null) {
  const query: Record<string, string> = {}
  if (periode !== null) query.periode = periode
  if (periode !== null && hari !== null) query.hari = hari
  if (periode === null && hari !== null) query.hari = hari
  void router.push({ path: route.path, query })
}

function goBack() {
  if (level.value === 'schedule') {
    go(hasPeriods.value ? periodId.value : null)
  } else if (level.value === 'day' && hasPeriods.value) go(null)
}

const backLabel = computed(() =>
  level.value === 'schedule'
    ? 'Kembali ke daftar hari'
    : 'Kembali ke semua periode',
)

useBreadcrumbs(() => [
  { title: 'Ujian', href: '#' },
  { title: 'Jadwal Ujian', href: route.path },
  ...(levelTitle.value !== 'Jadwal Ujian' ? [{ title: levelTitle.value }] : []),
])

onMounted(async () => {
  if (category.value !== 'EXAM') {
    periodNames.value = new Map()
    periodEvents.value = new Map()
    return
  }
  const result = await examEventService.loadEvents({ limit: 1000 })
  if (result.success) {
    periodNames.value = new Map(
      result.data.map((event) => [event.id, event.name]),
    )
    periodEvents.value = new Map(result.data.map((event) => [event.id, event]))
  }
})

const formOpen = ref(false)
const editing = ref<ExamSchedule | null>(null)
const cancelTarget = ref<ExamSchedule | null>(null)
const accessTarget = ref<ExamSchedule | null>(null)
const makeupTarget = ref<ExamSchedule | null>(null)
const participantsTarget = ref<ExamSchedule | null>(null)
const cancelling = ref(false)

function openCreate() {
  void router.push(`${sectionPrefix.value}/activities/new`)
}

function openEdit(schedule: ExamSchedule) {
  editing.value = schedule
  formOpen.value = true
}

async function confirmCancel() {
  const target = cancelTarget.value
  if (!target) return
  cancelling.value = true
  const done = await examScheduleService.cancelSchedule(target.id)
  cancelling.value = false
  if (done) {
    cancelTarget.value = null
    await refresh()
  }
}

async function printTimetable() {
  const popup = window.open('', '_blank')
  if (popup === null) return
  try {
    const activities = await examActivityApi.list(
      category.value ? { category: category.value } : undefined,
    )
    popup.document.write(
      timetableHtml(buildTimetable(activities), 'Jadwal Ujian'),
    )
    popup.document.close()
    popup.focus()
    popup.print()
  } catch {
    popup.close()
    toast.error('Jadwal mapel tidak dapat dimuat.')
  }
}

const isClasswork = computed(() => category.value === 'NON_EXAM')
const canWriteExam = computed(
  () =>
    hasPermission('exam-schedules.manage-all') ||
    hasPermission('exam-events.manage'),
)
const canWriteInCategory = computed(
  () => isClasswork.value || canWriteExam.value,
)

const scheduleOptions = computed<ScheduleColumnOptions>(() => ({
  subjectName,
  canUpdate: canWriteInCategory.value && hasPermission('exam-schedules.update'),
  canCancel: canWriteInCategory.value && hasPermission('exam-schedules.cancel'),
  canAccessCode:
    isClasswork.value && hasPermission('exam-schedules.access-code'),
  canSessions: isClasswork.value && hasPermission('exam-sessions.read'),
  canMakeup: isClasswork.value && hasPermission('exam-grading.grade'),
  canParticipants: isClasswork.value && hasPermission('exam-grading.read'),
  now: () => new Date(),
  onEdit: openEdit,
  onCancel: (schedule) => {
    cancelTarget.value = schedule
  },
  onAccessCode: (schedule) => {
    accessTarget.value = schedule
  },
  onSessions: (schedule) => {
    void router.push({
      path: `${sectionPrefix.value}/schedules/${schedule.id}/sessions`,
      query: {
        judul: `${subjectName(schedule)} · ${schedule.classroomName ?? '-'}`,
        ...(schedule.classroomName ? { kelas: schedule.classroomName } : {}),
      },
    })
  },
  onMakeup: (schedule) => {
    makeupTarget.value = schedule
  },
  onParticipants: (schedule) => {
    participantsTarget.value = schedule
  },
}))

const scheduleColumns = computed(() =>
  buildScheduleColumns(scheduleOptions.value),
)

const manageCell = (open: () => void) =>
  h(ActionCell, {
    manageLabel: 'Lihat',
    hideEdit: true,
    hideDelete: true,
    onManage: open,
  })

const clock = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))

const fullDate = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
  }).format(new Date(iso))

const eventOf = (id: string): ExamEvent | undefined =>
  periodEvents.value.get(id)

const periodColumns: ColumnDef<PeriodGroup>[] = [
  {
    id: 'type',
    header: 'Jenis',
    meta: {
      align: 'center',
      mobileLabel: 'Jenis',
      mobileValue: (row: PeriodGroup) => {
        const event = eventOf(row.id)
        return event ? examTypeLabel(event.type) : '-'
      },
    },
    cell: ({ row }) => {
      const event = eventOf(row.original.id)
      return event ? examTypeLabel(event.type) : '-'
    },
  },
  {
    id: 'name',
    header: 'Periode Ujian',
    meta: {
      align: 'left',
      strong: true,
      mobile: 'title',
      mobileValue: (row: PeriodGroup) => periodName(row.id),
    },
    cell: ({ row }) => periodName(row.original.id),
  },
  {
    id: 'days',
    header: 'Jumlah Hari',
    meta: {
      align: 'center',
      mobileLabel: 'Jumlah Hari',
      mobileValue: (row: PeriodGroup) => row.dayCount,
    },
    cell: ({ row }) => String(row.original.dayCount),
  },
  {
    id: 'count',
    header: 'Jumlah Jadwal',
    meta: {
      align: 'center',
      mobileLabel: 'Jumlah Jadwal',
      mobileValue: (row: PeriodGroup) => row.scheduleCount,
    },
    cell: ({ row }) => String(row.original.scheduleCount),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) => manageCell(() => go(row.original.id)),
  },
]

const subjectCountOf = (day: DayGroup): number =>
  new Set(day.schedules.map((item) => subjectName(item))).size

const dayColumns: ColumnDef<DayGroup>[] = [
  {
    id: 'date',
    header: 'Hari, Tanggal',
    meta: {
      mobile: 'title',
      mobileValue: (row: DayGroup) => fullDate(row.startsAt),
    },
    cell: ({ row }) => fullDate(row.original.startsAt),
  },
  {
    id: 'start',
    header: 'Jam Mulai',
    meta: {
      align: 'center',
      mobileLabel: 'Jam Mulai',
      mobileValue: (row: DayGroup) => clock(row.startsAt),
    },
    cell: ({ row }) => clock(row.original.startsAt),
  },
  {
    id: 'end',
    header: 'Jam Selesai',
    meta: {
      align: 'center',
      mobileLabel: 'Jam Selesai',
      mobileValue: (row: DayGroup) => clock(row.endsAt),
    },
    cell: ({ row }) => clock(row.original.endsAt),
  },
  {
    id: 'subjects',
    header: 'Jumlah Mata Pelajaran',
    meta: {
      align: 'center',
      mobileLabel: 'Jumlah Mata Pelajaran',
      mobileValue: (row: DayGroup) => subjectCountOf(row),
    },
    cell: ({ row }) => String(subjectCountOf(row.original)),
  },
  {
    id: 'count',
    header: 'Jumlah Jadwal',
    meta: {
      align: 'center',
      mobileLabel: 'Jumlah Jadwal',
      mobileValue: (row: DayGroup) => row.scheduleCount,
    },
    cell: ({ row }) => String(row.original.scheduleCount),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      manageCell(() =>
        go(hasPeriods.value ? periodId.value : null, row.original.id),
      ),
  },
]

const gradeNumber = (name: string | null): number =>
  Number(/(\d+)/.exec(name ?? '')?.[1] ?? Number.MAX_SAFE_INTEGER)

const byClassroom = (left: ExamSchedule, right: ExamSchedule): number =>
  gradeNumber(left.classroomName) - gradeNumber(right.classroomName) ||
  (left.classroomName ?? '').localeCompare(right.classroomName ?? '', 'id', {
    numeric: true,
  }) ||
  left.startsAt.localeCompare(right.startsAt) ||
  left.packageTitle.localeCompare(right.packageTitle, 'id')

const rows = computed<(PeriodGroup | DayGroup | ExamSchedule)[]>(() => {
  if (level.value === 'period') return groupPeriods(schedules.value)
  if (level.value === 'day') return groupDays(inPeriod.value)
  return inPeriod.value
    .filter((item) => dayKeyOf(item.startsAt) === dayId.value)
    .sort(byClassroom)
})

const columns = computed(
  () =>
    (level.value === 'period'
      ? periodColumns
      : level.value === 'day'
        ? dayColumns
        : scheduleColumns.value.filter(
            (column) =>
              column.id !== 'date' &&
              (column.id !== 'actions' ||
                (rows.value as ExamSchedule[]).some((item) =>
                  scheduleHasActions(item, scheduleOptions.value),
                )),
          )) as unknown as ColumnDef<PeriodGroup | DayGroup | ExamSchedule>[],
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BackButton
            v-if="level !== 'period' && (level === 'schedule' || hasPeriods)"
            :label="backLabel"
            @click="goBack"
          />
          <CardTitle class="font-semibold">{{ levelTitle }}</CardTitle>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Button
            v-if="
              hasPermission('exam-schedules.read') ||
              hasPermission('exam-schedules.manage')
            "
            variant="outline"
            @click="printTimetable"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
          <Button
            v-if="hasPermission('exam-schedules.manage') && canWriteInCategory"
            @click="openCreate"
          >
            <Plus class="size-4" />
            Tambah
          </Button>
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
          :columns="columns"
          :data="filtersPending ? [] : rows"
          hide-pagination
          :is-loading="loading || filtersPending"
          :item-label="itemLabel"
        >
          <template #empty>
            <DataTableEmpty message="Belum ada jadwal ujian." />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>

    <ScheduleFormDialog
      v-if="formOpen"
      v-model:open="formOpen"
      :schedule="editing"
      :category="category"
      :event-id="
        hasPeriods && periodId !== null && periodId !== NO_PERIOD
          ? periodId
          : undefined
      "
      :date="level === 'schedule' ? (dayId ?? undefined) : undefined"
      @saved="refresh()"
    />

    <AccessCodeDialog
      v-if="accessTarget"
      :open="true"
      :schedule-id="accessTarget.id"
      :title="`${subjectName(accessTarget)} · ${accessTarget.classroomName ?? '-'}`"
      @update:open="(value: boolean) => !value && (accessTarget = null)"
    />

    <MakeupDialog
      v-if="makeupTarget"
      :open="true"
      :schedule="{ ...makeupTarget, packageTitle: subjectName(makeupTarget) }"
      @update:open="(value: boolean) => !value && (makeupTarget = null)"
      @created="refresh()"
    />

    <MakeupParticipantsDialog
      v-if="participantsTarget"
      :open="true"
      :schedule-id="participantsTarget.id"
      :title="`${subjectName(participantsTarget)} · ${participantsTarget.classroomName ?? '-'}`"
      @update:open="(value: boolean) => !value && (participantsTarget = null)"
    />

    <AlertDialog
      :open="cancelTarget !== null"
      @update:open="(value: boolean) => !value && (cancelTarget = null)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan jadwal?</AlertDialogTitle>
          <AlertDialogDescription>
            Jadwal {{ cancelTarget ? subjectName(cancelTarget) : '' }} untuk
            {{ cancelTarget?.classroomName ?? 'kelas ini' }} dibatalkan dan
            tokennya tidak berlaku lagi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Kembali</AlertDialogCancel>
          <AlertDialogAction
            :disabled="cancelling"
            @click="confirmCancel"
          >
            Ya, batalkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
