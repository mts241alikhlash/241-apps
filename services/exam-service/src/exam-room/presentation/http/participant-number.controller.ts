import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import {
  RequireAnyPermission,
  RequirePermissions,
} from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { IssueSemesterParticipantNumbersUseCase } from '../../application/use-cases/issue-semester-participant-numbers/issue-semester-participant-numbers.use-case.js'
import { LookupParticipantNumbersUseCase } from '../../application/use-cases/lookup-participant-numbers/lookup-participant-numbers.use-case.js'
import {
  IssueSemesterNumbersBodyDto,
  IssueSemesterNumbersResponseDto,
  LookupParticipantNumbersBodyDto,
  LookupParticipantNumbersResponseDto,
} from './dto/participant-number.dto.js'

@ApiTags('Exam Participant Numbers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam-participant-numbers')
export class ExamParticipantNumberController {
  constructor(
    private readonly issueNumbers: IssueSemesterParticipantNumbersUseCase,
    private readonly lookupNumbers: LookupParticipantNumbersUseCase,
  ) {}

  @Post('issue')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('exam-events.manage')
  @ApiOperation({
    summary: 'Issue the missing participant numbers of a semester',
  })
  @ApiResponse({ status: 200, type: IssueSemesterNumbersResponseDto })
  issue(
    @Body() dto: IssueSemesterNumbersBodyDto,
  ): Promise<IssueSemesterNumbersResponseDto> {
    return this.issueNumbers.execute(dto.semesterId)
  }

  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @RequireAnyPermission(
    'exam-events.manage',
    'exam-events.read',
    'exam-grading.read',
    'exam-grading.read-all',
    'exam-grading.manage-all',
  )
  @ApiOperation({
    summary: 'Participant numbers of many students in one semester',
  })
  @ApiResponse({ status: 200, type: LookupParticipantNumbersResponseDto })
  lookup(
    @Body() dto: LookupParticipantNumbersBodyDto,
  ): Promise<LookupParticipantNumbersResponseDto> {
    return this.lookupNumbers.execute(dto.semesterId, dto.studentIds)
  }
}
