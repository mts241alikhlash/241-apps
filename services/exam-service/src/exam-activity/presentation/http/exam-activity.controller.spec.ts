import { describe, expect, it, vi } from 'vitest'
import type { CreateActivityUseCase } from '../../application/use-cases/create-activity/create-activity.use-case.js'
import type { IssueParticipantNumbersUseCase } from '../../application/use-cases/issue-participant-numbers/issue-participant-numbers.use-case.js'
import type { ListActivitiesUseCase } from '../../application/use-cases/list-activities/list-activities.use-case.js'
import type { UpdateActivityStatusUseCase } from '../../application/use-cases/update-activity-status/update-activity-status.use-case.js'
import type {
  RotateActivityTokenUseCase,
  UpdateActivityPolicyUseCase,
} from '../../application/use-cases/update-activity-policy/update-activity-policy.use-case.js'
import { ExamActivityController } from './exam-activity.controller.js'

const issue = vi.fn()

const controller = new ExamActivityController(
  {} as CreateActivityUseCase,
  {} as ListActivitiesUseCase,
  {} as UpdateActivityStatusUseCase,
  {} as UpdateActivityPolicyUseCase,
  {} as RotateActivityTokenUseCase,
  { execute: issue } as unknown as IssueParticipantNumbersUseCase,
)

describe('ExamActivityController issueNumbers', () => {
  it('answers whether the registry issued the numbers', async () => {
    issue.mockResolvedValueOnce({ issued: true })

    await expect(controller.issueNumbers('activity-1')).resolves.toEqual({
      issued: true,
    })
    expect(issue).toHaveBeenCalledWith('activity-1')
  })
})
