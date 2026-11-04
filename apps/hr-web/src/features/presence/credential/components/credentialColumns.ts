import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { Ban } from '@lucide/vue'
import type { Credential, CredentialStatus } from '../types'

const STATUS_LABEL: Record<CredentialStatus, string> = {
  ACTIVE: 'Aktif',
  REVOKED: 'Dicabut',
  REPLACED: 'Diganti',
}

function statusVariant(status: CredentialStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'default'
    case 'REVOKED':
      return 'destructive'
    case 'REPLACED':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function createCredentialColumns(
  onRevoke: (credential: Credential) => void,
): ColumnDef<Credential>[] {
  return [
    {
      id: 'holderName',
      header: 'Nama',
      meta: { align: 'left' },
      cell: ({ row }) =>
        h(
          'span',
          { class: 'font-medium' },
          row.original.holder.displayName ?? '-',
        ),
    },
    {
      id: 'identifier',
      header: 'Identitas',
      meta: { align: 'center' },
      cell: ({ row }) => row.original.holder.identifier,
    },
    {
      id: 'subjectType',
      header: 'Jenis',
      meta: { align: 'center' },
      cell: ({ row }) =>
        h(Badge, { variant: 'outline' }, () =>
          row.original.subjectType === 'STUDENT' ? 'Siswa' : 'Pegawai',
        ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { align: 'center' },
      cell: ({ row }) =>
        h(
          Badge,
          { variant: statusVariant(row.original.status) },
          () => STATUS_LABEL[row.original.status],
        ),
    },
    {
      id: 'actions',
      header: 'Opsi',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const item = row.original
        if (item.status !== 'ACTIVE') return null

        return h(
          Button,
          {
            size: 'sm',
            variant: 'outline',
            class: 'text-destructive',
            onClick: () => onRevoke(item),
          },
          () => [h(Ban, { class: 'size-4 mr-1.5' }), 'Cabut Kartu'],
        )
      },
    },
  ]
}
