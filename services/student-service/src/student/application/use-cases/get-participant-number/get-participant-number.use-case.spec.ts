import { IEnrollmentRepository } from '../../../../enrollment/domain/repositories/enrollment.repository.js'
import { IParticipantNumberRepository } from '../../../domain/repositories/participant-number.repository.js'
import { GetParticipantNumberUseCase } from './get-participant-number.use-case.js'

function setup(options: {
  number?: string | null
  activeSemesterId?: string | null
}) {
  const participantRepository = {
    findByStudent: vi
      .fn()
      .mockResolvedValue(options.number ? { number: options.number } : null),
  }
  const enrollmentRepository = {
    findActiveEnrollment: vi
      .fn()
      .mockResolvedValue(
        options.activeSemesterId
          ? { classroomId: 'classroom-1', semesterId: options.activeSemesterId }
          : null,
      ),
  }
  const useCase = new GetParticipantNumberUseCase(
    participantRepository as unknown as IParticipantNumberRepository,
    enrollmentRepository as unknown as IEnrollmentRepository,
  )
  return { useCase, participantRepository, enrollmentRepository }
}

describe('GetParticipantNumberUseCase', () => {
  it('reads the number for the requested semester', async () => {
    const { useCase, participantRepository, enrollmentRepository } = setup({
      number: '241-261-08-001',
    })

    await expect(useCase.execute('student-1', 'sem-1')).resolves.toBe(
      '241-261-08-001',
    )
    expect(participantRepository.findByStudent).toHaveBeenCalledWith(
      'student-1',
      'sem-1',
    )
    expect(enrollmentRepository.findActiveEnrollment).not.toHaveBeenCalled()
  })

  it('falls back to the semester of the active enrollment', async () => {
    const { useCase, participantRepository } = setup({
      number: '241-261-08-003',
      activeSemesterId: 'sem-1',
    })

    await expect(useCase.execute('student-1')).resolves.toBe('241-261-08-003')
    expect(participantRepository.findByStudent).toHaveBeenCalledWith(
      'student-1',
      'sem-1',
    )
  })

  it('answers null when the student has no number', async () => {
    const { useCase } = setup({ activeSemesterId: 'sem-1' })

    await expect(useCase.execute('student-1')).resolves.toBeNull()
  })

  it('answers null when there is no enrollment to name a semester', async () => {
    const { useCase, participantRepository } = setup({
      number: '241-261-08-001',
    })

    await expect(useCase.execute('student-1')).resolves.toBeNull()
    expect(participantRepository.findByStudent).not.toHaveBeenCalled()
  })
})
