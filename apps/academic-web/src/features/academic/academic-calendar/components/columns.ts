import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type { CalendarEventData, CalendarColumnActions } from '../types'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import { createActionColumn } from './calendarActionColumn'
import { useCalendarFormat } from '../composables/useCalendarFormat'

const { formatHourRange } = useCalendarFormat()

export const createCalendarColumns = (
  actions: CalendarColumnActions,
): ColumnDef<CalendarEventData>[] => [
  ...(actions.showActions !== false
    ? [
        {
          id: 'select',
          header: ({
            table,
          }: {
            table: {
              getIsAllPageRowsSelected: () => boolean
              getIsSomePageRowsSelected: () => boolean
              toggleAllPageRowsSelected: (v: boolean) => void
            }
          }) =>
            h(Checkbox, {
              modelValue:
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate'),
              'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
                table.toggleAllPageRowsSelected(value === true),
              ariaLabel: 'Select all',
            }),
          cell: ({
            row,
          }: {
            row: {
              getIsSelected: () => boolean
              toggleSelected: (v: boolean) => void
            }
          }) =>
            h(Checkbox, {
              modelValue: row.getIsSelected(),
              'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
                row.toggleSelected(value === true),
              ariaLabel: 'Select row',
            }),
          enableSorting: false,
          enableHiding: false,
        },
      ]
    : []),
  {
    id: 'title',
    accessorKey: 'title',
    header: 'Nama Agenda',
    cell: ({ row }) => h('div', { class: 'font-medium' }, row.original.title),
  },
  {
    id: 'type',
    accessorKey: 'type',
    header: 'Kategori',
    cell: ({ row }) => row.original.type?.name ?? '-',
  },
  {
    id: 'startDate',
    accessorKey: 'startDate',
    header: 'Tanggal Mulai',
    cell: ({ row }) => {
      const d = new Date(row.original.startDate)
      return h(
        'div',
        d.toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      )
    },
  },
  {
    id: 'endDate',
    accessorKey: 'endDate',
    header: 'Tanggal Selesai',
    cell: ({ row }) => {
      const d = new Date(row.original.endDate)
      return h(
        'div',
        d.toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      )
    },
  },
  {
    id: 'hours',
    header: 'Jam',
    cell: ({ row }) => {
      const range = formatHourRange(
        row.original.startTime,
        row.original.endTime,
      )
      return h(
        'div',
        range ? {} : { class: 'text-muted-foreground' },
        range ?? 'Sepanjang hari',
      )
    },
  },
  ...(actions.showActions !== false ? [createActionColumn(actions)] : []),
]
