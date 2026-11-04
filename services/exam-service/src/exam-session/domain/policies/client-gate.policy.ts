import { ForbiddenException } from '@nestjs/common'

export const WEB_CLIENT_HEADER = 'X-Client-Platform'
export const WEB_CLIENT_VALUE = 'web'

export type ClientPlatform = 'web' | 'native'

export interface ClientGateInput {
  platform: ClientPlatform
  requireAndroidApp: boolean
  allowWebClient: boolean
  now: Date
  eventStartsAt: Date
  lateToleranceMinutes: number
  allowLateEntry: boolean
  startedAt?: Date
}

function refuse(code: string, message: string): never {
  throw new ForbiddenException({ code, message })
}

export function assertWebClientAllowed(input: ClientGateInput): void {
  if (
    input.platform === 'web' &&
    input.requireAndroidApp &&
    !input.allowWebClient
  ) {
    refuse(
      'WEB_CLIENT_FORBIDDEN',
      'Jadwal ini wajib dikerjakan dari aplikasi Android. Hubungi Teknisi Ruangan',
    )
  }
}

export function assertNotLate(input: ClientGateInput): void {
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

export function assertClientAllowed(input: ClientGateInput): void {
  assertWebClientAllowed(input)
  assertNotLate(input)
}
