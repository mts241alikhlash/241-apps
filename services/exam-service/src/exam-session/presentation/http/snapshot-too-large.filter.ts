import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common'
import type { Response } from 'express'

@Catch(PayloadTooLargeException)
export class SnapshotTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const error = new BadRequestException('Ukuran foto maksimal 50 KB')
    response.status(error.getStatus()).json({
      statusCode: error.getStatus(),
      message: 'Ukuran foto maksimal 50 KB',
      data: null,
    })
  }
}
