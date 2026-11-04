import type { DecimalValue } from '@mts241alikhlash/nest-core/domain'
import { toNumericValue } from '@mts241alikhlash/nest-core/domain'

export function serializeWave<T extends { registrationFee: DecimalValue }>(
  wave: T,
) {
  return {
    ...wave,
    registrationFee: toNumericValue(wave.registrationFee),
  }
}
