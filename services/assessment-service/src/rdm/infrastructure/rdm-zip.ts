import { BadRequestException } from '@nestjs/common'
import type JSZip from 'jszip'
import { RDM_MAX_UNCOMPRESSED_BYTES } from '../constants/rdm.constants.js'

export const DECOMPRESSED_TOO_LARGE_MESSAGE =
  'File terlalu besar setelah diekstrak'

export interface DecompressionBudget {
  remaining: number
}

export function createDecompressionBudget(
  maxBytes: number = RDM_MAX_UNCOMPRESSED_BYTES,
): DecompressionBudget {
  return { remaining: maxBytes }
}

export function readEntryText(
  entry: JSZip.JSZipObject,
  budget: DecompressionBudget,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const stream = entry.nodeStream('nodebuffer')
    let settled = false
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      reject(error)
    }
    stream.on('data', (chunk: Buffer) => {
      if (settled) return
      budget.remaining -= chunk.length
      if (budget.remaining < 0) {
        stream.pause()
        fail(new BadRequestException(DECOMPRESSED_TOO_LARGE_MESSAGE))
        return
      }
      chunks.push(chunk)
    })
    stream.on('error', fail)
    stream.on('end', () => {
      if (settled) return
      settled = true
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
  })
}
