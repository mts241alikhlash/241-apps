import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator'

const raw =
  (key: string) =>
  ({ obj }: { obj: unknown }): unknown =>
    (obj as Record<string, unknown>)[key]

export class SaveOfflineScoreDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'From 0 up to the maximum score of the activity, at most two decimals; null clears the score',
  })
  @Transform(raw('rawScore'))
  @ValidateIf((dto: SaveOfflineScoreDto) => dto.rawScore !== null)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  rawScore!: number | null

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 300,
    description:
      'Omitted keeps the stored note; null or an empty string clears it',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string | null
}

export class RequestOfflinePublicationDto {
  @ApiPropertyOptional({
    description: 'Send even when some students have no score yet',
  })
  @Transform(raw('confirmMissing'))
  @IsOptional()
  @IsBoolean()
  confirmMissing?: boolean
}
