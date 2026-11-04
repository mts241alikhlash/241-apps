export interface ReferenceDataTextField {
  key: string
  kind: 'text'
  label: string
  required?: boolean
  maxLength?: number
  placeholder?: string
  readOnlyOnEdit?: boolean
}

export interface ReferenceDataNumberField {
  key: string
  kind: 'number'
  label: string
  required?: boolean
  min?: number
  max?: number
  default?: number
  placeholder?: string
  hint?: string
}

export interface ReferenceDataBooleanField {
  key: string
  kind: 'boolean'
  label: string
  required?: boolean
  default?: boolean
  trueLabel?: string
  falseLabel?: string
}

export type ReferenceDataField =
  ReferenceDataTextField | ReferenceDataNumberField | ReferenceDataBooleanField

export interface ReferenceDataEntity {
  id: string
}

export interface ReferenceDataDeleteCallbacks {
  closeAlert: () => void
  setLoading: (state: boolean) => void
}

export interface ReferenceDataConfig<
  T extends ReferenceDataEntity,
  TCreate = Record<string, unknown>,
  TUpdate = TCreate,
> {
  entityLabel: {
    singular: string
    plural: string
  }
  permissions: {
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
  }
  service: {
    list: () => Promise<T[]>
    create: (payload: TCreate) => Promise<boolean>
    update: (id: string, payload: TUpdate) => Promise<boolean>
    remove: (
      id: string,
      callbacks: ReferenceDataDeleteCallbacks,
    ) => Promise<boolean>
  }
  fields: ReferenceDataField[]
}

export type ReferenceDataDisplayConfig<T extends ReferenceDataEntity> = Pick<
  ReferenceDataConfig<T>,
  'entityLabel' | 'permissions' | 'fields'
>
