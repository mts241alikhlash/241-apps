import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

export interface ThrottleKeyRequest {
  user?: { id?: string }
  ip?: string
}

export function throttleKey(request: ThrottleKeyRequest): string {
  const userId = request.user?.id
  return userId ? `user:${userId}` : `ip:${request.ip ?? 'unknown'}`
}

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(request: ThrottleKeyRequest): Promise<string> {
    return Promise.resolve(throttleKey(request))
  }
}
