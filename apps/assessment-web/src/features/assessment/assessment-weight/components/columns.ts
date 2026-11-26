import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge, type BadgeVariants } from '@mts241alikhlash/ui/badge'
import type { AssessmentType } from '@/features/assessment/assessment-item'
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPE_ORDER,
  ASSESSMENT_WEIGHT_TOTAL,
} from '../types'

export interface AssessmentWeightRow {
  id: string
  classroomId: string
  subjectId: string
  classroomCode: string
  subjectName: string
  weights: Record<AssessmentType, number> | null
}

function weightStatus(row: AssessmentWeightRow): {
  label: string
  variant: BadgeVariants['variant']
} {
  if (!row.weights) {
    return { label: '-', variant: 'outline' }
  }
  const total = ASSESSMENT_TYPE_ORDER.reduce(
    (sum, type) => sum + (row.weights?.[type] ?? 0),
    0,
  )
  if (Math.round(total * 100) / 100 === ASSESSMENT_WEIGHT_TOTAL) {
    return { label: 'Lengkap', variant: 'success' }
  }
  if (total === 0) {
    return { label: 'Belum Diatur', variant: 'outline' }
  }
  return { label: 'Belum Lengkap', variant: 'warning' }
}

function formatWeight(row: AssessmentWeightRow, type: AssessmentType): string {
  if (!row.weights) return '-'
  return `${row.weights[type] ?? 0}%`
}

export function createAssessmentWeightColumns(options: {
  canUpdate: boolean
  onEdit: (row: AssessmentWeightRow) => void
}): ColumnDef<AssessmentWeightRow>[] {
  const weightColumns: ColumnDef<AssessmentWeightRow>[] =
    ASSESSMENT_TYPE_ORDER.map((type) => ({
      id: type,
      header: ASSESSMENT_TYPE_LABELS[type],
      meta: {
        align: 'center',
        mobileLabel: ASSESSMENT_TYPE_LABELS[type],
        mobileValue: (row: AssessmentWeightRow) => formatWeight(row, type),
      },
      cell: ({ row }) => formatWeight(row.original, type),
    }))

  return [
    {
      accessorKey: 'subjectName',
      header: 'Mata Pelajaran',
      meta: { align: 'left', strong: true, mobileLabel: 'Mata Pelajaran' },
      cell: ({ row }) => row.original.subjectName,
    },
    {
      accessorKey: 'classroomCode',
      header: 'Kelas',
      meta: {
        align: 'center',
        mobileLabel: 'Kelas',
        mobileValue: (row: AssessmentWeightRow) => row.classroomCode,
      },
      cell: ({ row }) => row.original.classroomCode,
    },
    ...weightColumns,
    {
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: AssessmentWeightRow) => weightStatus(row).label,
      },
      cell: ({ row }) => {
        const { label, variant } = weightStatus(row.original)
        return h(Badge, { variant }, () => label)
      },
    },
    ...(options.canUpdate
      ? [
          {
            id: 'actions',
            header: 'Aksi',
            enableSorting: false,
            meta: { align: 'center' as const },
            cell: ({ row }: { row: { original: AssessmentWeightRow } }) =>
              h(ActionCell, {
                editLabel: 'Atur',
                hideDelete: true,
                onEdit: () => options.onEdit(row.original),
              }),
          },
        ]
      : []),
  ]
}
