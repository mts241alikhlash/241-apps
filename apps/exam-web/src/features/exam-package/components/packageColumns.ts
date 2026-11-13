import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { CalendarClock, Copy, Send, SquarePen } from '@lucide/vue'
import type { ExamPackageStatus, ExamPackageSummary } from '../types'
import { packageStatusLabel, statusVariant } from '../types'

export interface PackageColumnOptions {
  subjectName: (id: string) => string
  gradeName: (id: string) => string
  canDelete: (pkg: ExamPackageSummary) => boolean
  canCopy: boolean
  canRename?: (pkg: ExamPackageSummary) => boolean
  canSubmit?: (pkg: ExamPackageSummary) => boolean
  canSchedule?: (pkg: ExamPackageSummary) => boolean
  onOpen: (pkg: ExamPackageSummary) => void
  onRename?: (pkg: ExamPackageSummary) => void
  onSubmit?: (pkg: ExamPackageSummary) => void
  onSchedule?: (pkg: ExamPackageSummary) => void
  onCopy: (pkg: ExamPackageSummary) => void | Promise<void>
  onDelete: (
    pkg: ExamPackageSummary,
    controls: { closeAlert: () => void; setLoading: (state: boolean) => void },
  ) => void | Promise<void>
}

const DELETABLE: ExamPackageStatus[] = ['DRAFT', 'RETURNED', 'APPROVED']
const COPYABLE: ExamPackageStatus[] = ['APPROVED', 'LOCKED']
const SCHEDULABLE: ExamPackageStatus[] = ['APPROVED', 'LOCKED']
const SUBMITTABLE: ExamPackageStatus[] = ['DRAFT', 'RETURNED']

const itemsLabel = (pkg: ExamPackageSummary) => `${pkg.itemCount} soal`

export function buildPackageColumns(
  options: PackageColumnOptions,
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
      id: 'status',
      header: 'Status',
      meta: {
        align: 'center',
        mobileLabel: 'Status',
        mobileValue: (row: ExamPackageSummary) =>
          packageStatusLabel(row.status),
      },
      cell: ({ row }) =>
        h(Badge, { variant: statusVariant(row.original.status) }, () =>
          packageStatusLabel(row.original.status),
        ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        h(ActionCell, {
          hideEdit: true,
          viewLabel: 'Lihat',
          hideDelete:
            !options.canDelete(row.original) ||
            !DELETABLE.includes(row.original.status),
          deleteTitle: 'Hapus paket?',
          deleteDescription:
            'Paket yang dihapus tidak muncul lagi. Paket yang menunggu tinjauan atau sudah dijadwalkan tidak bisa dihapus.',
          items: [
            ...(options.canSubmit?.(row.original) === true &&
            SUBMITTABLE.includes(row.original.status) &&
            row.original.itemCount > 0
              ? [
                  {
                    label: 'Ajukan',
                    icon: Send,
                    onClick: () => options.onSubmit?.(row.original),
                  },
                ]
              : []),
            ...(options.canRename?.(row.original) === true
              ? [
                  {
                    label: 'Ganti judul',
                    icon: SquarePen,
                    onClick: () => options.onRename?.(row.original),
                  },
                ]
              : []),
            ...(options.canSchedule?.(row.original) === true &&
            SCHEDULABLE.includes(row.original.status)
              ? [
                  {
                    label: 'Jadwalkan',
                    icon: CalendarClock,
                    onClick: () => options.onSchedule?.(row.original),
                  },
                ]
              : []),
            ...(options.canCopy && COPYABLE.includes(row.original.status)
              ? [
                  {
                    label: 'Salin',
                    icon: Copy,
                    onClick: () => {
                      void options.onCopy(row.original)
                    },
                  },
                ]
              : []),
          ],
          onView: () => options.onOpen(row.original),
          onDelete: (controls: {
            closeAlert: () => void
            setLoading: (state: boolean) => void
          }) => {
            void options.onDelete(row.original, controls)
          },
        }),
    },
  ]
}
