import { BadRequestException } from '@nestjs/common'

export const MIN_RECOVERY_REASON_LENGTH = 5
export const MAX_REASON_LENGTH = 300

export function assertRecoveryReason(reason: string | undefined): string {
  const trimmed = (reason ?? '').trim()
  if (trimmed.length < MIN_RECOVERY_REASON_LENGTH) {
    throw new BadRequestException({
      code: 'REASON_REQUIRED',
      message: 'Alasan tindakan wajib diisi minimal 5 karakter',
    })
  }
  return trimmed.slice(0, MAX_REASON_LENGTH)
}
