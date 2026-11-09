import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator'
import {
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { Public } from '@mts241alikhlash/nest-core/decorators'
import { ProvisioningTokenGuard } from '@mts241alikhlash/nest-core/guards'
import { GetParticipantNumberUseCase } from '../../application/use-cases/get-participant-number/get-participant-number.use-case.js'
import { IssueParticipantNumbersUseCase } from '../../application/use-cases/issue-participant-numbers/issue-participant-numbers.use-case.js'
import { ParticipantNumberResponseDto } from './dto/response/participant-number-response.dto.js'
import { IStudentIdentityReadPort } from '../../domain/repositories/student-identity-read.port.js'

export class StudentIdByUserDataDto {
  @ApiProperty({ type: String, nullable: true })
  studentId!: string | null
}

export class StudentIdByUserResponseDto {
  @ApiProperty({
    description: 'null when the account owns no student record',
    type: () => StudentIdByUserDataDto,
  })
  data!: StudentIdByUserDataDto
}

export class StudentIdsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids!: string[]
}

export class StudentRefDto {
  @ApiProperty() id!: string

  @ApiProperty({
    description:
      "The student's account, so the caller resolves the name against " +
      'identity-service rather than against this service.',
  })
  userId!: string

  @ApiProperty() nis!: string
}

export class StudentRefListResponseDto {
  @ApiProperty({ type: [StudentRefDto] })
  data!: StudentRefDto[]
}

export class IssueParticipantNumbersRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  semesterId!: string
}

export class IssueParticipantNumbersResponseDto {
  @ApiProperty({ description: 'How many numbers this call created' })
  issued!: number

  @ApiProperty({
    type: [String],
    description: 'Students without a grade level, so they got no number',
  })
  skipped!: string[]
}

@ApiTags('Students')
@Public()
@UseGuards(ProvisioningTokenGuard)
@Controller('students')
export class StudentInternalController {
  constructor(
    private readonly studentIdentityRead: IStudentIdentityReadPort,
    private readonly getParticipantNumber: GetParticipantNumberUseCase,
    private readonly issueNumbers: IssueParticipantNumbersUseCase,
  ) {}

  @Post('by-ids')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Students for a batch of ids',
    description:
      'academic-service holds the four class officers as ids on a ' +
      'classroom structure and renders a name and a NIS beside each. Ids ' +
      'that match nothing are absent from the response rather than returned ' +
      'as null.',
  })
  @ApiResponse({ status: 200, type: StudentRefListResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid provisioning token',
  })
  async byIds(@Body() dto: StudentIdsDto): Promise<StudentRefListResponseDto> {
    const rows = await this.studentIdentityRead.listRefsByIds(dto.ids)
    return {
      data: rows.map(({ id, userId, nis }) => ({ id, userId, nis })),
    }
  }

  @Post('participant-numbers/issue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue the missing participant numbers of a semester',
    description:
      'exam-service calls this after creating an activity so its students ' +
      'already have a number. Idempotent: students that have one are kept.',
  })
  @ApiResponse({ status: 200, type: IssueParticipantNumbersResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid provisioning token',
  })
  async issueParticipantNumbers(
    @Body() dto: IssueParticipantNumbersRequestDto,
  ): Promise<IssueParticipantNumbersResponseDto> {
    return this.issueNumbers.execute(dto.semesterId)
  }

  @Get('by-user/:userId')
  @ApiOperation({ summary: 'Resolve an account to its student record' })
  @ApiResponse({ status: 200, type: StudentIdByUserResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid provisioning token',
  })
  async byUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<StudentIdByUserResponseDto> {
    return {
      data: {
        studentId: await this.studentIdentityRead.findStudentIdByUserId(userId),
      },
    }
  }

  @Get('by-id/:studentId/participant-number')
  @ApiOperation({
    summary: 'A student’s participant number, for service callers',
    description:
      'exam-service projects the number into a student’s exam list, so it ' +
      'cannot use the account-token route. Null when no number was issued.',
  })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiQuery({ name: 'semesterId', required: false, format: 'uuid' })
  @ApiResponse({ status: 200, type: ParticipantNumberResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid provisioning token',
  })
  async participantNumber(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('semesterId', new ParseUUIDPipe({ optional: true }))
    semesterId?: string,
  ): Promise<ParticipantNumberResponseDto> {
    return ParticipantNumberResponseDto.fromDomain(
      await this.getParticipantNumber.execute(studentId, semesterId),
    )
  }
}
