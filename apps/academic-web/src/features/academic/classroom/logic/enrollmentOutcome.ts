import type { EnrollmentStatus } from '../types'

export interface EnrollmentOutcome {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  noteIsAReason: boolean
}

const OUTCOMES: Record<EnrollmentStatus, EnrollmentOutcome> = {
  ACTIVE: {
    label: 'Sedang Berjalan',
    variant: 'outline',
    noteIsAReason: false,
  },
  PROMOTED: { label: 'Naik Kelas', variant: 'default', noteIsAReason: false },
  REPEATED: {
    label: 'Tinggal Kelas',
    variant: 'destructive',
    noteIsAReason: true,
  },
  TRANSFERRED: {
    label: 'Pindah Kelas',
    variant: 'secondary',
    noteIsAReason: false,
  },
  DROPPED: { label: 'Keluar', variant: 'destructive', noteIsAReason: true },
  GRADUATED: { label: 'Lulus', variant: 'secondary', noteIsAReason: false },
}

export function enrollmentOutcome(status: string): EnrollmentOutcome {
  return (
    OUTCOMES[status as EnrollmentStatus] ?? {
      label: status,
      variant: 'outline',
      noteIsAReason: false,
    }
  )
}
