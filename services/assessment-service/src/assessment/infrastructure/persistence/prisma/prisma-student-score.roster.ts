import { Prisma } from '../../../../generated/prisma/client.js'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { IEnrollmentLookupPort } from '../../../../platform/enrollment-lookup/enrollment-lookup.port.js'
import type {
  BulkStudentScoreRecord,
  ItemEnrollmentScore,
  StudentScoreRosterItem,
} from '../../../domain/repositories/student-score.repository.js'

export async function buildScoreRoster(
  prisma: PrismaService,
  enrollmentLookup: IEnrollmentLookupPort,
  assessmentItemId: string,
  classroomId?: string,
  semesterId?: string,
): Promise<StudentScoreRosterItem[]> {
  const enrollments = await enrollmentLookup.search({
    classroomId,
    semesterId,
  })
  if (enrollments.length === 0) return []

  const scores = await prisma.studentScore.findMany({
    where: {
      assessmentItemId,
      deletedAt: null,
      enrollmentId: { in: enrollments.map((enrollment) => enrollment.id) },
    },
  })
  const scoreMap = new Map(scores.map((score) => [score.enrollmentId, score]))

  return enrollments
    .map((enrollment) => {
      const score = scoreMap.get(enrollment.id)
      return {
        enrollmentId: enrollment.id,
        nis: enrollment.studentNis ?? '',
        nisn: enrollment.studentNisn ?? '',
        gender: enrollment.studentGender ?? null,
        studentName: enrollment.studentName ?? '-',
        scoreId: score?.id ?? null,
        score: score?.score ?? null,
        note: score?.note ?? null,
      }
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName))
}

export async function upsertScores(
  prisma: PrismaService | Prisma.TransactionClient,
  assessmentItemId: string,
  records: BulkStudentScoreRecord[],
  correctedById: string | null = null,
  insideTransaction = false,
): Promise<{ saved: number }> {
  if (records.length === 0) return { saved: 0 }
  const buildQueries = (client: PrismaService | Prisma.TransactionClient) =>
    records.map((record) =>
      client.studentScore.upsert({
        where: {
          enrollmentId_assessmentItemId: {
            enrollmentId: record.enrollmentId,
            assessmentItemId,
          },
        },
        update: {
          score: record.score,
          note: record.note,
          deletedAt: null,
          correctedById,
          correctedAt: correctedById ? new Date() : null,
        },
        create: {
          enrollmentId: record.enrollmentId,
          assessmentItemId,
          score: record.score,
          note: record.note,
          correctedById,
          correctedAt: correctedById ? new Date() : null,
        },
      }),
    )

  if (
    !insideTransaction &&
    '$transaction' in prisma &&
    typeof prisma.$transaction === 'function'
  ) {
    const results = await prisma.$transaction(buildQueries(prisma))
    return { saved: results.length }
  }
  const results = await Promise.all(buildQueries(prisma))
  return { saved: results.length }
}

export async function findScoresForItems(
  prisma: PrismaService,
  assessmentItemIds: string[],
  enrollmentIds: string[],
): Promise<ItemEnrollmentScore[]> {
  if (assessmentItemIds.length === 0 || enrollmentIds.length === 0) return []
  return prisma.studentScore.findMany({
    where: {
      assessmentItemId: { in: assessmentItemIds },
      enrollmentId: { in: enrollmentIds },
      deletedAt: null,
    },
    select: {
      assessmentItemId: true,
      enrollmentId: true,
      score: true,
    },
  })
}
