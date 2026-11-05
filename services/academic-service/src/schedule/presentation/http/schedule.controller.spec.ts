import { Test, TestingModule } from '@nestjs/testing'
import { DayEnum as Day } from '@mts241alikhlash/nest-core/domain'
import { CreateScheduleDto } from './dto/request/create-schedule.dto.js'
import { UpdateScheduleDto } from './dto/request/update-schedule.dto.js'
import { CreateScheduleUseCase } from '../../application/use-cases/create-schedule/create-schedule.use-case.js'
import { DeleteScheduleUseCase } from '../../application/use-cases/delete-schedule/delete-schedule.use-case.js'
import { GetScheduleByIdUseCase } from '../../application/use-cases/get-schedule-by-id/get-schedule-by-id.use-case.js'
import { GetSchedulesUseCase } from '../../application/use-cases/get-schedules/get-schedules.use-case.js'
import { GetMyScheduleUseCase } from '../../application/use-cases/get-my-schedule/get-my-schedule.use-case.js'
import { GetSchedulesByClassroomUseCase } from '../../application/use-cases/get-schedules-by-classroom/get-schedules-by-classroom.use-case.js'
import { UpdateScheduleUseCase } from '../../application/use-cases/update-schedule/update-schedule.use-case.js'
import { BatchUpsertScheduleUseCase } from '../../application/use-cases/batch-upsert-schedule/batch-upsert-schedule.use-case.js'
import { ScheduleController } from './schedule.controller.js'

describe('ScheduleController', () => {
  let controller: ScheduleController

  const mockGetAll = { execute: vi.fn() }
  const mockGetById = { execute: vi.fn() }
  const mockGetByClassroom = { execute: vi.fn() }
  const mockCreate = { execute: vi.fn() }
  const mockUpdate = { execute: vi.fn() }
  const mockDelete = { execute: vi.fn() }
  const mockBatchUpsert = { execute: vi.fn() }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [
        { provide: GetSchedulesUseCase, useValue: mockGetAll },
        { provide: GetMyScheduleUseCase, useValue: { execute: vi.fn() } },
        { provide: GetScheduleByIdUseCase, useValue: mockGetById },
        {
          provide: GetSchedulesByClassroomUseCase,
          useValue: mockGetByClassroom,
        },
        { provide: CreateScheduleUseCase, useValue: mockCreate },
        { provide: UpdateScheduleUseCase, useValue: mockUpdate },
        { provide: DeleteScheduleUseCase, useValue: mockDelete },
        { provide: BatchUpsertScheduleUseCase, useValue: mockBatchUpsert },
      ],
    }).compile()

    controller = module.get<ScheduleController>(ScheduleController)
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('findAll', () => {
    it('should delegate to GetSchedulesUseCase', async () => {
      mockGetAll.execute.mockResolvedValue({ data: [] })
      const result = await controller.findAll({ page: 1, limit: 10 })
      expect(mockGetAll.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      })
      expect(result).toEqual({ data: [] })
    })
  })

  describe('findByClassroom', () => {
    it('should delegate to GetSchedulesByClassroomUseCase', async () => {
      mockGetByClassroom.execute.mockResolvedValue([])
      const result = await controller.findByClassroom('cls-1')
      expect(mockGetByClassroom.execute).toHaveBeenCalledWith('cls-1')
      expect(result).toEqual([])
    })
  })

  describe('batchUpsert', () => {
    it('should delegate to BatchUpsertScheduleUseCase', async () => {
      mockBatchUpsert.execute.mockResolvedValue({
        created: 0,
        day: Day.MONDAY,
      })
      const result = await controller.batchUpsert('cls-1', {
        day: Day.MONDAY,
        lessons: [],
      })
      expect(mockBatchUpsert.execute).toHaveBeenCalledWith('cls-1', {
        day: Day.MONDAY,
        lessons: [],
      })
      expect(result).toEqual({ created: 0, day: Day.MONDAY })
    })
  })

  describe('findOne', () => {
    it('should delegate to GetScheduleByIdUseCase', async () => {
      mockGetById.execute.mockResolvedValue({ id: 'sch-1' })
      const result = await controller.findOne('sch-1')
      expect(mockGetById.execute).toHaveBeenCalledWith('sch-1')
      expect(result).toEqual({ id: 'sch-1' })
    })
  })

  describe('create', () => {
    it('should delegate to CreateScheduleUseCase', async () => {
      const dto: CreateScheduleDto = {
        teachingAssignmentId: 'ta-1',
        timeSlotId: 'ts-1',
        day: Day.MONDAY,
      }
      mockCreate.execute.mockResolvedValue({ id: 'new' })
      await controller.create(dto)
      expect(mockCreate.execute).toHaveBeenCalledWith(dto)
    })
  })

  describe('update', () => {
    it('should delegate to UpdateScheduleUseCase', async () => {
      const dto: UpdateScheduleDto = { day: Day.TUESDAY }
      mockUpdate.execute.mockResolvedValue({ id: 'sch-1' })
      await controller.update('sch-1', dto)
      expect(mockUpdate.execute).toHaveBeenCalledWith('sch-1', dto)
    })
  })

  describe('remove', () => {
    it('should delegate to DeleteScheduleUseCase', async () => {
      mockDelete.execute.mockResolvedValue(undefined)
      await controller.remove('sch-1')
      expect(mockDelete.execute).toHaveBeenCalledWith('sch-1')
    })
  })
})
