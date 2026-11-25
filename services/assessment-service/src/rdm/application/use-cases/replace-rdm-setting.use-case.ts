import { BadRequestException, Injectable } from '@nestjs/common'
import type { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import {
  IRdmSettingRepository,
  RdmSettingEntity,
} from '../../domain/rdm-setting.js'

export interface ReplaceRdmSettingInput {
  sumatifTypes: AssessmentType[]
  sasType: AssessmentType
}

@Injectable()
export class ReplaceRdmSettingUseCase {
  constructor(private readonly rdmSettingRepository: IRdmSettingRepository) {}

  async execute(input: ReplaceRdmSettingInput): Promise<RdmSettingEntity> {
    if (input.sumatifTypes.length === 0) {
      throw new BadRequestException(
        'Pilih minimal satu jenis penilaian untuk Sumatif',
      )
    }

    if (new Set(input.sumatifTypes).size !== input.sumatifTypes.length) {
      throw new BadRequestException('Jenis penilaian Sumatif tidak boleh ganda')
    }

    if (input.sumatifTypes.includes(input.sasType)) {
      throw new BadRequestException(
        'Jenis penilaian SAS tidak boleh juga dipakai untuk Sumatif',
      )
    }

    return this.rdmSettingRepository.replace({
      sumatifTypes: [...input.sumatifTypes],
      sasType: input.sasType,
    })
  }
}
