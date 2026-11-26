import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge, type BadgeVariants } from '@mts241alikhlash/ui/badge'
import { ASSESSMENT_TYPE_LABELS } from '../constants/category'
import type { AssessmentItem, AssessmentItemColumnActions } from '../types'

const TYPE_LABELS = ASSESSMENT_TYPE_LABELS

function filledText(item: AssessmentItem): string {
  if (item.studentCount === undefined) return '-'
  if (item.studentCount === 0) return '0/0'
  return `${item.gradedCount ?? 0}/${item.studentCount}`
}

function gradingStatus(item: AssessmentItem): {
  label: string
  variant: BadgeVariants['variant']
} {
  if (item.studentCount === undefined) {
    return { label: '-', variant: 'outline' }
  }
  if (item.studentCount === 0) {
    return { label: 'Belum Ada Siswa', variant: 'outline' }
  }
  const graded = item.gradedCount ?? 0
  if (graded >= item.studentCount) {
    return { label: 'Selesai', variant: 'success' }
  }
  if (graded > 0) {
    return { label: 'Belum Selesai', variant: 'warning' }
  }
  return { label: 'Belum Dinilai', variant: 'destructive' }
}

export const createAssessmentItemColumns = (
  actions: AssessmentItemColumnActions,
): ColumnDef<AssessmentItem>[] => {
  const nameLabel = actions.nameLabel ?? 'Nama Tugas'

  const typeColumns: ColumnDef<AssessmentItem>[] = actions.hideType
    ? []
    : [
        {
          id: 'type',
          header: 'Tipe',
          meta: {
            align: 'center',
            mobileLabel: 'Tipe',
            mobileValue: (row: AssessmentItem) => TYPE_LABELS[row.type],
          },
          cell: ({ row }) => TYPE_LABELS[row.original.type],
        },
      ]

  const nameColumn: ColumnDef<AssessmentItem> = {
    id: 'name',
    header: nameLabel,
    meta: { align: 'left', strong: true, mobileLabel: nameLabel },
    cell: ({ row }) => row.original.name,
  }

  const subjectColumns: ColumnDef<AssessmentItem>[] = actions.subjectName
    ? [
        {
          id: 'subject',
          header: 'Mata Pelajaran',
          meta: {
            align: 'left',
            mobileLabel: 'Mata Pelajaran',
            mobileValue: (row: AssessmentItem) =>
              actions.subjectName?.(row) ?? '-',
          },
          cell: ({ row }) => actions.subjectName?.(row.original) ?? '-',
        },
      ]
    : []

  const classroomColumns: ColumnDef<AssessmentItem>[] = actions.classroomName
    ? [
        {
          id: 'classroom',
          header: 'Kelas',
          meta: {
            align: 'center',
            mobileLabel: 'Kelas',
            mobileValue: (row: AssessmentItem) =>
              actions.classroomName?.(row) ?? '-',
          },
          cell: ({ row }) => actions.classroomName?.(row.original) ?? '-',
        },
      ]
    : []

  const detailColumns: ColumnDef<AssessmentItem>[] = [
    {
      id: 'weight',
      header: 'Bobot',
      meta: {
        align: 'center',
        mobileLabel: 'Bobot',
        mobileValue: (row: AssessmentItem) => `${row.weight}%`,
      },
      cell: ({ row }) => `${row.original.weight}%`,
    },
    {
      id: 'maxScore',
      header: 'Skor Maks',
      meta: {
        align: 'center',
        mobileLabel: 'Skor Maks',
        mobileValue: (row: AssessmentItem) => row.maxScore,
      },
      cell: ({ row }) => row.original.maxScore,
    },
  ]

  const statusColumns: ColumnDef<AssessmentItem>[] = actions.showStatus
    ? [
        {
          id: 'filled',
          header: 'Terisi',
          meta: {
            align: 'center',
            mobileLabel: 'Terisi',
            mobileValue: filledText,
          },
          cell: ({ row }) =>
            h('span', { class: 'tabular-nums' }, filledText(row.original)),
        },
        {
          id: 'status',
          header: 'Status',
          meta: {
            align: 'center',
            mobileLabel: 'Status',
            mobileValue: (row: AssessmentItem) => gradingStatus(row).label,
          },
          cell: ({ row }) => {
            const { label, variant } = gradingStatus(row.original)
            return h(Badge, { variant }, () => label)
          },
        },
      ]
    : []

  const actionColumn: ColumnDef<AssessmentItem> = {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) => {
      const item = row.original
      return h(ActionCell, {
        editLabel: 'Ubah',
        manageLabel: actions.onGrade ? 'Nilai' : undefined,
        hideEdit: actions.canUpdate === false,
        hideDelete: actions.canDelete === false,
        deleteTitle: 'Hapus Tugas?',
        deleteDescription:
          'Tugas ini beserta nilai siswa yang terkait akan dihapus secara permanen.',
        onEdit: () => {
          if (actions.onEdit) actions.onEdit(item)
        },
        onManage: () => {
          if (actions.onGrade) actions.onGrade(item)
        },
        onDelete: (callbacks: {
          closeAlert: () => void
          setLoading: (v: boolean) => void
        }) => {
          if (actions.onDelete) return actions.onDelete(item, callbacks)
        },
      })
    },
  }

  if (actions.typeFirst) {
    return [
      ...typeColumns,
      ...subjectColumns,
      ...classroomColumns,
      nameColumn,
      ...detailColumns,
      ...statusColumns,
      actionColumn,
    ]
  }

  return [
    nameColumn,
    ...typeColumns,
    ...subjectColumns,
    ...classroomColumns,
    ...detailColumns,
    ...statusColumns,
    actionColumn,
  ]
}
