import { useRoleGuard } from '@mts241alikhlash/platform/auth'
import type { ReferenceDataConfig } from '@mts241alikhlash/reference-data'
import { bloodTypeService } from '@mts241alikhlash/platform/blood-type'
import type {
  BloodType,
  BloodTypeCreatePayload,
  BloodTypeUpdatePayload,
} from '@mts241alikhlash/platform/blood-type'

export function useBloodTypeConfig(): ReferenceDataConfig<
  BloodType,
  BloodTypeCreatePayload,
  BloodTypeUpdatePayload
> {
  const { can } = useRoleGuard()

  return {
    entityLabel: { singular: 'Golongan Darah', plural: 'Golongan Darah' },
    permissions: {
      canCreate: can('blood-types.create'),
      canUpdate: can('blood-types.update'),
      canDelete: can('blood-types.delete'),
    },
    service: {
      list: () => bloodTypeService.getBloodTypes(),
      create: (payload) => bloodTypeService.createBloodType(payload),
      update: (id, payload) => bloodTypeService.updateBloodType(id, payload),
      remove: (id, callbacks) =>
        bloodTypeService.deleteBloodType(id, callbacks),
    },
    fields: [
      {
        key: 'name',
        kind: 'text',
        label: 'Golongan Darah',
        required: true,
        maxLength: 100,
        placeholder: 'Misal: A',
      },
      { key: 'isActive', kind: 'boolean', label: 'Status', default: true },
    ],
  }
}
