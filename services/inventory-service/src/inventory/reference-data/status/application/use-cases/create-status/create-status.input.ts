import { InventoryStatusKey } from '@mts241alikhlash/nest-core/domain'

export interface CreateStatusInput {
  code: string
  name: string
  allowTransactions?: boolean
  systemKey?: InventoryStatusKey | null
}
