import {
  StudentAccountStatusResponseDto,
  StudentCreatedResponseDto,
  StudentListResponseDto,
  StudentResponseDto,
} from './dto/response/student-response.dto.js'
import { MyClassroomResponseDto } from './dto/response/my-classroom-response.dto.js'
import { ParticipantNumberResponseDto } from './dto/response/participant-number-response.dto.js'
import { GetMyClassroomUseCase } from '../../application/use-cases/get-my-classroom/get-my-classroom.use-case.js'
import { GetParticipantNumberUseCase } from '../../application/use-cases/get-participant-number/get-participant-number.use-case.js'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import type { AuthenticatedUser } from '@mts241alikhlash/nest-core/types'
import type { RequestUser } from '@mts241alikhlash/nest-core/types'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { CreateStudentDto } from './dto/request/create-student.dto.js'
import { StudentQueryDto } from './dto/request/student-query.dto.js'
import { UpdateStudentDto } from './dto/request/update-student.dto.js'
import { CreateStudentUseCase } from '../../application/use-cases/create-student/create-student.use-case.js'
import { CreateStudentWithRelationsUseCase } from '../../application/use-cases/create-student-with-relations/create-student-with-relations.use-case.js'
import { DeleteStudentUseCase } from '../../application/use-cases/delete-student/delete-student.use-case.js'
import { GetStudentByIdUseCase } from '../../application/use-cases/get-student-by-id/get-student-by-id.use-case.js'
import { GetMyStudentUseCase } from '../../application/use-cases/get-my-student/get-my-student.use-case.js'
import { GetStudentsUseCase } from '../../application/use-cases/get-students/get-students.use-case.js'
import { ToggleStudentActiveUseCase } from '../../application/use-cases/toggle-student-active/toggle-student-active.use-case.js'
import { UpdateStudentUseCase } from '../../application/use-cases/update-student/update-student.use-case.js'
import { CreateStudentWithRelationsDto } from './dto/request/create-student-with-relations.dto.js'
import { EnrollExistingAccountDto } from './dto/request/enroll-existing-account.dto.js'
import { EnrollExistingAccountResponseDto } from './dto/response/enroll-existing-account-response.dto.js'
import { EnrollExistingAccountUseCase } from '../../application/use-cases/enroll-existing-account/enroll-existing-account.use-case.js'
import { IStudentIdentityReadPort } from '../../domain/repositories/student-identity-read.port.js'

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentController {
  constructor(
    private readonly getStudentsService: GetStudentsUseCase,
    private readonly getStudentByIdService: GetStudentByIdUseCase,
    private readonly getMyStudentService: GetMyStudentUseCase,
    private readonly getMyClassroomService: GetMyClassroomUseCase,
    private readonly getParticipantNumberService: GetParticipantNumberUseCase,
    private readonly studentIdentityRead: IStudentIdentityReadPort,
    private readonly createStudentService: CreateStudentUseCase,
    private readonly createStudentWithRelationsService: CreateStudentWithRelationsUseCase,
    private readonly updateStudentService: UpdateStudentUseCase,
    private readonly deleteStudentService: DeleteStudentUseCase,
    private readonly toggleStudentActiveService: ToggleStudentActiveUseCase,
    private readonly enrollExistingAccountService: EnrollExistingAccountUseCase,
  ) {}

  @Post('enroll')
  @RequirePermissions('students.create')
  @ApiOperation({
    summary: 'Enroll an existing account as a student (admission handover)',
  })
  @ApiResponse({
    status: 201,
    description: 'The student, whether created now or already present',
    type: EnrollExistingAccountResponseDto,
  })
  @ApiResponse({ status: 409, description: 'NIS or NISN already in use' })
  async enroll(
    @Body() dto: EnrollExistingAccountDto,
  ): Promise<EnrollExistingAccountResponseDto> {
    return EnrollExistingAccountResponseDto.fromDomain(
      await this.enrollExistingAccountService.execute(dto),
    )
  }

  @Get()
  @RequirePermissions('students.read')
  @ApiOperation({ summary: 'List all students (paginated, searchable)' })
  @ApiResponse({ status: 200, type: StudentListResponseDto })
  async findAll(
    @Query() query: StudentQueryDto,
  ): Promise<StudentListResponseDto> {
    return StudentListResponseDto.fromDomain(
      await this.getStudentsService.execute(query),
    )
  }

  @Get('me')
  @RequirePermissions('students.read-own')
  @ApiOperation({
    summary: 'Your own student record — no id parameter exists',
  })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  @ApiResponse({ status: 404, description: 'Not linked to a student record' })
  async findMine(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StudentResponseDto> {
    return StudentResponseDto.fromDomain(
      await this.getMyStudentService.execute(user.id),
    )
  }

  @Get('me/classroom')
  @RequirePermissions('classrooms.read-own')
  @ApiOperation({
    summary: 'The classroom you are enrolled in — no id parameter exists',
  })
  @ApiResponse({
    status: 200,
    description:
      'Your classroom, or null when you have no enrollment this term',
    type: MyClassroomResponseDto,
  })
  async findMyClassroom(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyClassroomResponseDto | null> {
    const classroom = await this.getMyClassroomService.execute(user.id)
    return classroom ? MyClassroomResponseDto.fromDomain(classroom) : null
  }

  @Get('me/participant-number')
  @RequirePermissions('students.read-own')
  @ApiOperation({
    summary: 'Your participant number — no id parameter exists',
    description:
      'The semester is the one your active enrollment belongs to; null ' +
      'when you have no enrollment or the registry has no number for it.',
  })
  @ApiResponse({
    status: 200,
    description: 'Your participant number, or null',
    type: ParticipantNumberResponseDto,
  })
  async findMyParticipantNumber(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ParticipantNumberResponseDto> {
    const studentId = await this.studentIdentityRead.findStudentIdByUserId(
      user.id,
    )
    if (!studentId) return ParticipantNumberResponseDto.fromDomain(null)
    return ParticipantNumberResponseDto.fromDomain(
      await this.getParticipantNumberService.execute(studentId),
    )
  }

  @Get(':id/participant-number')
  @RequirePermissions('students.read')
  @ApiOperation({
    summary: 'A student’s participant number for a semester',
    description:
      'Defaults to the semester of the student’s active enrollment when ' +
      'semesterId is omitted.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({ name: 'semesterId', required: false, format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'The number, or null when none was issued',
    type: ParticipantNumberResponseDto,
  })
  async findParticipantNumber(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('semesterId', new ParseUUIDPipe({ optional: true }))
    semesterId?: string,
  ): Promise<ParticipantNumberResponseDto | null> {
    return ParticipantNumberResponseDto.fromDomain(
      await this.getParticipantNumberService.execute(id, semesterId),
    )
  }

  @Get(':id')
  @RequirePermissions('students.read')
  @ApiOperation({ summary: 'Get a student by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StudentResponseDto> {
    const reqUser: RequestUser = { id: user.id }
    return StudentResponseDto.fromDomain(
      await this.getStudentByIdService.execute(id, reqUser),
    )
  }

  @Post()
  @RequirePermissions('students.create')
  @ApiOperation({ summary: 'Create a new student (User + Profile + Student)' })
  @ApiResponse({ status: 201, type: StudentCreatedResponseDto })
  @ApiResponse({ status: 404, description: 'Active semester not found' })
  @ApiResponse({ status: 409, description: 'Duplicate NIS or NISN' })
  async create(
    @Body() dto: CreateStudentDto,
  ): Promise<StudentCreatedResponseDto> {
    return StudentCreatedResponseDto.fromDomain(
      await this.createStudentService.execute(dto),
    )
  }

  @Post('with-relations')
  @RequirePermissions('students.create')
  @ApiOperation({
    summary:
      'Create a student with address and parents atomically (single transaction)',
  })
  @ApiResponse({ status: 201, type: StudentResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Duplicate NIS, NISN, or parent NIK',
  })
  async createWithRelations(
    @Body() dto: CreateStudentWithRelationsDto,
  ): Promise<StudentResponseDto> {
    return StudentResponseDto.fromDomain(
      await this.createStudentWithRelationsService.execute(dto),
    )
  }

  @Patch(':id')
  @RequirePermissions('students.update')
  @ApiOperation({ summary: 'Update student master data (NIS, NISN, status)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 409, description: 'Duplicate NIS or NISN' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ): Promise<StudentResponseDto> {
    return StudentResponseDto.fromDomain(
      await this.updateStudentService.execute(id, dto),
    )
  }

  @Delete(':id')
  @RequirePermissions('students.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a student (also deactivates User)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Student deleted' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteStudentService.execute(id)
  }

  @Patch(':id/toggle-active')
  @RequirePermissions('students.update')
  @ApiOperation({
    summary: 'Activate or deactivate a student account (without deleting)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    type: StudentAccountStatusResponseDto,
    status: 200,
    description: 'Account status updated',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('isActive', new ParseBoolPipe()) isActive: boolean,
  ): Promise<StudentAccountStatusResponseDto> {
    return StudentAccountStatusResponseDto.fromDomain(
      await this.toggleStudentActiveService.execute(id, isActive),
    )
  }
}
