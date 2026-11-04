import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ActionCell } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { ArrowDown, ArrowUp, KeyRound } from '@lucide/vue'
import { typeLabel } from '@/features/exam-bank/types'
import type { ExamPackageItemView } from '../types'
import { markerLabel, markerVariant } from '../types'

export interface BuilderColumnOptions {
  canEdit: boolean
  canAdjustKey: boolean
  onAdjustKey: (item: ExamPackageItemView) => void
  total: number
  noteOf: (questionId: string) => string | undefined
  onOpen: (item: ExamPackageItemView) => void
  onMove: (item: ExamPackageItemView, direction: 'up' | 'down') => void
  onRemove: (
    item: ExamPackageItemView,
    controls: { closeAlert: () => void; setLoading: (state: boolean) => void },
  ) => void | Promise<void>
}

export function buildBuilderColumns(
  options: BuilderColumnOptions,
): ColumnDef<ExamPackageItemView>[] {
  return [
    {
      id: 'position',
      header: 'No',
      meta: {
        align: 'center',
        mobileLabel: 'No',
        mobileValue: (row: ExamPackageItemView) => String(row.position),
      },
      cell: ({ row }) => row.original.position,
    },
    {
      id: 'summary',
      header: 'Soal',
      meta: { align: 'left', strong: true },
      cell: ({ row }) => {
        const note = options.noteOf(row.original.questionId)
        return h('div', { class: 'space-y-1' }, [
          h('div', row.original.summary || '-'),
          note
            ? h(
                'p',
                {
                  class:
                    'text-[length:var(--text-control,0.75rem)] font-normal text-destructive',
                },
                `Catatan: ${note}`,
              )
            : null,
        ])
      },
    },
    {
      id: 'type',
      header: 'Jenis',
      meta: {
        mobileLabel: 'Jenis',
        mobileValue: (row: ExamPackageItemView) => typeLabel(row.type),
      },
      cell: ({ row }) => typeLabel(row.original.type),
    },
    {
      id: 'marker',
      header: 'Asal',
      meta: {
        align: 'center',
        mobileLabel: 'Asal',
        mobileValue: (row: ExamPackageItemView) => markerLabel(row.marker),
      },
      cell: ({ row }) =>
        h(Badge, { variant: markerVariant(row.original.marker) }, () =>
          markerLabel(row.original.marker),
        ),
    },
    {
      id: 'points',
      header: 'Poin',
      meta: {
        align: 'center',
        mobileLabel: 'Poin',
        mobileValue: (row: ExamPackageItemView) => String(row.points),
      },
      cell: ({ row }) => String(row.original.points),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) =>
        h(ActionCell, {
          viewLabel: options.canEdit ? 'Ubah' : 'Lihat',
          hideEdit: true,
          hideDelete: !options.canEdit,
          deleteTitle: 'Hapus soal?',
          deleteDescription:
            'Soal ini dihapus dari paket dan tidak bisa dikembalikan.',
          items: [
            ...(options.canEdit
              ? [
                  {
                    label: 'Naik',
                    icon: ArrowUp,
                    disabled: row.original.position <= 1,
                    onClick: () => options.onMove(row.original, 'up'),
                  },
                  {
                    label: 'Turun',
                    icon: ArrowDown,
                    disabled: row.original.position >= options.total,
                    onClick: () => options.onMove(row.original, 'down'),
                  },
                ]
              : []),
            ...(options.canAdjustKey
              ? [
                  {
                    label: 'Ralat kunci',
                    icon: KeyRound,
                    onClick: () => options.onAdjustKey(row.original),
                  },
                ]
              : []),
          ],
          onView: () => options.onOpen(row.original),
          onDelete: (controls: {
            closeAlert: () => void
            setLoading: (state: boolean) => void
          }) => {
            void options.onRemove(row.original, controls)
          },
        }),
    },
  ]
}
