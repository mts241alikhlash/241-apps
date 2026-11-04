import { useRoleGuard } from '@/features/platform/auth'
import type { ReferenceDataConfig } from '@/reference-data'
import { referenceListService } from './referenceListService'
import type {
  ReferenceList,
  ReferenceListItem,
  ReferenceListPayload,
} from './lists'

export function useReferenceListConfig(
  list: ReferenceList,
): ReferenceDataConfig<ReferenceListItem, ReferenceListPayload> {
  const { can } = useRoleGuard()

  return {
    entityLabel: { singular: list.singular, plural: list.singular },
    permissions: {
      canCreate: can(`${list.path}.create`),
      canUpdate: can(`${list.path}.update`),
      canDelete: can(`${list.path}.delete`),
    },
    service: {
      list: () => referenceListService.list(list),
      create: (payload) => referenceListService.create(list, payload),
      update: (id, payload) => referenceListService.update(list, id, payload),
      remove: (id, callbacks) =>
        referenceListService.remove(list, id, callbacks),
    },
    fields: [
      {
        key: 'name',
        kind: 'text',
        label: 'Nama',
        required: true,
        maxLength: 100,
      },
      { key: 'sortOrder', kind: 'number', label: 'Urutan', min: 0, default: 0 },
      { key: 'isActive', kind: 'boolean', label: 'Status', default: true },
    ],
  }
}
