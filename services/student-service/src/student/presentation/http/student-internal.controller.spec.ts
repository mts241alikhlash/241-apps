import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ProvisioningTokenGuard } from '@mts241alikhlash/nest-core/guards'
import { GetParticipantNumberUseCase } from '../../application/use-cases/get-participant-number/get-participant-number.use-case.js'
import { IssueParticipantNumbersUseCase } from '../../application/use-cases/issue-participant-numbers/issue-participant-numbers.use-case.js'
import { ListParticipantNumbersUseCase } from '../../application/use-cases/list-participant-numbers/list-participant-numbers.use-case.js'
import { ListParticipantNumbersQueryDto } from './dto/request/list-participant-numbers-query.dto.js'
import { IStudentIdentityReadPort } from '../../domain/repositories/student-identity-read.port.js'
import { StudentInternalController } from './student-internal.controller.js'

describe('StudentInternalController bulk participant numbers', () => {
  let app: INestApplication
  let baseUrl: string
  const listParticipantNumbers = { execute: vi.fn() }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StudentInternalController],
      providers: [
        { provide: IStudentIdentityReadPort, useValue: {} },
        { provide: GetParticipantNumberUseCase, useValue: {} },
        { provide: IssueParticipantNumbersUseCase, useValue: {} },
        {
          provide: ListParticipantNumbersUseCase,
          useValue: listParticipantNumbers,
        },
      ],
    })
      .overrideGuard(ProvisioningTokenGuard)
      .useValue({ canActivate: () => true })
      .compile()

    app = moduleRef.createNestApplication({ logger: false })
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    await app.listen(0, '127.0.0.1')
    baseUrl = await app.getUrl()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    listParticipantNumbers.execute.mockReset()
  })

  function get(params: Record<string, string>) {
    return fetch(
      `${baseUrl}/students/participant-numbers?${new URLSearchParams(params)}`,
    )
  }

  it('answers the wrapped list for a valid call', async () => {
    const semesterId = randomUUID()
    const studentId = randomUUID()
    listParticipantNumbers.execute.mockResolvedValue([
      { studentId, number: '241-261-08-001' },
    ])

    const response = await get({
      semesterId,
      studentIds: `${studentId}, ${randomUUID()}`,
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: [{ studentId, number: '241-261-08-001' }],
    })
    expect(listParticipantNumbers.execute).toHaveBeenCalledWith(
      expect.arrayContaining([studentId]),
      semesterId,
    )
  })

  it('splits the comma list into trimmed ids', async () => {
    const semesterId = randomUUID()
    const first = randomUUID()
    const second = randomUUID()
    listParticipantNumbers.execute.mockResolvedValue([])

    await get({ semesterId, studentIds: `${first} ,${second}` })

    expect(listParticipantNumbers.execute).toHaveBeenCalledWith(
      [first, second],
      semesterId,
    )
  })

  it('refuses more than 500 ids', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
    const ids = Array.from({ length: 501 }, () => randomUUID())

    await expect(
      pipe.transform(
        { semesterId: randomUUID(), studentIds: ids.join(',') },
        { type: 'query', metatype: ListParticipantNumbersQueryDto },
      ),
    ).rejects.toThrow(BadRequestException)
    expect(listParticipantNumbers.execute).not.toHaveBeenCalled()
  })

  it('refuses a non-uuid id', async () => {
    const response = await get({
      semesterId: randomUUID(),
      studentIds: `${randomUUID()},not-a-uuid`,
    })

    expect(response.status).toBe(400)
    expect(listParticipantNumbers.execute).not.toHaveBeenCalled()
  })

  it('refuses a missing semesterId', async () => {
    const response = await get({ studentIds: randomUUID() })

    expect(response.status).toBe(400)
    expect(listParticipantNumbers.execute).not.toHaveBeenCalled()
  })

  it('refuses a missing studentIds', async () => {
    const response = await get({ semesterId: randomUUID() })

    expect(response.status).toBe(400)
    expect(listParticipantNumbers.execute).not.toHaveBeenCalled()
  })
})
