<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell, DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { toast } from 'vue-sonner'
import {
  groupReports,
  type DayGroup,
  type SubjectGroup,
} from '@/features/exam-room/composables/useReportHierarchy'
import { examRoomService } from '@/features/exam-room/services/examRoomService'
import type { RoomReportSummary } from '@/features/exam-room/types'
import { examEventService } from '../services/examEventService'
import SupervisorAddDialog from './SupervisorAddDialog.vue'
import SupervisorSubstituteDialog from './SupervisorSubstituteDialog.vue'
import type { UserOption } from '../types'

const props = defineProps<{
  eventId: string
  dayId: string | null
  subjectId: string | null
  canSubstitute: boolean
}>()

const emit = defineEmits<{
  navigate: [day: string | null, subject: string | null]
  levelChange: [title: string | null]
}>()

const reports = ref<RoomReportSummary[]>([])
const teachers = ref<UserOption[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const generating = ref(false)

const target = ref<RoomReportSummary | null>(null)
const substituteOpen = ref(false)
const addOpen = ref(false)

const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' })
const timeFormat = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const clock = (iso: string): string => timeFormat.format(new Date(iso))

const days = computed(() => groupReports(reports.value))
const activeDay = computed(
  () => days.value.find((day) => day.id === props.dayId) ?? null,
)
const activeSubject = computed(
  () =>
    activeDay.value?.subjects.find((item) => item.id === props.subjectId) ??
    null,
)

type Row = DayGroup | SubjectGroup | RoomReportSummary

const levelRows = computed<Row[]>(() => {
  if (activeSubject.value) return activeSubject.value.rooms
  if (activeDay.value) return activeDay.value.subjects
  return days.value
})

const itemLabel = computed(() =>
  activeSubject.value ? 'ruangan' : activeDay.value ? 'mapel' : 'hari',
)

const levelTitle = computed(() => {
  if (activeSubject.value) return activeSubject.value.subjectName
  if (activeDay.value)
    return dateFormat.format(new Date(activeDay.value.startsAt))
  return null
})

watch(levelTitle, (value) => emit('levelChange', value), { immediate: true })

const slotKey = (row: RoomReportSummary) => `${row.roomId}-${row.slotId}`

function fillText(rows: RoomReportSummary[]): string {
  const slots = new Map(rows.map((row) => [slotKey(row), row]))
  const filled = [...slots.values()].filter(
    (row) => row.supervisorName !== null,
  ).length
  return `${filled}/${slots.size}`
}

const dayRooms = (day: DayGroup): RoomReportSummary[] =>
  day.subjects.flatMap((subject) => subject.rooms)

const manageCell = (open: () => void) =>
  h(ActionCell, {
    manageLabel: 'Lihat',
    hideEdit: true,
    hideDelete: true,
    onManage: open,
  })

const dayColumns: ColumnDef<DayGroup>[] = [
  {
    id: 'date',
    header: 'Tanggal',
    meta: {
      mobile: 'title',
      mobileValue: (row: DayGroup) => dateFormat.format(new Date(row.startsAt)),
    },
    cell: ({ row }) => dateFormat.format(new Date(row.original.startsAt)),
  },
  {
    id: 'subjects',
    header: 'Jumlah Mapel',
    meta: {
      align: 'center',
      mobileValue: (row: DayGroup) => row.subjectCount,
    },
    cell: ({ row }) => String(row.original.subjectCount),
  },
  {
    id: 'rooms',
    header: 'Jumlah Ruang',
    meta: {
      align: 'center',
      mobileValue: (row: DayGroup) => row.roomCount,
    },
    cell: ({ row }) => String(row.original.roomCount),
  },
  {
    id: 'filled',
    header: 'Pengawas',
    meta: {
      align: 'center',
      mobileValue: (row: DayGroup) => fillText(dayRooms(row)),
    },
    cell: ({ row }) => fillText(dayRooms(row.original)),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      manageCell(() => emit('navigate', row.original.id, null)),
  },
]

const subjectColumns: ColumnDef<SubjectGroup>[] = [
  {
    id: 'subject',
    header: 'Mata Pelajaran',
    meta: {
      mobile: 'title',
      mobileValue: (row: SubjectGroup) => row.subjectName,
    },
    cell: ({ row }) => row.original.subjectName,
  },
  {
    id: 'start',
    header: 'Jam Mulai',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectGroup) => clock(row.startsAt),
    },
    cell: ({ row }) => clock(row.original.startsAt),
  },
  {
    id: 'end',
    header: 'Jam Selesai',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectGroup) => clock(row.endsAt),
    },
    cell: ({ row }) => clock(row.original.endsAt),
  },
  {
    id: 'rooms',
    header: 'Jumlah Ruang',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectGroup) => row.roomCount,
    },
    cell: ({ row }) => String(row.original.roomCount),
  },
  {
    id: 'filled',
    header: 'Pengawas',
    meta: {
      align: 'center',
      mobileValue: (row: SubjectGroup) => fillText(row.rooms),
    },
    cell: ({ row }) => fillText(row.original.rooms),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      manageCell(() => emit('navigate', row.original.dayKey, row.original.id)),
  },
]

const roomColumns = computed<ColumnDef<RoomReportSummary>[]>(() => [
  {
    id: 'room',
    header: 'Ruangan',
    meta: {
      align: 'center',
      mobile: 'title',
      mobileValue: (row: RoomReportSummary) => row.roomName,
    },
    cell: ({ row }) => row.original.roomName,
  },
  {
    id: 'start',
    header: 'Jam Mulai',
    meta: {
      align: 'center',
      mobileValue: (row: RoomReportSummary) => clock(row.startsAt),
    },
    cell: ({ row }) => clock(row.original.startsAt),
  },
  {
    id: 'end',
    header: 'Jam Selesai',
    meta: {
      align: 'center',
      mobileValue: (row: RoomReportSummary) => clock(row.endsAt),
    },
    cell: ({ row }) => clock(row.original.endsAt),
  },
  {
    id: 'supervisor',
    header: 'Pengawas',
    meta: {
      mobileValue: (row: RoomReportSummary) =>
        row.supervisorName ?? 'Belum ditentukan',
    },
    cell: ({ row }) =>
      row.original.supervisorName ??
      h(Badge, { variant: 'warning' }, () => 'Belum ditentukan'),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      props.canSubstitute
        ? h(ActionCell, {
            editLabel: 'Ubah',
            hideDelete: true,
            onEdit: () => openSubstitute(row.original),
          })
        : null,
  },
])

const columns = computed(
  () =>
    (activeSubject.value
      ? roomColumns.value
      : activeDay.value
        ? subjectColumns
        : dayColumns) as unknown as ColumnDef<Row>[],
)

async function load() {
  if (props.eventId === '') {
    reports.value = []
    return
  }
  loading.value = true
  const result = await examRoomService.loadReports(props.eventId)
  loading.value = false
  if (result.success) {
    reports.value = result.data
    error.value = null
  } else {
    reports.value = []
    error.value = result.error
  }
}

async function generateSlots() {
  if (generating.value || props.eventId === '') return
  generating.value = true
  const result = await examEventService.generateSupervisorSlots(props.eventId)
  generating.value = false
  if (result.success) {
    toast.success(
      `${result.data.created} slot dibuat, ${result.data.skipped} dilewati karena sudah ada`,
    )
    await load()
  } else {
    toast.error(result.error)
  }
}

function openSubstitute(row: RoomReportSummary) {
  target.value = row
  substituteOpen.value = true
}

const groupRooms = computed(() => {
  const seen = new Map<string, string>()
  for (const row of activeSubject.value?.rooms ?? []) {
    seen.set(row.roomId, row.roomName)
  }
  return [...seen].map(([id, name]) => ({ id, name }))
})

function openAdd() {
  addOpen.value = true
}

const scheduleText = computed(() => {
  const subject = activeSubject.value
  const day = activeDay.value
  if (subject === null || day === null) return ''
  return `${dateFormat.format(new Date(day.startsAt))} · ${clock(subject.startsAt)} - ${clock(subject.endsAt)} · ${subject.subjectName}`
})

defineExpose({ generateSlots, openAdd, generating })

watch(() => props.eventId, load)

onMounted(async () => {
  teachers.value = await examEventService.loadStaff('EXAM_SUPERVISOR')
  await load()
})
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="error"
      class="space-y-3 rounded-md border p-3 text-control"
      role="alert"
    >
      <p>{{ error }}</p>
      <Button
        variant="outline"
        @click="load()"
      >
        Coba lagi
      </Button>
    </div>

    <DataTable
      v-else
      mobile="cards"
      hide-pagination
      :columns="columns"
      :data="levelRows"
      :is-loading="loading"
      :item-label="itemLabel"
    >
      <template #empty>
        <DataTableEmpty
          :message="
            canSubstitute && !activeDay
              ? 'Belum ada slot pengawas. Buat slot ruangan dulu.'
              : 'Belum ada jadwal pengawas.'
          "
        />
      </template>
    </DataTable>

    <SupervisorSubstituteDialog
      v-model:open="substituteOpen"
      :target="target"
      :people="teachers"
      @saved="load()"
    />

    <SupervisorAddDialog
      v-model:open="addOpen"
      :rooms="groupRooms"
      :people="teachers"
      :starts-at="activeSubject?.startsAt ?? ''"
      :ends-at="activeSubject?.endsAt ?? ''"
      :schedule="scheduleText"
      @saved="load()"
    />
  </div>
</template>
