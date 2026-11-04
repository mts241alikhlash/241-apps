import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import type { ApiErrorCode } from '../types/api-error-code.js'

export class ApiConflictException extends ConflictException {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super({ code, message })
  }
}

export class ApiNotFoundException extends NotFoundException {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super({ code, message })
  }
}

export class ApiForbiddenException extends ForbiddenException {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super({ code, message })
  }
}
