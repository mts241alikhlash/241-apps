import {
  toNumericValue,
  type DecimalValue,
} from '@mts241alikhlash/nest-core/domain'

export function serializePayment<T extends { amount: DecimalValue }>(
  payment: T,
) {
  return { ...payment, amount: toNumericValue(payment.amount) }
}
