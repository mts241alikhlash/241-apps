import { randomUUID } from 'node:crypto'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ProvisioningTokenGuard } from '@mts241alikhlash/nest-core/guards'
import { GetParticipantNumberUseCase } from '../../application/use-cases/get-participant-number/get-participant-number.use-case.js'
import { IssueParticipantNumbersUseCase } from '../../application/use-cases/issue-participant-numbers/issue-participant-numbers.use-case.js'
import { ListParticipantNumbersUseCase } from '../../application/use-cases/list-participant-numbers/list-participant-numbers.use-case.js'
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

  function lookup(body: unknown) {
    return fetch(`${baseUrl}/students/participant-numbers/lookup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('answers the wrapped list for a valid call', async () => {
    const semesterId = randomUUID()
    const studentId = randomUUID()
    listParticipantNumbers.execute.mockResolvedValue([
      { studentId, number: '241-261-08-001' },
    ])

    const response = await lookup({
      semesterId,
      studentIds: [studentId, randomUUID()],
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

  it('accepts exactly 500 ids', async () => {
    const ids = Array.from({ length: 500 }, () => randomUUID())
    listParticipantNumbers.execute.mockResolvedValue([])

    const response = await lookup({ semesterId: randomUUID(), studentIds: ids })

    expect(response.status).toBe(200)
    expect(listParticipantNumbers.execute).toHaveBeenCalledWith(
      ids,
      expect.any(String),
    )
  })

  it('refuses more than 500 ids', async () => {
    const response = await lookup({
      semesterId: randomUUID(),
      studentIds: Array.from({ length: 501 }, () => randomUUID()),
    })

    expect(response.status).toBe(400)
    expect(listParticipantNumbers.execute).not.toHaveBeenCalled()
  })

  it('refuses an empty id list', async () => {
    const response = await lookup({ semesterId: randomUUID(), studentIds: [] })

    expect(response.status).toBe(400)
    expect(listParticipantNumbers.execute).not.toHaveBeenCalled()
  })

  it('refuses a non-uuid id', async () => {
    const response = await lookup({
      semesterId: randomUUID(),
      studentIds: [randomUUID(), 'not-a-uuid'],
    })

    expect(response.status).toBe(400)
    expect(listParticipantNumbers.execute).not.toHaveBeenCalled()
  })

  it('refuses a missing semesterId', async () => {
    const response = await lookup({ studentIds: [randomUUID()] })

    expect(response.status).toBe(400)
    expect(listParticipantNumbers.execute).not.toHaveBeenCalled()
  })

  it('refuses a missing studentIds', async () => {
    const response = await lookup({ semesterId: randomUUID() })

    expect(response.status).toBe(400)
    expect(listParticipantNumbers.execute).not.toHaveBeenCalled()
  })
})
