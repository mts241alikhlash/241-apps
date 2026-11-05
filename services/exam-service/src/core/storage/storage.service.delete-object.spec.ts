import type { Mock } from 'vitest'
import { InternalServerErrorException } from '@nestjs/common'
import { StorageService } from './storage.service.js'

function storageWith(send: Mock) {
  const settings: Record<string, unknown> = {
    S3_BUCKET: 'bucket',
    S3_SIGNED_URL_EXPIRY_SECONDS: 60,
    S3_ENDPOINT: 'http://localhost:9000',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY_ID: 'key',
    S3_SECRET_ACCESS_KEY: 'secret',
  }
  const storage = new StorageService({
    get: vi.fn((name: string) => settings[name]),
  } as never)
  ;(storage as unknown as { client: { send: Mock } }).client = { send }
  return storage
}

describe('StorageService.deleteObject', () => {
  it('deletes the key from the bucket', async () => {
    const send = vi.fn().mockResolvedValue({})

    await storageWith(send).deleteObject('exam-proctor/s1/latest.jpg')

    expect(send).toHaveBeenCalledTimes(1)
    expect(
      (send.mock.calls[0][0] as { input: Record<string, string> }).input,
    ).toEqual({ Bucket: 'bucket', Key: 'exam-proctor/s1/latest.jpg' })
  })

  it('answers 500 when the store refuses the delete', async () => {
    const send = vi.fn().mockRejectedValue(new Error('connection reset'))

    await expect(storageWith(send).deleteObject('k')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    )
  })
})
