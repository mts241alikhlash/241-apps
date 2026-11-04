import { useRoleGuard } from '@/features/platform/auth'
import type { ReferenceDataConfig } from '@/reference-data'
import { categoryService } from '../services/taxonomyService'
import type {
  CategoryCreatePayload,
  CategoryUpdatePayload,
  PostCategory,
} from '../types'

export function useCategoryConfig(): ReferenceDataConfig<
  PostCategory,
  CategoryCreatePayload,
  CategoryUpdatePayload
> {
  const { can } = useRoleGuard()

  return {
    entityLabel: { singular: 'Kategori', plural: 'Kategori' },
    permissions: {
      canCreate: can('portal-categories.create'),
      canUpdate: can('portal-categories.update'),
      canDelete: can('portal-categories.delete'),
    },
    service: {
      list: () => categoryService.list(),
      create: (payload) => categoryService.create(payload),
      update: (id, payload) => categoryService.update(id, payload),
      remove: (id, callbacks) => categoryService.remove(id, callbacks),
    },
    fields: [
      {
        key: 'name',
        kind: 'text',
        label: 'Nama Kategori',
        required: true,
        maxLength: 100,
        placeholder: 'Misal: Prestasi',
      },
      {
        key: 'description',
        kind: 'text',
        label: 'Keterangan',
        maxLength: 200,
        placeholder: 'Opsional: untuk staf, tidak tampil di portal',
      },
      { key: 'isActive', kind: 'boolean', label: 'Status', default: true },
    ],
  }
}
