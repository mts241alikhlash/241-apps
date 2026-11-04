import { useRoleGuard } from '@/features/platform/auth'
import type { ReferenceDataConfig } from '@/reference-data'
import { employmentTypeService } from './services/employmentTypeService'
import type {
  EmploymentType,
  EmploymentTypeCreatePayload,
  EmploymentTypeUpdatePayload,
} from './types'

export function useEmploymentTypeConfig(): ReferenceDataConfig<
  EmploymentType,
  EmploymentTypeCreatePayload,
  EmploymentTypeUpdatePayload
> {
  const { can } = useRoleGuard()

  return {
    entityLabel: {
      singular: 'Status Kepegawaian',
      plural: 'Status Kepegawaian',
    },
    permissions: {
      canCreate: can('employees.create'),
      canUpdate: can('employees.update'),
      canDelete: can('employees.delete'),
    },
    service: {
      list: () => employmentTypeService.getEmploymentTypes(),
      create: (payload) => employmentTypeService.createEmploymentType(payload),
      update: (id, payload) =>
        employmentTypeService.updateEmploymentType(id, payload),
      remove: (id, callbacks) =>
        employmentTypeService.deleteEmploymentType(id, callbacks),
    },
    fields: [
      {
        key: 'code',
        kind: 'text',
        label: 'Kode Status',
        required: true,
        maxLength: 20,
        placeholder: 'Misal: PNS, GTT, dll.',
        readOnlyOnEdit: true,
      },
      {
        key: 'name',
        kind: 'text',
        label: 'Status Kepegawaian',
        required: true,
        maxLength: 100,
        placeholder: 'Misal: Pegawai Negeri Sipil',
      },
    ],
  }
}
