import { useRoleGuard } from '@/features/platform/auth'
import type { ReferenceDataConfig } from '@/reference-data'
import { tagService } from '../services/taxonomyService'
import type { PostTag, TagCreatePayload, TagUpdatePayload } from '../types'

export function useTagConfig(): ReferenceDataConfig<
  PostTag,
  TagCreatePayload,
  TagUpdatePayload
> {
  const { can } = useRoleGuard()

  return {
    entityLabel: { singular: 'Tag', plural: 'Tag' },
    permissions: {
      canCreate: can('portal-tags.create'),
      canUpdate: can('portal-tags.update'),
      canDelete: can('portal-tags.delete'),
    },
    service: {
      list: () => tagService.list(),
      create: (payload) => tagService.create(payload),
      update: (id, payload) => tagService.update(id, payload),
      remove: (id, callbacks) => tagService.remove(id, callbacks),
    },
    fields: [
      {
        key: 'name',
        kind: 'text',
        label: 'Nama Tag',
        required: true,
        maxLength: 60,
        placeholder: 'Misal: olimpiade',
      },
    ],
  }
}
