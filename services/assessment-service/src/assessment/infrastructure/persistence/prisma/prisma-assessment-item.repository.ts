import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../../generated/prisma/client.js'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import { resolveUserRefs } from '../../../../shared/utils/resolve-user-refs.helper.js'
import { resolveAssessmentRefs } from '../../../../shared/utils/assessment-refs.helper.js'
import { IProfileLookupPort } from '../../../../platform/profile-lookup/profile-lookup.port.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IEnrollmentLookupPort } from '../../../../platform/enrollment-lookup/enrollment-lookup.port.js'
import type {
  AssessmentItemQueryInput,
  CreateAssessmentItemRepositoryInput,
  UpdateAssessmentItemRepositoryInput,
} from '../../../domain/repositories/assessment-item.repository.js'
import { IAssessmentItemRepository } from '../../../domain/repositories/assessment-item.repository.js'
import { AssessmentItemWithDetails } from '../../../domain/entities/assessment-item.entity.js'
import { toAssignmentRef } from './prisma-assessment.refs.js'
import {
  ASSESSMENT_ITEM_WITH_DETAILS_INCLUDE,
  AssessmentItemRow,
} from './prisma-assessment.includes.js'

@Injectable()
export class PrismaAssessmentItemRepository extends IAssessmentItemRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileLookupPort: IProfileLookupPort,
    private readonly academicLookup: IAcademicLookupPort,
    private readonly enrollmentLookup: IEnrollmentLookupPort,
  ) {
    super()
  }

  private async decorate(
    rows: AssessmentItemRow[],
  ): Promise<AssessmentItemWithDetails[]> {
    if (rows.length === 0) return []

    const refs = await resolveAssessmentRefs(
      this.enrollmentLookup,
      this.academicLookup,
      { teachingAssignmentIds: rows.map((row) => row.teachingAssignmentId) },
    )

    const assignments = rows
      .map((row) => refs.assignment(row.teachingAssignmentId))
      .filter((assignment) => assignment !== null)

    const classroomsBySemester = new Map<string, Set<string>>()
    for (const assignment of assignments) {
      const classroomSet =
        classroomsBySemester.get(assignment.semesterId) ?? new Set<string>()
      classroomSet.add(assignment.classroomId)
      classroomsBySemester.set(assignment.semesterId, classroomSet)
    }

    const [userRefs, gradedGroups, semesterCounts] = await Promise.all([
      resolveUserRefs(
        assignments
          .map((assignment) => assignment.employeeUserId)
          .filter((userId): userId is string => userId !== null),
        this.profileLookupPort,
      ),
      this.prisma.studentScore.groupBy({
        by: ['assessmentItemId'],
        where: {
          assessmentItemId: { in: rows.map((row) => row.id) },
          deletedAt: null,
          score: { not: null },
        },
        _count: { _all: true },
      }),
      Promise.all(
        [...classroomsBySemester.entries()].map(
          async ([semesterId, classroomIds]) => ({
            semesterId,
            counts: await this.enrollmentLookup.countByClassrooms(
              [...classroomIds],
              semesterId,
            ),
          }),
        ),
      ),
    ])

    const gradedCountByItem = new Map(
      gradedGroups.map((group) => [group.assessmentItemId, group._count._all]),
    )
    const studentCountByClassroom = new Map<string, number>()
    for (const { semesterId, counts } of semesterCounts) {
      for (const entry of counts) {
        studentCountByClassroom.set(
          `${semesterId}:${entry.classroomId}`,
          entry.count,
        )
      }
    }

    return rows.map((row) => {
      const assignment = refs.assignment(row.teachingAssignmentId)
      return {
        ...row,
        gradedCount: gradedCountByItem.get(row.id) ?? 0,
        studentCount: assignment
          ? (studentCountByClassroom.get(
              `${assignment.semesterId}:${assignment.classroomId}`,
            ) ?? 0)
          : undefined,
        teachingAssignment: assignment
          ? toAssignmentRef(assignment, userRefs)
          : undefined,
      }
    })
  }

  async findAll(query: AssessmentItemQueryInput) {
    const {
      page = 1,
      limit = 10,
      teachingAssignmentId,
      teachingAssignmentIds,
      type,
    } = query
    const skip = (page - 1) * limit

    const where: Prisma.AssessmentItemWhereInput = {
      deletedAt: null,
      ...(teachingAssignmentIds?.length
        ? { teachingAssignmentId: { in: teachingAssignmentIds } }
        : teachingAssignmentId
          ? { teachingAssignmentId }
          : {}),
      ...(type && { type }),
    }

    const [rows, total] = await Promise.all([
      this.prisma.assessmentItem.findMany({
        where,
        include: ASSESSMENT_ITEM_WITH_DETAILS_INCLUDE,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.assessmentItem.count({ where }),
    ])

    return { data: await this.decorate(rows), total, page, limit }
  }

  async findById(id: string) {
    const row = await this.prisma.assessmentItem.findFirst({
      where: { id, deletedAt: null },
      include: ASSESSMENT_ITEM_WITH_DETAILS_INCLUDE,
    })
    if (!row) return null
    const [withRefs] = await this.decorate([row])
    return withRefs
  }

  async findNameClash(
    teachingAssignmentId: string,
    name: string,
    exceptId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.assessmentItem.findFirst({
      where: {
        teachingAssignmentId,
        deletedAt: null,
        name: { equals: name.trim(), mode: 'insensitive' },
        ...(exceptId && { NOT: { id: exceptId } }),
      },
      select: { id: true },
    })
    return existing !== null
  }

  async create(dto: CreateAssessmentItemRepositoryInput) {
    const row = await this.prisma.assessmentItem.create({
      data: {
        teachingAssignmentId: dto.teachingAssignmentId,
        name: dto.name,
        type: dto.type,
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
        ...(dto.material !== undefined && { material: dto.material }),
        ...(dto.kktp !== undefined && { kktp: dto.kktp }),
      },
      include: ASSESSMENT_ITEM_WITH_DETAILS_INCLUDE,
    })
    const [withRefs] = await this.decorate([row])
    return withRefs
  }

  async update(id: string, dto: UpdateAssessmentItemRepositoryInput) {
    const row = await this.prisma.assessmentItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
        ...(dto.material !== undefined && { material: dto.material }),
        ...(dto.kktp !== undefined && { kktp: dto.kktp }),
      },
      include: ASSESSMENT_ITEM_WITH_DETAILS_INCLUDE,
    })
    const [withRefs] = await this.decorate([row])
    return withRefs
  }

  async remove(id: string) {
    return this.softDelete(id)
  }

  async softDelete(id: string) {
    return this.prisma.assessmentItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async countScoresWithAssessmentItem(id: string): Promise<number> {
    return this.prisma.studentScore.count({
      where: { assessmentItemId: id, deletedAt: null },
    })
  }
}
