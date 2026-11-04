export interface InventoryCategory {
  id: string
  code: string
  name: string
  parentId: string | null
  depreciationRatePercent: number
  createdAt: string
}

export interface InventoryLocation {
  id: string
  code: string
  name: string
  building: string | null
  room: string | null
  rack: string | null
  description: string | null
  createdAt: string
}

export interface InventoryCondition {
  id: string
  code: string
  name: string
  isUsable: boolean
  createdAt: string
}

export type InventoryStatusKey =
  | 'AVAILABLE'
  | 'LOAN_PENDING'
  | 'LOAN_APPROVED'
  | 'LOANED'
  | 'LOAN_RETURNED'
  | 'LOAN_REJECTED'

export interface InventoryStatus {
  id: string
  code: string
  name: string
  allowTransactions: boolean
  systemKey: InventoryStatusKey | null
  createdAt: string
}

export interface InventoryFundingSource {
  id: string
  code: string
  name: string
  description: string | null
  createdAt: string
}

export interface InventoryAsset {
  id: string
  assetNumber: string
  name: string
  categoryId: string
  brand: string | null
  model: string | null
  purchaseDate: string
  purchasePrice: number
  usefulLifeMonths: number
  fundingSourceId: string | null
  imageUrl: string | null
  notes: string | null
  version: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null

  category: InventoryCategory
  fundingSource: InventoryFundingSource | null
  units: InventoryAssetUnit[]
}

export interface AssetUnitAssetRef {
  id: string
  assetNumber: string
  name: string
  category: InventoryCategory | null
}

export interface InventoryAssetUnit {
  id: string
  assetId: string
  unitNumber: string
  barcode: string | null
  currentBookValue: number
  conditionId: string
  statusId: string
  locationId: string
  custodianId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null

  condition?: InventoryCondition
  status?: InventoryStatus
  location?: InventoryLocation
  asset?: AssetUnitAssetRef
}

export interface LabelUnit {
  id: string
  unitNumber: string
  assetName: string
}

export interface InventoryMetadata {
  categories: InventoryCategory[]
  locations: InventoryLocation[]
  conditions: InventoryCondition[]
  statuses: InventoryStatus[]
  fundingSources: InventoryFundingSource[]
}

export interface AssetSavePayload {
  name: string
  categoryId: string
  brand?: string
  model?: string
  purchaseDate: string
  purchasePrice: number
  fundingSourceId?: string | null
  notes?: string
  quantity?: number
  conditionId?: string
  statusId?: string
  locationId?: string
}

export interface AddUnitsPayload {
  quantity?: number
  conditionId: string
  statusId: string
  locationId: string
}

export interface AssetUnitUpdatePayload {
  conditionId?: string
  statusId?: string
  locationId?: string
  custodianId?: string
  barcode?: string
  notes?: string
}

export interface AssetQueryParams {
  page: number
  limit: number
  keyword?: string
  categoryId?: string
  locationId?: string
  statusId?: string
  conditionId?: string
}

export interface AssetUnitQueryParams {
  page?: number
  limit?: number
  lendable?: boolean
  search?: string
}

export interface InventoryReferenceItem {
  id: string
  code: string
  name: string
  depreciationRatePercent?: number
  building?: string
  room?: string
  rack?: string
  description?: string
  isUsable?: boolean
  allowTransactions?: boolean
  systemKey?: InventoryStatusKey | null
}

export interface InventoryLoanItem {
  id: string
  loanId: string
  unitId: string
  returnedConditionId: string | null
  notes: string | null
  unit?: InventoryAssetUnit
}

export interface InventoryLoan {
  id: string
  loanNumber: string
  requesterId: string
  expectedReturnDate: string
  actualReturnDate: string | null
  purpose: string
  statusId: string
  workflowInstanceId: string | null
  createdAt: string
  updatedAt: string
  items: InventoryLoanItem[]
}

export interface LoanQueryParams {
  page: number
  limit: number
  keyword?: string
  statusId?: string
  requesterId?: string
}

export interface CreateLoanPayload {
  purpose: string
  expectedReturnDate: string
  unitIds: string[]
}

export interface ReturnLoanItemPayload {
  unitId: string
  returnedConditionId: string
  notes?: string
}

export interface ReturnLoanPayload {
  items: ReturnLoanItemPayload[]
}

export interface InventoryTransactionType {
  id: string
  code: string
  name: string
  direction: string
  description: string | null
}

export interface InventoryHistory {
  id: string
  unitId: string
  transactionTypeId: string
  previousConditionId: string | null
  newConditionId: string | null
  previousStatusId: string | null
  newStatusId: string | null
  note: string | null
  changedById: string
  changedAt: string
  unit?: InventoryAssetUnit
  transactionType?: InventoryTransactionType
}

export interface HistoryQueryParams {
  page: number
  limit: number
  unitId?: string
}

export interface ApprovalStep {
  id: string
  workflowId: string
  stepSequence: number
  approverRoleCode: string
  isMandatory: boolean
}

export interface ApprovalWorkflow {
  id: string
  name: string
  targetEntity: string
  description: string | null
  isActive: boolean
  steps: ApprovalStep[]
}

export interface CreateWorkflowStepPayload {
  stepSequence: number
  approverRoleCode: string
  isMandatory?: boolean
}

export interface CreateWorkflowPayload {
  name: string
  targetEntity: string
  description?: string
  steps: CreateWorkflowStepPayload[]
}

export interface ApprovalLog {
  id: string
  instanceId: string
  stepSequence: number
  approverId: string
  actionId: string
  note: string | null
  createdAt: string
}

export interface ApprovalInstance {
  id: string
  workflowId: string
  referenceId: string
  currentStepSequence: number
  statusId: string
  createdAt: string
  workflow?: ApprovalWorkflow
  logs?: ApprovalLog[]
  details?: InventoryLoan | null
}

export interface ProcessApprovalPayload {
  action: 'APPROVE' | 'REJECT'
  note?: string
  forwardToNextApprover?: boolean
}

export interface ProcessApprovalResult {
  success: boolean
  action: 'APPROVE_STEP' | 'APPROVE_FINAL' | 'REJECT'
  log: ApprovalLog
  nextStepSequence?: number
}
