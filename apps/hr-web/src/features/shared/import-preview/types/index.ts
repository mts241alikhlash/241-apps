export type ImportRowStatus = 'SUCCESS' | 'FAILED' | 'CONFLICT'

export interface ImportPreviewRow<TData = Record<string, unknown>> {
  row: number
  status: ImportRowStatus
  identifier?: string
  error?: string
  existingId?: string
  data?: TData
}

export interface ImportColumnDescriptor {
  key: string
  header: string
  align: 'left' | 'center'
  errorAliases?: string[]
  messageLabel?: string
  valueMap?: Record<string, string>
}

export interface ImportResolveDecision<TData = Record<string, unknown>> {
  existingId?: string
  action: 'update' | 'skip'
  data: TData
}
