import type { Component } from 'vue'
import type { PrintScopeGroup } from '../composables/usePrintScope'
import type { PrintDocumentKey } from '../types'
import ExamScheduleDocument from './ExamScheduleDocument.vue'
import PrintParticipantDocument from './PrintParticipantDocument.vue'

export interface PrintDocumentDefinition {
  title: string
  component: Component
  perRoom: boolean
  scopeGroups?: PrintScopeGroup[]
  inlineFilters?: boolean
  componentProps?: Record<string, unknown>
}

export const PRINT_DOCUMENTS: Record<
  PrintDocumentKey,
  PrintDocumentDefinition
> = {
  cards: {
    title: 'Kartu Peserta',
    component: PrintParticipantDocument,
    perRoom: true,
    inlineFilters: true,
    componentProps: { kind: 'card' },
  },
  desks: {
    title: 'Nomor Meja',
    component: PrintParticipantDocument,
    perRoom: true,
    inlineFilters: true,
    componentProps: { kind: 'seat' },
  },
  schedule: {
    title: 'Jadwal Ujian',
    component: ExamScheduleDocument,
    perRoom: false,
  },
}
