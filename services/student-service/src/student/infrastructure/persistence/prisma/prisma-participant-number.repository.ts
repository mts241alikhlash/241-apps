import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import {
  IParticipantNumberRepository,
  ParticipantNumberRow,
} from '../../../domain/repositories/participant-number.repository.js'

const ROW_SELECT = {
  studentId: true,
  semesterId: true,
  gradeLevel: true,
  ordinal: true,
  number: true,
} as const

@Injectable()
export class PrismaParticipantNumberRepository extends IParticipantNumberRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async findByStudent(
    studentId: string,
    semesterId: string,
  ): Promise<ParticipantNumberRow | null> {
    return this.prisma.studentParticipantNumber.findUnique({
      where: { semesterId_studentId: { semesterId, studentId } },
      select: ROW_SELECT,
    })
  }

  async issue(
    semesterId: string,
    build: (
      existing: readonly ParticipantNumberRow[],
    ) => ParticipantNumberRow[],
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${semesterId}))`
      const existing = await tx.studentParticipantNumber.findMany({
        where: { semesterId },
        select: ROW_SELECT,
      })
      const rows = build(existing)
      if (rows.length === 0) return 0
      const { count } = await tx.studentParticipantNumber.createMany({
        data: rows,
      })
      return count
    })
  }
}
