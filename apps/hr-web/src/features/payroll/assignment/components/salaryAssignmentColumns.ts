import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { Trash2 } from '@lucide/vue'
import { DRIVER_LABEL } from '../../component'
import { formatRupiah } from '../../shared/money'
import type { SalaryAssignment } from '../types'

function amountOf(assignment: SalaryAssignment) {
  return assignment.rate !== null
    ? `${formatRupiah(assignment.rate)} / satuan`
    : formatRupiah(assignment.amount)
}

export function createCurrentSalaryAssignmentColumns(
  onRemove: (assignment: SalaryAssignment) => void,
): ColumnDef<SalaryAssignment>[] {
  return [
    {
      id: 'component',
      header: 'Komponen',
      meta: { align: 'left' },
      cell: ({ row }) => {
        const item = row.original
        return h('div', {}, [
          h('span', { class: 'font-medium block' }, item.component.name),
          item.component.driver
            ? h(
                'span',
                { class: 'text-muted-foreground text-xs block' },
                `× ${DRIVER_LABEL[item.component.driver].toLowerCase()}`,
              )
            : null,
        ])
      },
    },
    {
      id: 'type',
      header: 'Jenis',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const isDeduction = row.original.component.type === 'DEDUCTION'
        return h(
          Badge,
          { variant: isDeduction ? 'destructive' : 'secondary' },
          () => (isDeduction ? 'Potongan' : 'Menambah'),
        )
      },
    },
    {
      id: 'amount',
      header: 'Nilai',
      meta: { align: 'right' },
      cell: ({ row }) =>
        h('span', { class: 'font-medium' }, amountOf(row.original)),
    },
    {
      id: 'effectiveFrom',
      header: 'Berlaku Mulai',
      meta: { align: 'center' },
      cell: ({ row }) => row.original.effectiveFrom.slice(0, 10),
    },
    {
      id: 'actions',
      header: 'Opsi',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const item = row.original
        return h(
          Button,
          {
            size: 'sm',
            variant: 'outline',
            class: 'text-destructive',
            onClick: () => onRemove(item),
          },
          () => [h(Trash2, { class: 'size-4 mr-1.5' }), 'Hapus Penetapan'],
        )
      },
    },
  ]
}

export function createSupersededSalaryAssignmentColumns(): ColumnDef<SalaryAssignment>[] {
  return [
    {
      id: 'component',
      header: 'Komponen',
      meta: { align: 'left' },
      cell: ({ row }) =>
        h(
          'span',
          { class: 'text-muted-foreground' },
          row.original.component.name,
        ),
    },
    {
      id: 'amount',
      header: 'Nilai',
      meta: { align: 'right' },
      cell: ({ row }) =>
        h(
          'span',
          { class: 'text-muted-foreground font-medium' },
          amountOf(row.original),
        ),
    },
    {
      id: 'effectivePeriod',
      header: 'Periode Berlaku',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const item = row.original
        return h(
          'span',
          { class: 'text-muted-foreground' },
          `${item.effectiveFrom.slice(0, 10)} – ${item.effectiveTo?.slice(0, 10) ?? ''}`,
        )
      },
    },
  ]
}
