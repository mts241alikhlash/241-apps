import { Injectable } from '@nestjs/common'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import { PrismaService } from '../../core/database/prisma.service.js'
import {
  IRdmSettingRepository,
  RdmSettingEntity,
} from '../domain/rdm-setting.js'

const RDM_SETTING_ID = 1

const DEFAULT_RDM_SETTING: RdmSettingEntity = {
  sumatifTypes: [
    AssessmentType.DAILY,
    AssessmentType.ASSIGNMENT,
    AssessmentType.PRACTICAL,
    AssessmentType.MIDTERM,
  ],
  sasType: AssessmentType.FINAL,
}

function toEntity(row: {
  sumatifTypes: (keyof typeof AssessmentType)[]
  sasType: keyof typeof AssessmentType
}): RdmSettingEntity {
  return {
    sumatifTypes: row.sumatifTypes.map((type) => AssessmentType[type]),
    sasType: AssessmentType[row.sasType],
  }
}

@Injectable()
export class PrismaRdmSettingRepository extends IRdmSettingRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async get(): Promise<RdmSettingEntity> {
    const row = await this.prisma.rdmSetting.findUnique({
      where: { id: RDM_SETTING_ID },
      select: { sumatifTypes: true, sasType: true },
    })
    return row ? toEntity(row) : DEFAULT_RDM_SETTING
  }

  async replace(input: RdmSettingEntity): Promise<RdmSettingEntity> {
    const row = await this.prisma.rdmSetting.upsert({
      where: { id: RDM_SETTING_ID },
      create: {
        id: RDM_SETTING_ID,
        sumatifTypes: input.sumatifTypes,
        sasType: input.sasType,
      },
      update: {
        sumatifTypes: input.sumatifTypes,
        sasType: input.sasType,
      },
      select: { sumatifTypes: true, sasType: true },
    })
    return toEntity(row)
  }
}
