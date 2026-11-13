import type { components } from '@mts241alikhlash/exam-api'
import { unwrap } from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'

type Schemas = components['schemas']

export type SebConfig = Schemas['SebConfigDto']
export type CheckSebResult = Schemas['CheckSebResponseDto']

export interface CreateSebConfigPayload {
  name: string
  configKey: string
  file: File
}

const passThrough = (body: unknown) => body as never

export const examSebApi = {
  list: () => unwrap(examClient.GET('/seb-configs')),

  create: (payload: CreateSebConfigPayload) => {
    const form = new FormData()
    form.append('name', payload.name)
    form.append('configKey', payload.configKey)
    form.append('file', payload.file)
    return unwrap(
      examClient.POST('/seb-configs', {
        body: form as never,
        bodySerializer: passThrough,
      }),
    )
  },

  update: (id: string, body: Schemas['UpdateSebConfigDto']) =>
    unwrap(
      examClient.PATCH('/seb-configs/{id}', {
        params: { path: { id } },
        body,
      }),
    ),

  remove: (id: string) =>
    unwrap(
      examClient.DELETE('/seb-configs/{id}', {
        params: { path: { id } },
      }),
    ),

  check: (body: Schemas['CheckSebRequestDto']): Promise<CheckSebResult> =>
    unwrap(examClient.POST('/seb-configs/check', { body })),
}
