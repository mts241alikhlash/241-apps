import { Injectable } from '@nestjs/common'
import { AcademicYear } from '../../../domain/entities/academic-year.entity.js'
import { IAcademicYearRepository } from '../../../domain/repositories/academic-year.repository.js'
import { PaginatedResponse } from '@mts241alikhlash/nest-core/domain'
import type { ListAcademicYearsInput } from './get-academic-years.input.js'

@Injectable()
export class GetAcademicYearsUseCase {
  constructor(
    private readonly academicYearRepository: IAcademicYearRepository,
  ) {}

  async execute(
    input: ListAcademicYearsInput,
  ): Promise<PaginatedResponse<AcademicYear>> {
    const { data, total, page, limit } =
      await this.academicYearRepository.findAll({
        page: input.page,
        limit: input.limit,
        search: input.search,
      })
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}
