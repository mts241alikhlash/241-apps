import { Injectable } from '@nestjs/common'
import { ServiceClient } from '@mts241alikhlash/nest-core/service-client'
import { IParticipantNumberPort } from './participant-number.port.js'

const URL_KEY = 'STUDENT_SERVICE_URL'

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
}
