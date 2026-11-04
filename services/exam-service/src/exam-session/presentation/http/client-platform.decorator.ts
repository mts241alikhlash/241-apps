import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import {
  WEB_CLIENT_HEADER,
  WEB_CLIENT_VALUE,
  type ClientPlatform,
} from '../../domain/policies/client-gate.policy.js'

export const ClientPlatformHeader = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ClientPlatform => {
    const value = context.switchToHttp().getRequest<Request>().headers[
      WEB_CLIENT_HEADER.toLowerCase()
    ]
    return value === WEB_CLIENT_VALUE ? 'web' : 'native'
  },
)
