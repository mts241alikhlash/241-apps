import { createHash, timingSafeEqual } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { ISebConfigRepository } from '../domain/repositories/seb-config.repository.js'

export const SEB_ALLOWED_ORIGINS = Symbol('SEB_ALLOWED_ORIGINS')

export interface SebProof {
  configKeyHash: string
  pageUrl: string
}

export interface SebVerification {
  verified: boolean
  configName: string | null
}

const NOT_VERIFIED: SebVerification = { verified: false, configName: null }

@Injectable()
export class SebVerifier {
  constructor(
    private readonly configs: ISebConfigRepository,
    @Inject(SEB_ALLOWED_ORIGINS) private readonly allowedOrigins: string[],
  ) {}

  async verify(proof: SebProof | undefined): Promise<SebVerification> {
    if (!proof) return NOT_VERIFIED

    let url: URL
    try {
      url = new URL(proof.pageUrl)
    } catch {
      return NOT_VERIFIED
    }
    if (!this.allowedOrigins.includes(url.origin)) return NOT_VERIFIED
    url.hash = ''

    const presented = Buffer.from(proof.configKeyHash.toLowerCase())
    for (const config of await this.configs.listActive()) {
      const expected = Buffer.from(
        createHash('sha256')
          .update(url.toString() + config.configKey)
          .digest('hex'),
      )
      if (
        presented.length === expected.length &&
        timingSafeEqual(presented, expected)
      ) {
        return { verified: true, configName: config.name }
      }
    }
    return NOT_VERIFIED
  }
}
