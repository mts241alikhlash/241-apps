import { participantNumberApi } from '../api/participantNumberApi'

const LOOKUP_CHUNK_SIZE = 500

export const participantNumberService = {
  issue: (semesterId: string) => participantNumberApi.issue(semesterId),

  async loadNumbers(
    semesterId: string,
    studentIds: string[],
  ): Promise<Map<string, string>> {
    const chunks: string[][] = []
    for (let i = 0; i < studentIds.length; i += LOOKUP_CHUNK_SIZE) {
      chunks.push(studentIds.slice(i, i + LOOKUP_CHUNK_SIZE))
    }
    const pages = await Promise.all(
      chunks.map((chunk) => participantNumberApi.lookup(semesterId, chunk)),
    )
    return new Map(
      pages.flat().map((item) => [item.studentId, item.number] as const),
    )
  },
}
