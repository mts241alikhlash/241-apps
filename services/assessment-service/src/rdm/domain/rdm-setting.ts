import type { AssessmentType } from '@mts241alikhlash/nest-core/domain'

export interface RdmSettingEntity {
  sumatifTypes: AssessmentType[]
  sasType: AssessmentType
}

export abstract class IRdmSettingRepository {
  abstract get(): Promise<RdmSettingEntity>

  abstract replace(input: RdmSettingEntity): Promise<RdmSettingEntity>
}
