import { createHmac } from 'node:crypto'

export const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ACCESS_CODE_LENGTH = 6
export const SLOT_DURATION_SECONDS = 600
export const ROLLOVER_GRACE_SECONDS = 90

export const SLOT_DURATION_MS = SLOT_DURATION_SECONDS * 1000

const BYTE_RANGE = 256
const UNBIASED_LIMIT = BYTE_RANGE - (BYTE_RANGE % ACCESS_CODE_ALPHABET.length)

export interface DerivedAccessCode {
  code: string
  expiresAt: Date
  slotIndex: number
}

export function slotIndexAt(now: Date): number {
  return Math.floor(now.getTime() / SLOT_DURATION_MS)
}

export function deriveAccessCode(
  secret: string,
  scopeId: string,
  rotation: number,
  now: Date = new Date(),
): DerivedAccessCode {
  const slotIndex = slotIndexAt(now)
  const scope = `${scopeId}:${rotation}:${slotIndex}`
  let code = ''
  for (let block = 0; code.length < ACCESS_CODE_LENGTH; block++) {
    const message = block === 0 ? scope : `${scope}:${block}`
    for (const byte of createHmac('sha256', secret).update(message).digest()) {
      if (byte >= UNBIASED_LIMIT) continue
      code += ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length]
      if (code.length === ACCESS_CODE_LENGTH) break
    }
  }
  return {
    code,
    expiresAt: new Date((slotIndex + 1) * SLOT_DURATION_MS),
    slotIndex,
  }
}
