import * as bcrypt from 'bcrypt'
import { randomBytes, randomInt } from 'node:crypto'

export async function hashPassword(password: string): Promise<string> {
  const saltRoundsStr = process.env.BCRYPT_SALT_ROUNDS
  const rounds = saltRoundsStr ? Number(saltRoundsStr) : 10
  const saltRounds = Number.isInteger(rounds) && rounds > 0 ? rounds : 10
  return bcrypt.hash(password, saltRounds)
}

export function randomPassword(): string {
  return randomBytes(24).toString('base64url')
}

const READABLE_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function randomReadablePassword(): string {
  let password = ''
  for (let i = 0; i < 10; i++) {
    password += READABLE_ALPHABET[randomInt(READABLE_ALPHABET.length)]
  }
  return password
}
