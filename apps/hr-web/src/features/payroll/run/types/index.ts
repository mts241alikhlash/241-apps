import type { components } from '@mts241alikhlash/hr-api'
type Schemas = components['schemas']

export type PayrollRun = Schemas['PayrollRunResponseDto'] &
  Partial<Pick<Schemas['RecalculatedPayrollRunResponseDto'], 'previousDraft'>>
export type PayrollRunStatus = PayrollRun['status']
export type PayrollRunKind = PayrollRun['kind']
export type PayrollActor = Schemas['PayrollActorResponseDto']
export type PayrollRunTotals = Schemas['PayrollRunTotalsResponseDto']
export type PayslipNetChange = Schemas['PayslipNetChangeResponseDto']
export type PreviousDraftComparison = Schemas['PreviousDraftResponseDto']

export interface CreatePayrollRunPayload {
  year: number
  month: number
  kind?: PayrollRunKind
  note?: string
}

export type PayslipSummary = Schemas['PayslipSummaryResponseDto']

export const RUN_STATUS_LABEL: Record<PayrollRunStatus, string> = {
  DRAFT: 'Draf',
  SUBMITTED: 'Diajukan',
  APPROVED: 'Disetujui',
}

export const RUN_KIND_LABEL: Record<PayrollRunKind, string> = {
  ORIGINAL: 'Utama',
  ADJUSTMENT: 'Penyesuaian',
}
