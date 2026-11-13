import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Check, Undo2 } from '@lucide/vue'
import type { ExamPackageSummary } from '../types'

export interface ReviewColumnOptions {
  subjectName: (id: string) => string
  gradeName: (id: string) => string
  onOpen: (pkg: ExamPackageSummary) => void
  canApprove?: (pkg: ExamPackageSummary) => boolean
  onApprove?: (pkg: ExamPackageSummary) => void
  onReturn?: (pkg: ExamPackageSummary) => void
}

const itemsLabel = (pkg: ExamPackageSummary) => `${pkg.itemCount} soal`

const updatedLabel = (pkg: ExamPackageSummary) =>
  new Date(pkg.updatedAt).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

export function buildReviewColumns(
  options: ReviewColumnOptions,
): ColumnDef<ExamPackageSummary>[] {
  return [
    {
      id: 'title',
      header: 'Paket',
      meta: { align: 'left', strong: true },
      cell: ({ row }) => row.original.title,
    },
    {
      id: 'subject',
      header: 'Mapel',
      meta: {
        mobileLabel: 'Mapel',
        mobileValue: (row: ExamPackageSummary) =>
          options.subjectName(row.subjectId),
      },
      cell: ({ row }) => options.subjectName(row.original.subjectId),
    },
    {
      id: 'grade',
      header: 'Tingkat',
      meta: {
        align: 'center',
        mobileLabel: 'Tingkat',
        mobileValue: (row: ExamPackageSummary) =>
          options.gradeName(row.gradeId),
      },
      cell: ({ row }) => options.gradeName(row.original.gradeId),
    },
    {
      id: 'items',
      header: 'Jumlah Soal',
      meta: {
        align: 'center',
        mobileLabel: 'Jumlah Soal',
        mobileValue: (row: ExamPackageSummary) => itemsLabel(row),
      },
      cell: ({ row }) =>
        h('span', { class: 'tabular-nums' }, itemsLabel(row.original)),
    },
    {
      id: 'updated',
      header: 'Diajukan',
      meta: {
        mobileLabel: 'Diajukan',
        mobileValue: (row: ExamPackageSummary) => updatedLabel(row),
      },
      cell: ({ row }) =>
        h('span', { class: 'tabular-nums' }, updatedLabel(row.original)),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        h(ActionCell, {
          hideEdit: true,
          hideDelete: true,
          viewLabel: 'Tinjau',
          items: [
            ...(options.canApprove?.(row.original) === true
              ? [
                  {
                    label: 'Setujui',
                    icon: Check,
                    onClick: () => options.onApprove?.(row.original),
                  },
                  {
                    label: 'Kembalikan',
                    icon: Undo2,
                    destructive: true,
                    onClick: () => options.onReturn?.(row.original),
                  },
                ]
              : []),
          ],
          onView: () => options.onOpen(row.original),
        }),
    },
  ]
}
