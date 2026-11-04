import { h } from 'vue'
import type { CalendarEventData, CalendarColumnActions } from '../types'
import { ActionCell } from '@mts241alikhlash/ui'

export function createActionColumn(actions: CalendarColumnActions) {
  return {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }: { row: { original: CalendarEventData } }) => {
      const item = row.original
      return h(ActionCell, {
        deleteTitle: 'Hapus agenda kalender?',
        deleteDescription:
          'Tindakan ini tidak dapat dibatalkan. Agenda kalender ini akan dihapus secara permanen.',
        onEdit: () => actions.onEdit(item),
        onDelete: (payload: {
          closeAlert: () => void
          setLoading: (state: boolean) => void
        }) => actions.onDelete(item, payload),
      })
    },
  }
}
