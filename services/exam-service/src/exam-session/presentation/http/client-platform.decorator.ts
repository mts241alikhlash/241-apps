import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { IncomingHttpHeaders } from 'node:http'
import type { Request } from 'express'
import {
  WEB_CLIENT_HEADER,
  WEB_CLIENT_VALUE,
  type ClientPlatform,
} from '../../domain/policies/client-gate.policy.js'

export function platformFromHeaders(
  headers: IncomingHttpHeaders,
): ClientPlatform {
  const browser =
    headers[WEB_CLIENT_HEADER.toLowerCase()] === WEB_CLIENT_VALUE ||
    headers.origin !== undefined ||
    headers['sec-fetch-site'] !== undefined
  return browser ? 'web' : 'native'
}

export const ClientPlatformHeader = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ClientPlatform =>
    platformFromHeaders(context.switchToHttp().getRequest<Request>().headers),
)
