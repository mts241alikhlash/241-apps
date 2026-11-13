import { ForbiddenException } from '@nestjs/common'

export const WEB_CLIENT_HEADER = 'X-Client-Platform'
export const WEB_CLIENT_VALUE = 'web'

export type ClientPlatform = 'web' | 'native'

export interface LateGateInput {
  now: Date
  eventStartsAt: Date
  lateToleranceMinutes: number
  allowLateEntry: boolean
  startedAt?: Date
}

export interface ClientGateInput extends LateGateInput {
  platform: ClientPlatform
  sebVerified: boolean
}

function refuse(code: string, message: string): never {
  throw new ForbiddenException({ code, message })
}

export function assertClientVerified(
  input: Pick<ClientGateInput, 'platform' | 'sebVerified'>,
): void {
  if (input.platform === 'web' && !input.sebVerified) {
    refuse(
      'SEB_REQUIRED',
      'Buka ujian lewat Safe Exam Browser dengan konfigurasi sekolah.',
    )
  }
}

export function assertNotLate(input: LateGateInput): void {
  const lateFrom =
    input.eventStartsAt.getTime() + input.lateToleranceMinutes * 60_000
  const reference = input.startedAt ?? input.now
  if (reference.getTime() > lateFrom && !input.allowLateEntry) {
    refuse(
      'LATE_ENTRY_FORBIDDEN',
      'Anda melewati batas toleransi keterlambatan, hubungi Pengawas/Teknisi Ruangan',
    )
  }
}
