import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import { Badge } from '@mts241alikhlash/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Input } from '@mts241alikhlash/ui/input'
import type { AttendanceInputRow, AttendanceStatus } from '../types'
import {
  ATTENDANCE_STATUS_OPTIONS,
  toAttendanceStatus,
} from '../constants/attendance-status'

function gateTime(value: string) {
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function gateText(row: AttendanceInputRow): string {
  if (row.needsDecision) return 'Perlu Keputusan'
  if (row.fromGate) {
    return row.gateCheckInAt
      ? `Gerbang (${gateTime(row.gateCheckInAt)})`
      : 'Gerbang'
  }
  if (row.gateCheckInAt) return `Tap ${gateTime(row.gateCheckInAt)}`
  return '-'
}

export interface AttendanceInputColumnCallbacks {
  onStatusChange: (enrollmentId: string, status: AttendanceStatus) => void
  onNoteChange: (enrollmentId: string, note: string) => void
}

export function createAttendanceInputColumns(
  callbacks: AttendanceInputColumnCallbacks,
): ColumnDef<AttendanceInputRow>[] {
  return [
    {
      id: 'select',
      header: ({ table }) =>
        h(Checkbox, {
          modelValue:
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ? 'indeterminate' : false),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
            table.toggleAllPageRowsSelected(!!value),
          'aria-label': 'Pilih semua siswa',
          class: 'translate-y-[2px]',
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
            row.toggleSelected(!!value),
          'aria-label': 'Pilih baris siswa',
          class: 'translate-y-[2px]',
        }),
      enableSorting: false,
      enableHiding: false,
      meta: { align: 'left' },
    },
    {
      accessorKey: 'nis',
      header: 'NIS',
      meta: {
        align: 'center',
        mobileLabel: 'NIS',
        mobileValue: (row: AttendanceInputRow) => row.nis || '-',
      },
      cell: ({ row }) => row.original.nis || '-',
    },
    {
      accessorKey: 'studentName',
      header: 'Nama Siswa',
      meta: { align: 'left', strong: true, mobileLabel: 'Nama Siswa' },
      cell: ({ row }) => row.original.studentName,
    },
    {
      id: 'gateStatus',
      header: 'Keterangan',
      meta: {
        align: 'center',
        mobileLabel: 'Keterangan',
        mobileValue: gateText,
      },
      cell: ({ row }) => {
        const r = row.original
        if (r.needsDecision) {
          return h(Badge, { variant: 'warning' }, () => 'Perlu Keputusan')
        }

        if (r.fromGate) {
          return h(
            'div',
            { class: 'flex items-center justify-center gap-1.5' },
            [
              h(Badge, { variant: 'info' }, () => 'Gerbang'),
              r.gateCheckInAt
                ? h(
                    'span',
                    { class: 'text-muted-foreground tabular-nums' },
                    gateTime(r.gateCheckInAt),
                  )
                : null,
            ],
          )
        }

        if (r.gateCheckInAt) {
          return h(
            'span',
            { class: 'text-muted-foreground tabular-nums' },
            `Tap ${gateTime(r.gateCheckInAt)}`,
          )
        }

        return h('span', { class: 'text-muted-foreground' }, '-')
      },
    },
    {
      id: 'status',
      header: 'Status',
      meta: { align: 'center', mobileLabel: 'Status' },
      cell: ({ row }) => {
        const r = row.original
        return h('div', { class: 'flex justify-center' }, [
          h(
            Select,
            {
              modelValue: r.status,
              'onUpdate:modelValue': (val: unknown) => {
                const status = toAttendanceStatus(val)
                if (status) callbacks.onStatusChange(r.enrollmentId, status)
              },
            },
            () => [
              h(SelectTrigger, { class: 'w-32' }, () => [h(SelectValue)]),
              h(SelectContent, () =>
                ATTENDANCE_STATUS_OPTIONS.map((option) =>
                  h(
                    SelectItem,
                    {
                      key: option.value,
                      value: option.value,
                    },
                    () => option.label,
                  ),
                ),
              ),
            ],
          ),
        ])
      },
    },
    {
      id: 'note',
      header: 'Catatan',
      meta: { align: 'left', mobileLabel: 'Catatan' },
      cell: ({ row }) => {
        const r = row.original
        return h(Input, {
          modelValue: r.note,
          placeholder: 'Catatan...',
          class: 'min-w-36',
          'onUpdate:modelValue': (val: string | number) =>
            callbacks.onNoteChange(r.enrollmentId, String(val)),
        })
      },
    },
  ]
}
