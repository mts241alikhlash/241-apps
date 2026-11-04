import { Injectable } from '@nestjs/common'
import { AppKey } from '../../shared/domain/enums/app-key.enum.js'

@Injectable()
export class StorageKeyBuilder {
  build(app: AppKey, segments: string[], filename: string): string {
    return [app.toLowerCase(), ...segments, filename].join('/')
  }
}
