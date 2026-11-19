import { IParticipantNumberRepository } from '../../../domain/repositories/participant-number.repository.js'
import { ListParticipantNumbersUseCase } from './list-participant-numbers.use-case.js'

function setup(rows: { studentId: string; number: string }[] = []) {
  const participantRepository = {
    findByStudents: vi.fn().mockResolvedValue(rows),
  }
  const useCase = new ListParticipantNumbersUseCase(
    participantRepository as unknown as IParticipantNumberRepository,
  )
  return { useCase, participantRepository }
}

describe('ListParticipantNumbersUseCase', () => {
  it('answers only the students that have a number in the semester', async () => {
    const { useCase, participantRepository } = setup([
      { studentId: 'student-1', number: '241-261-08-001' },
    ])

    await expect(
      useCase.execute(['student-1', 'student-2'], 'sem-1'),
    ).resolves.toEqual([{ studentId: 'student-1', number: '241-261-08-001' }])
    expect(participantRepository.findByStudents).toHaveBeenCalledWith(
      ['student-1', 'student-2'],
      'sem-1',
    )
  })

  it('answers an empty list without asking the repository for an empty id list', async () => {
    const { useCase, participantRepository } = setup()

    await expect(useCase.execute([], 'sem-1')).resolves.toEqual([])
    expect(participantRepository.findByStudents).not.toHaveBeenCalled()
  })
})
