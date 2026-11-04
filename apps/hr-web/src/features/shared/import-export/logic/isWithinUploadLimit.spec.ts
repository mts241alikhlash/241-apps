import { describe, it, expect } from 'vitest'
import { isWithinUploadLimit } from './isWithinUploadLimit'

function fileOfSize(bytes: number): File {
  return new File([new Uint8Array(bytes)], 'data.xlsx')
}

describe('isWithinUploadLimit', () => {
  it('accepts a file of exactly 5 MB', () => {
    expect(isWithinUploadLimit(fileOfSize(5 * 1024 * 1024))).toBe(true)
  })

  it('rejects a file over 5 MB, which the service would refuse with 413', () => {
    expect(isWithinUploadLimit(fileOfSize(5 * 1024 * 1024 + 1))).toBe(false)
  })
})
