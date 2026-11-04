import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Trash2 } from '@lucide/vue'
import type { NonWorkingDay } from '../types'

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return value
  }
}

export function createNonWorkingDayColumns(
  onDelete: (day: NonWorkingDay) => void,
): ColumnDef<NonWorkingDay>[] {
  return [
    {
      id: 'date',
      header: 'Tanggal',
      meta: { align: 'left' },
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      id: 'name',
      header: 'Keterangan',
      meta: { align: 'left' },
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'actions',
      header: 'Opsi',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const day = row.original
        return h(
          Button,
          {
            size: 'sm',
            variant: 'outline',
            class: 'text-destructive',
            onClick: () => onDelete(day),
          },
          () => [h(Trash2, { class: 'size-4 mr-1.5' }), 'Hapus'],
        )
      },
    },
  ]
}
