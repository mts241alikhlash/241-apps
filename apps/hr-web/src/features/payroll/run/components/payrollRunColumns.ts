import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { Eye } from '@lucide/vue'
import { formatPeriod, formatRupiah } from '../../shared/money'
import { RUN_KIND_LABEL, RUN_STATUS_LABEL } from '../types'
import type { PayrollRun } from '../types'

export function createPayrollRunColumns(
  onViewDetail: (run: PayrollRun) => void,
): ColumnDef<PayrollRun>[] {
  return [
    {
      id: 'period',
      header: 'Periode',
      meta: { align: 'left' },
      cell: ({ row }) => {
        const run = row.original
        return h('div', { class: 'font-medium' }, [
          formatPeriod(run.year, run.month),
          run.sequence > 1
            ? h(
                'span',
                { class: 'text-muted-foreground ml-1.5 text-xs' },
                `#${run.sequence}`,
              )
            : null,
        ])
      },
    },
    {
      id: 'kind',
      header: 'Jenis',
      meta: { align: 'left' },
      cell: ({ row }) => RUN_KIND_LABEL[row.original.kind],
    },
    {
      id: 'employeeCount',
      header: 'Pegawai',
      meta: { align: 'center' },
      cell: ({ row }) => row.original.totals.employeeCount,
    },
    {
      id: 'netTotal',
      header: 'Total Bersih',
      meta: { align: 'right' },
      cell: ({ row }) =>
        h(
          'span',
          { class: 'font-medium' },
          formatRupiah(row.original.totals.net),
        ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const status = row.original.status
        const variant =
          status === 'APPROVED'
            ? 'default'
            : status === 'SUBMITTED'
              ? 'outline'
              : 'secondary'
        return h(Badge, { variant }, () => RUN_STATUS_LABEL[status])
      },
    },
    {
      id: 'actions',
      header: 'Opsi',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const run = row.original
        return h(
          Button,
          { size: 'sm', variant: 'outline', onClick: () => onViewDetail(run) },
          () => [h(Eye, { class: 'size-4 mr-1.5' }), 'Lihat Detail'],
        )
      },
    },
  ]
}
