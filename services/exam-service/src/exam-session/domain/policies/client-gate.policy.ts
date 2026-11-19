import { ForbiddenException } from '@nestjs/common'

export const WEB_CLIENT_HEADER = 'X-Client-Platform'
export const WEB_CLIENT_VALUE = 'web'

export type ClientPlatform = 'web' | 'native'

export interface LateGateInput {
  now: Date
  scheduleStartsAt: Date
  lateToleranceMinutes: number
  allowLateEntry: boolean
  startedAt?: Date
}

export interface ClientVerifyInput {
  platform: ClientPlatform
  sebVerified: boolean
  allowWeb: boolean
}

function refuse(code: string, message: string): never {
  throw new ForbiddenException({ code, message })
}

export function assertClientVerified(input: ClientVerifyInput): void {
  if (input.platform === 'web' && !input.allowWeb) {
    refuse('WEB_NOT_ALLOWED', 'Ujian ini hanya dapat dibuka lewat aplikasi.')
  }
  if (input.platform === 'web' && !input.sebVerified) {
    refuse(
      'SEB_REQUIRED',
      'Buka ujian lewat Safe Exam Browser dengan konfigurasi sekolah.',
    )
  }
}

export function assertNotLate(input: LateGateInput): void {
  const lateFrom =
    input.scheduleStartsAt.getTime() + input.lateToleranceMinutes * 60_000
  const reference = input.startedAt ?? input.now
  if (reference.getTime() > lateFrom && !input.allowLateEntry) {
    refuse(
      'LATE_ENTRY_FORBIDDEN',
      'Anda melewati batas toleransi keterlambatan, hubungi Pengawas/Teknisi Ruangan',
    )
  }
}
