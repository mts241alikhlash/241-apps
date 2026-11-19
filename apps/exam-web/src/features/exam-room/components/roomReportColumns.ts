import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Badge } from '@mts241alikhlash/ui/badge'
import { ActionCell } from '@mts241alikhlash/ui'
import { Download, Printer, RefreshCw, Send } from '@lucide/vue'
import type { DayGroup, SubjectGroup } from '../composables/useReportHierarchy'
import { draftsOf } from '../composables/useReportSubmission'
import { reportStatusLabel, type RoomReportSummary } from '../types'

const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' })
const timeFormat = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const slotRange = (startsAt: string, endsAt: string): string =>
  `${timeFormat.format(new Date(startsAt))} - ${timeFormat.format(new Date(endsAt))}`

const FILE_UPLOADED = 'Berkas terunggah'

const num = (value: number) => h('span', String(value))

interface NodeActions<T> {
  onOpen: (row: T) => void
  onPrint?: (row: T) => void
  onSubmit?: (row: T) => void
  onDownload?: (row: T) => void
  onReplace?: (row: T) => void
  canReplace?: boolean
}

const subjectRooms = (row: SubjectGroup): RoomReportSummary[] => row.rooms

const dayRooms = (row: DayGroup): RoomReportSummary[] =>
  row.subjects.flatMap(subjectRooms)

const actionCell = <T>(
  row: T,
  options: NodeActions<T>,
  hasDraft: boolean,
  extra: { label: string; icon: typeof Send; onClick: () => void }[] = [],
) =>
  h(ActionCell, {
    manageLabel: 'Lihat',
    hideEdit: true,
    hideDelete: true,
    items: [
      ...(options.onPrint
        ? [
            {
              label: 'Cetak',
              icon: Printer,
              onClick: () => options.onPrint?.(row),
            },
          ]
        : []),
      ...(options.onSubmit
        ? [
            {
              label: 'Serahkan',
              icon: Send,
              disabled: !hasDraft,
              onClick: () => options.onSubmit?.(row),
            },
          ]
        : []),
      ...extra,
    ],
    onManage: () => options.onOpen(row),
  })

export function buildDayColumns(
  options: NodeActions<DayGroup>,
): ColumnDef<DayGroup>[] {
  return [
    {
      id: 'date',
      header: 'Tanggal',
      meta: {
        mobile: 'title',
        mobileValue: (row: DayGroup) =>
          dateFormat.format(new Date(row.startsAt)),
      },
      cell: ({ row }) => dateFormat.format(new Date(row.original.startsAt)),
    },
    {
      id: 'subjects',
      header: 'Mapel',
      meta: {
        align: 'center',
        mobileValue: (row: DayGroup) => row.subjectCount,
      },
      cell: ({ row }) => num(row.original.subjectCount),
    },
    {
      id: 'rooms',
      header: 'Ruangan',
      meta: {
        align: 'center',
        mobileValue: (row: DayGroup) => row.roomCount,
      },
      cell: ({ row }) => num(row.original.roomCount),
    },
    {
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileValue: (row: DayGroup) => row.summary,
      },
      cell: ({ row }) => row.original.summary,
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      meta: { align: 'center' },
      cell: ({ row }) =>
        actionCell(
          row.original,
          options,
          draftsOf(dayRooms(row.original)).length > 0,
        ),
    },
  ]
}

export function buildSubjectColumns(
  options: NodeActions<SubjectGroup>,
): ColumnDef<SubjectGroup>[] {
  return [
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
      id: 'time',
      header: 'Waktu',
      meta: {
        align: 'center',
        mobileValue: (row: SubjectGroup) => slotRange(row.startsAt, row.endsAt),
      },
      cell: ({ row }) =>
        h('span', slotRange(row.original.startsAt, row.original.endsAt)),
    },
    {
      id: 'rooms',
      header: 'Ruangan',
      meta: {
        align: 'center',
        mobileValue: (row: SubjectGroup) => row.roomCount,
      },
      cell: ({ row }) => num(row.original.roomCount),
    },
    {
      id: 'participants',
      header: 'Peserta',
      meta: {
        align: 'center',
        mobileValue: (row: SubjectGroup) => row.participantCount,
      },
      cell: ({ row }) => num(row.original.participantCount),
    },
    {
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileValue: (row: SubjectGroup) => row.summary,
      },
      cell: ({ row }) => row.original.summary,
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      meta: { align: 'center' },
      cell: ({ row }) =>
        actionCell(
          row.original,
          options,
          draftsOf(subjectRooms(row.original)).length > 0,
        ),
    },
  ]
}

const statusVariant = (status: string) =>
  status === 'VERIFIED'
    ? 'default'
    : status === 'SUBMITTED'
      ? 'secondary'
      : 'outline'

export function buildRoomReportColumns(
  options: NodeActions<RoomReportSummary>,
): ColumnDef<RoomReportSummary>[] {
  return [
    {
      id: 'room',
      header: 'Ruangan',
      meta: {
        align: 'center',
        mobileLabel: 'Ruangan',
        mobileValue: (row: RoomReportSummary) => row.roomName,
      },
      cell: ({ row }) => row.original.roomName,
    },
    {
      id: 'registered',
      header: 'Peserta',
      meta: {
        align: 'center',
        mobileLabel: 'Peserta',
        mobileValue: (row: RoomReportSummary) => String(row.registeredCount),
      },
      cell: ({ row }) => h('span', String(row.original.registeredCount)),
    },
    {
      id: 'supervisor',
      header: 'Pengawas',
      meta: {
        align: 'center',
        mobileLabel: 'Pengawas',
        mobileValue: (row: RoomReportSummary) => row.supervisorName,
      },
      cell: ({ row }) => row.original.supervisorName ?? '-',
    },
    {
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: RoomReportSummary) => reportStatusLabel(row.status),
      },
      cell: ({ row }) =>
        h(Badge, { variant: statusVariant(row.original.status) }, () =>
          reportStatusLabel(row.original.status),
        ),
    },
    {
      id: 'file',
      header: 'Berkas',
      meta: {
        align: 'center',
        mobileLabel: 'Berkas',
        mobileValue: (row: RoomReportSummary) =>
          row.hasAttachment ? FILE_UPLOADED : '-',
      },
      cell: ({ row }) =>
        row.original.hasAttachment
          ? h(Badge, { variant: 'secondary' }, () => FILE_UPLOADED)
          : '-',
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      meta: { align: 'center' },
      cell: ({ row }) =>
        actionCell(row.original, options, row.original.status === 'DRAFT', [
          ...(options.onDownload && row.original.hasAttachment
            ? [
                {
                  label: 'Unduh berkas',
                  icon: Download,
                  onClick: () => options.onDownload?.(row.original),
                },
              ]
            : []),
          ...(options.onReplace &&
          options.canReplace &&
          row.original.status === 'SUBMITTED'
            ? [
                {
                  label: 'Ganti berkas',
                  icon: RefreshCw,
                  onClick: () => options.onReplace?.(row.original),
                },
              ]
            : []),
        ]),
    },
  ]
}
