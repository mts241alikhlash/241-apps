import { DecimalValue, toNumericValue } from '@mts241alikhlash/nest-core/domain'

function serializePayment<T extends { amount: DecimalValue }>(payment: T) {
  return { ...payment, amount: toNumericValue(payment.amount) }
}

export function serializeApplicationDetail<
  T extends {
    wave?: { registrationFee: DecimalValue } | null
    payment?: { amount: DecimalValue } | null
  },
>(application: T) {
  const { wave, payment } = application
  return {
    ...application,
    wave: wave
      ? { ...wave, registrationFee: toNumericValue(wave.registrationFee) }
      : wave,
    payment: payment ? serializePayment(payment) : payment,
  }
}

export type SerializedDecimal = DecimalValue
