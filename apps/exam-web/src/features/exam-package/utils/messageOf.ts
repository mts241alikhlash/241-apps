import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'

interface ServerFailure {
  response?: { status?: number; data?: { message?: unknown } }
}

export function statusOf(err: unknown): number | undefined {
  return (err as ServerFailure | null)?.response?.status
}

export function messageOf(err: unknown, fallback: string): string {
  const response = (err as ServerFailure | null)?.response
  const status = response?.status
  const message = response?.data?.message
  if (
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== 401 &&
    typeof message === 'string' &&
    message.trim() !== '' &&
    message !== 'Forbidden resource'
  ) {
    return message
  }
  return getIndonesianErrorMessage(err, fallback)
}
