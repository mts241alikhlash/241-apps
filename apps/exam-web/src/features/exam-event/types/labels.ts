import type { ExamEventStatus } from './event'

const EVENT_STATUS_LABELS: Record<ExamEventStatus, string> = {
  DRAFT: 'Draf',
  ACTIVE: 'Berlangsung',
  COMPLETED: 'Selesai',
}

export const eventStatusLabel = (status: ExamEventStatus): string =>
  EVENT_STATUS_LABELS[status]

const EVENT_STATUS_TONES: Record<
  ExamEventStatus,
  'outline' | 'secondary' | 'default'
> = {
  DRAFT: 'outline',
  ACTIVE: 'secondary',
  COMPLETED: 'default',
}

export const eventStatusVariant = (status: ExamEventStatus) =>
  EVENT_STATUS_TONES[status]

export const seatLabel = (seatNumber: number): string => `Kursi ${seatNumber}`
