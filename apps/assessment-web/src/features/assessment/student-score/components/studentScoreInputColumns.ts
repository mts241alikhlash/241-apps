import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { MessageSquarePlus, Pencil } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@mts241alikhlash/ui/tooltip'
import type { StudentScoreRosterItem } from '../types'

export interface StudentScoreTableRow extends StudentScoreRosterItem {
  id: string
  rowNumber: number
}

export interface StudentScoreInputColumnCallbacks {
  maxScore: number
  onScoreChange: (enrollmentId: string, value: string) => void
  onEditNote: (row: StudentScoreTableRow) => void
}

function formatGender(row: StudentScoreTableRow): string {
  if (row.gender === 'MALE') return 'L'
  if (row.gender === 'FEMALE') return 'P'
  return '-'
}

export function createStudentScoreInputColumns(
  callbacks: StudentScoreInputColumnCallbacks,
): ColumnDef<StudentScoreTableRow>[] {
  return [
    {
      id: 'no',
      header: 'No',
      enableSorting: false,
      meta: {
        align: 'center',
        mobileLabel: 'No',
        mobileValue: (row: StudentScoreTableRow) => String(row.rowNumber),
      },
      cell: ({ row }) => String(row.original.rowNumber),
    },
    {
      accessorKey: 'nis',
      header: 'NIS',
      meta: {
        align: 'center',
        mobileLabel: 'NIS',
        mobileValue: (row: StudentScoreTableRow) => row.nis || '-',
      },
      cell: ({ row }) =>
        h('span', { class: 'whitespace-nowrap' }, row.original.nis || '-'),
    },
    {
      accessorKey: 'nisn',
      header: 'NISN',
      meta: {
        align: 'center',
        mobileLabel: 'NISN',
        mobileValue: (row: StudentScoreTableRow) => row.nisn || '-',
      },
      cell: ({ row }) =>
        h('span', { class: 'whitespace-nowrap' }, row.original.nisn || '-'),
    },
    {
      accessorKey: 'studentName',
      header: 'Nama Siswa',
      meta: { align: 'left', strong: true, mobileLabel: 'Nama Siswa' },
      cell: ({ row }) =>
        h('span', { class: 'whitespace-nowrap' }, row.original.studentName),
    },
    {
      id: 'gender',
      header: 'L/P',
      meta: {
        align: 'center',
        mobileLabel: 'L/P',
        mobileValue: formatGender,
      },
      cell: ({ row }) => formatGender(row.original),
    },
    {
      id: 'score',
      header: 'Nilai',
      meta: { align: 'center', mobileLabel: 'Nilai' },
      cell: ({ row }) => {
        const item = row.original
        return h('div', { class: 'flex justify-center' }, [
          h(Input, {
            type: 'number',
            min: 0,
            max: callbacks.maxScore,
            modelValue: item.score ?? '',
            placeholder: `0 - ${callbacks.maxScore}`,
            class:
              'w-14 px-1.5 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            'onUpdate:modelValue': (val: string | number) =>
              callbacks.onScoreChange(item.enrollmentId, String(val)),
          }),
        ])
      },
    },
    {
      id: 'note',
      header: 'Catatan',
      meta: { align: 'left', truncate: true, mobileLabel: 'Catatan' },
      cell: ({ row }) => {
        const item = row.original
        const noteText = item.note?.trim() ?? ''

        if (!noteText) {
          return h(
            Button,
            {
              type: 'button',
              variant: 'ghost',
              size: 'sm',
              class: 'text-muted-foreground',
              onClick: () => callbacks.onEditNote(item),
            },
            () => [h(MessageSquarePlus), 'Tambah'],
          )
        }

        return h('div', { class: 'flex w-full min-w-0 items-center gap-1.5' }, [
          h(Tooltip, { delayDuration: 200 }, () => [
            h(TooltipTrigger, { asChild: true }, () =>
              h(
                'span',
                {
                  class:
                    'min-w-0 flex-1 cursor-default truncate text-left text-control',
                },
                noteText,
              ),
            ),
            h(
              TooltipContent,
              { class: 'max-w-sm whitespace-pre-wrap break-words' },
              () => noteText,
            ),
          ]),
          h(
            Button,
            {
              type: 'button',
              variant: 'ghost',
              size: 'icon-sm',
              class: 'shrink-0',
              'aria-label': 'Ubah catatan',
              onClick: () => callbacks.onEditNote(item),
            },
            () => h(Pencil),
          ),
        ])
      },
    },
  ]
}
