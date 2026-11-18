import type { Component } from 'vue'
import type { PrintDocumentKey } from '../types'
import DeskNumbersDocument from './DeskNumbersDocument.vue'
import ExamScheduleDocument from './ExamScheduleDocument.vue'
import ParticipantCardsDocument from './ParticipantCardsDocument.vue'
import StaffAttendanceDocument from './StaffAttendanceDocument.vue'
import StudentAttendanceDocument from './StudentAttendanceDocument.vue'

export interface PrintDocumentDefinition {
  title: string
  component: Component
  perRoom: boolean
}

export const PRINT_DOCUMENTS: Record<
  PrintDocumentKey,
  PrintDocumentDefinition
> = {
  cards: {
    title: 'Kartu Peserta',
    component: ParticipantCardsDocument,
    perRoom: true,
  },
  desks: {
    title: 'Nomor Meja',
    component: DeskNumbersDocument,
    perRoom: true,
  },
  schedule: {
    title: 'Jadwal Ujian',
    component: ExamScheduleDocument,
    perRoom: false,
  },
  'student-attendance': {
    title: 'Daftar Hadir Peserta',
    component: StudentAttendanceDocument,
    perRoom: true,
  },
  'staff-attendance': {
    title: 'Daftar Hadir Pengawas dan Teknisi',
    component: StaffAttendanceDocument,
    perRoom: true,
  },
}
