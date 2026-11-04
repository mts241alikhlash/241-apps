import { StorageKeyBuilder } from './storage-key-builder.service.js'
import { AppKey } from '../../shared/domain/enums/app-key.enum.js'

describe('StorageKeyBuilder', () => {
  it('starts with the app, never with an environment name', () => {
    const app = Object.values(AppKey)[0] as AppKey
    const key = new StorageKeyBuilder().build(app, ['documents'], 'a.pdf')
    expect(key).toBe(`${app.toLowerCase()}/documents/a.pdf`)
  })
})
