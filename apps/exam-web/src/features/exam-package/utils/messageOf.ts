import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'

interface ServerFailure {
  response?: { status?: number; data?: { message?: unknown; code?: unknown } }
}

const ERROR_CODE_MESSAGES: Record<string, string> = {
  PRESET_LOCKED: 'Preset kebijakan untuk ujian ini dikunci oleh jenisnya.',
  TOKEN_MODE_LOCKED: 'Ujian resmi wajib memakai token berputar.',
  FINAL_ADMIN_ONLY: 'Kegiatan UAS hanya dapat dibuat oleh admin ujian.',
  MIDTERM_OUTSIDE_EVENT:
    'Kegiatan UTS harus berada di dalam periode UTS yang sedang aktif.',
  EVENT_REQUIRED:
    'Kegiatan ujian wajib ditautkan ke periode ujian yang sesuai.',
  EVENT_TYPE_NOT_EXAM: 'Periode ujian hanya dapat dibuat untuk UTS atau UAS.',
}

export function statusOf(err: unknown): number | undefined {
  return (err as ServerFailure | null)?.response?.status
}

export function messageOf(err: unknown, fallback: string): string {
  const response = (err as ServerFailure | null)?.response
  const code = response?.data?.code
  if (typeof code === 'string' && ERROR_CODE_MESSAGES[code]) {
    return ERROR_CODE_MESSAGES[code]
  }
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
