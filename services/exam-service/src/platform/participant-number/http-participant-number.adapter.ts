import { Injectable } from '@nestjs/common'
import { ServiceClient } from '@mts241alikhlash/nest-core/service-client'
import { IParticipantNumberPort } from './participant-number.port.js'

const URL_KEY = 'STUDENT_SERVICE_URL'
const LOOKUP_CHUNK = 500

function isNumberEntry(
  entry: unknown,
): entry is { studentId: string; number: string } {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'studentId' in entry &&
    typeof entry.studentId === 'string' &&
    'number' in entry &&
    typeof entry.number === 'string'
  )
}

function isIssueAnswer(
  data: unknown,
): data is { issued: number; skipped: string[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'issued' in data &&
    typeof data.issued === 'number' &&
    'skipped' in data &&
    Array.isArray(data.skipped) &&
    data.skipped.every((id) => typeof id === 'string')
  )
}

@Injectable()
export class HttpParticipantNumberAdapter extends IParticipantNumberPort {
  constructor(private readonly client: ServiceClient) {
    super()
  }

  async findNumber(
    studentId: string,
    semesterId: string,
  ): Promise<string | null> {
    const data = await this.client.getData(
      URL_KEY,
      `/students/by-id/${encodeURIComponent(studentId)}/participant-number?semesterId=${encodeURIComponent(semesterId)}`,
    )
    if (data === null || data === undefined) return null
    const number =
      typeof data === 'object' && 'number' in data
        ? (data as Record<string, unknown>).number
        : undefined

    if (number === null) return null
    if (typeof number === 'string') return number
    return this.client.malformed(URL_KEY)
  }

  async findNumbers(
    studentIds: string[],
    semesterId: string,
  ): Promise<Map<string, string>> {
    const numbers = new Map<string, string>()
    for (let i = 0; i < studentIds.length; i += LOOKUP_CHUNK) {
      const studentIdsChunk = studentIds.slice(i, i + LOOKUP_CHUNK)
      const data = await this.client.postData(
        URL_KEY,
        '/students/participant-numbers/lookup',
        { semesterId, studentIds: studentIdsChunk },
      )
      if (!Array.isArray(data)) return this.client.malformed(URL_KEY)
      for (const entry of data) {
        if (!isNumberEntry(entry)) return this.client.malformed(URL_KEY)
        numbers.set(entry.studentId, entry.number)
      }
    }
    return numbers
  }

  async issueNumbers(
    semesterId: string,
  ): Promise<{ issued: number; skipped: string[] }> {
    const data = await this.client.postData(
      URL_KEY,
      '/students/participant-numbers/issue',
      { semesterId },
    )
    if (!isIssueAnswer(data)) return this.client.malformed(URL_KEY)
    return data
  }
}
