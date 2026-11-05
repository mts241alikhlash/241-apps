import { readFileSync } from 'node:fs'
import type { PrismaService } from '../../../../../core/database/prisma.service.js'
import { PrismaApprovalRepository } from './prisma-approval.repository.js'

describe('PrismaApprovalRepository', () => {
  const repository = (prisma: PrismaService) =>
    new PrismaApprovalRepository(prisma)

  it('uses only approval-owned Prisma models', () => {
    const source = [
      'prisma-approval.repository.ts',
      'prisma-approval.queries.ts',
      'prisma-approval.writer.ts',
      'prisma-approval.transition.ts',
    ]
      .map((file) =>
        readFileSync(
          `src/inventory/approval/infrastructure/persistence/prisma/${file}`,
          'utf8',
        ),
      )
      .join('\n')

    expect(source).not.toMatch(
      /inventoryLoan|inventoryLoanItem|inventoryAssetUnit|inventoryHistory|inventoryStatus|inventoryTransactionType|moveUnitsAndRecord|IAssetUnitMutationPort|IHistoryCapabilityPort/,
    )
  })

  const dates = {
    workflowCreated: new Date('2026-09-14T00:00:00.000Z'),
    workflowUpdated: new Date('2026-09-14T01:00:00.000Z'),
    stepCreated: new Date('2026-09-14T00:01:00.000Z'),
    instanceCreated: new Date('2026-09-14T00:02:00.000Z'),
    instanceUpdated: new Date('2026-09-14T01:02:00.000Z'),
    logCreated: new Date('2026-09-14T00:03:00.000Z'),
  }

  const workflowRow = {
    id: 'workflow-1',
    name: 'Loan approval',
    targetEntity: 'InventoryLoan',
    description: 'Approval chain',
    isActive: true,
    createdAt: dates.workflowCreated,
    updatedAt: dates.workflowUpdated,
    steps: [
      {
        id: 'step-1',
        workflowId: 'workflow-1',
        stepSequence: 1,
        approverRoleCode: 'ADMIN',
        isMandatory: true,
        createdAt: dates.stepCreated,
        ignored: 'not exposed',
      },
    ],
  }

  const instanceRow = {
    id: 'instance-1',
    workflowId: 'workflow-1',
    referenceId: 'loan-1',
    statusId: 'status-pending',
    currentStepSequence: 1,
    createdAt: dates.instanceCreated,
    updatedAt: dates.instanceUpdated,
    workflow: workflowRow,
    logs: [
      {
        id: 'log-1',
        instanceId: 'instance-1',
        stepSequence: 1,
        approverId: 'user-1',
        actionId: 'action-approve',
        note: 'Checked',
        createdAt: dates.logCreated,
        consequenceType: 'NONE',
        consequenceStatus: 'NOT_REQUIRED',
        consequenceError: null,
        consequenceUpdatedAt: dates.logCreated,
        ignored: 'not exposed',
      },
    ],
  }

  it('maps workflow and step fields explicitly', async () => {
    const findMany = vi.fn().mockResolvedValue([workflowRow])
    const prisma = {
      approvalWorkflow: { findMany },
    } as unknown as PrismaService

    await expect(repository(prisma).findAllWorkflows()).resolves.toEqual([
      {
        id: 'workflow-1',
        name: 'Loan approval',
        targetEntity: 'InventoryLoan',
        description: 'Approval chain',
        isActive: true,
        createdAt: dates.workflowCreated,
        updatedAt: dates.workflowUpdated,
        steps: [
          {
            id: 'step-1',
            workflowId: 'workflow-1',
            stepSequence: 1,
            approverRoleCode: 'ADMIN',
            isMandatory: true,
            createdAt: dates.stepCreated,
          },
        ],
      },
    ])
    expect(findMany).toHaveBeenCalledWith({
      include: expect.any(Object),
      orderBy: { name: 'asc' },
    })
  })

  it('maps instance and log relations explicitly', async () => {
    const findUnique = vi.fn().mockResolvedValue(instanceRow)
    const prisma = {
      approvalInstance: { findUnique },
    } as unknown as PrismaService

    await expect(
      repository(prisma).findInstanceById('instance-1'),
    ).resolves.toEqual({
      id: 'instance-1',
      workflowId: 'workflow-1',
      referenceId: 'loan-1',
      statusId: 'status-pending',
      currentStepSequence: 1,
      createdAt: dates.instanceCreated,
      updatedAt: dates.instanceUpdated,
      workflow: {
        id: 'workflow-1',
        name: 'Loan approval',
        targetEntity: 'InventoryLoan',
        description: 'Approval chain',
        isActive: true,
        createdAt: dates.workflowCreated,
        updatedAt: dates.workflowUpdated,
        steps: [
          {
            id: 'step-1',
            workflowId: 'workflow-1',
            stepSequence: 1,
            approverRoleCode: 'ADMIN',
            isMandatory: true,
            createdAt: dates.stepCreated,
          },
        ],
      },
      logs: [
        {
          id: 'log-1',
          instanceId: 'instance-1',
          stepSequence: 1,
          approverId: 'user-1',
          actionId: 'action-approve',
          note: 'Checked',
          createdAt: dates.logCreated,
          consequenceType: 'NONE',
          consequenceStatus: 'NOT_REQUIRED',
          consequenceError: null,
          consequenceUpdatedAt: dates.logCreated,
        },
      ],
    })
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'instance-1' },
      include: expect.any(Object),
    })
  })

  it('maps workflow creation and instance/log writes explicitly', async () => {
    const createdWorkflow = vi.fn().mockResolvedValue(workflowRow)
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const createLog = vi.fn().mockResolvedValue(instanceRow.logs[0])
    const updateInstance = vi.fn().mockResolvedValue(instanceRow)
    const transaction = vi.fn((callback: (tx: unknown) => unknown) =>
      callback({
        approvalWorkflow: { updateMany, create: createdWorkflow },
      }),
    )
    const prisma = {
      $transaction: transaction,
      approvalLog: { create: createLog },
      approvalInstance: { update: updateInstance },
    } as unknown as PrismaService
    const approvalRepository = repository(prisma)

    await approvalRepository.createWorkflow({
      name: 'Loan approval',
      targetEntity: 'InventoryLoan',
      description: 'Approval chain',
      steps: [{ stepSequence: 1, approverRoleCode: 'ADMIN' }],
    })
    await approvalRepository.updateInstance('instance-1', {
      statusId: 'status-approved',
      currentStepSequence: 2,
    })
    await approvalRepository.createLog({
      instanceId: 'instance-1',
      stepSequence: 1,
      approverId: 'user-1',
      actionId: 'action-approve',
      note: 'Checked',
    })

    expect(updateMany).toHaveBeenCalledWith({
      where: { targetEntity: 'InventoryLoan', isActive: true },
      data: { isActive: false },
    })
    expect(createdWorkflow).toHaveBeenCalledWith({
      data: {
        name: 'Loan approval',
        targetEntity: 'InventoryLoan',
        description: 'Approval chain',
        steps: {
          create: [
            { stepSequence: 1, approverRoleCode: 'ADMIN', isMandatory: true },
          ],
        },
      },
      include: expect.any(Object),
    })
    expect(updateInstance).toHaveBeenCalledWith({
      where: { id: 'instance-1' },
      data: { statusId: 'status-approved', currentStepSequence: 2 },
    })
    expect(createLog).toHaveBeenCalledWith({
      data: {
        instanceId: 'instance-1',
        stepSequence: 1,
        approverId: 'user-1',
        actionId: 'action-approve',
        note: 'Checked',
      },
    })
  })

  it('maps pending instances and filters by the active step role', async () => {
    const stepPairs = vi
      .fn()
      .mockResolvedValue([{ workflowId: 'workflow-1', stepSequence: 1 }])
    const candidates = [
      instanceRow,
      { ...instanceRow, id: 'instance-2', currentStepSequence: 2 },
      { ...instanceRow, id: 'instance-3', statusId: 'status-approved' },
    ]
    const findMany = vi
      .fn()
      .mockImplementation(({ where }) =>
        candidates.filter(
          (instance) =>
            instance.statusId === where.statusId &&
            where.OR.some(
              (pair: { workflowId: string; currentStepSequence: number }) =>
                pair.workflowId === instance.workflowId &&
                pair.currentStepSequence === instance.currentStepSequence,
            ),
        ),
      )
    const prisma = {
      approvalStep: { findMany: stepPairs },
      approvalInstance: { findMany },
    } as unknown as PrismaService

    await expect(
      repository(prisma).findPendingInstancesForRoles(
        ['ADMIN'],
        'status-pending',
      ),
    ).resolves.toHaveLength(1)
    expect(stepPairs).toHaveBeenCalledWith({
      where: { approverRoleCode: { in: ['ADMIN'] } },
      select: { workflowId: true, stepSequence: true },
    })
    expect(findMany).toHaveBeenCalledWith({
      where: {
        statusId: 'status-pending',
        OR: [{ workflowId: 'workflow-1', currentStepSequence: 1 }],
      },
      include: expect.any(Object),
      orderBy: { createdAt: 'desc' },
    })
  })

  it('does not filter active roles again after Prisma returns instances', async () => {
    const findStepPairs = vi
      .fn()
      .mockResolvedValue([{ workflowId: 'workflow-1', stepSequence: 1 }])
    const findMany = vi.fn().mockResolvedValue([
      {
        ...instanceRow,
        workflow: {
          ...workflowRow,
          steps: [{ ...workflowRow.steps[0], approverRoleCode: 'STAFF' }],
        },
      },
    ])
    const prisma = {
      approvalStep: { findMany: findStepPairs },
      approvalInstance: { findMany },
    } as unknown as PrismaService

    await expect(
      repository(prisma).findPendingInstancesForRoles(
        ['ADMIN'],
        'status-pending',
      ),
    ).resolves.toEqual([expect.objectContaining({ id: 'instance-1' })])
  })

  it('returns no pending instances without querying steps for empty roles', async () => {
    const findStepPairs = vi.fn()
    const findMany = vi.fn()
    const prisma = {
      approvalStep: { findMany: findStepPairs },
      approvalInstance: { findMany },
    } as unknown as PrismaService

    await expect(
      repository(prisma).findPendingInstancesForRoles([], 'status-pending'),
    ).resolves.toEqual([])
    expect(findStepPairs).not.toHaveBeenCalled()
    expect(findMany).not.toHaveBeenCalled()
  })

  it('does not read instances when no role has an exact workflow step', async () => {
    const findStepPairs = vi.fn().mockResolvedValue([])
    const findMany = vi.fn()
    const prisma = {
      approvalStep: { findMany: findStepPairs },
      approvalInstance: { findMany },
    } as unknown as PrismaService

    await expect(
      repository(prisma).findPendingInstancesForRoles(
        ['SUPER_ADMIN'],
        'status-pending',
      ),
    ).resolves.toEqual([])
    expect(findStepPairs).toHaveBeenCalledWith({
      where: { approverRoleCode: { in: ['SUPER_ADMIN'] } },
      select: { workflowId: true, stepSequence: true },
    })
    expect(findMany).not.toHaveBeenCalled()
  })

  it('propagates repository and transaction errors', async () => {
    const error = new Error('database unavailable')
    const findMany = vi.fn().mockRejectedValue(error)
    const transaction = vi.fn().mockRejectedValue(error)
    const prisma = {
      approvalWorkflow: { findMany },
      $transaction: transaction,
    } as unknown as PrismaService
    const approvalRepository = repository(prisma)

    await expect(approvalRepository.findAllWorkflows()).rejects.toBe(error)
    await expect(
      approvalRepository.processApprovalTransaction({
        instanceId: 'instance-1',
        currentStepSequence: 1,
        action: 'APPROVE',
        userId: 'user-1',
        hasNextStep: true,
        nextStepSequence: 2,
        consequenceType: 'NONE',
      }),
    ).rejects.toBe(error)
  })

  it('starts intermediate approval logs without a downstream consequence', async () => {
    const log = {
      ...instanceRow.logs[0],
      consequenceType: 'NONE',
      consequenceStatus: 'NOT_REQUIRED',
      consequenceError: null,
      consequenceUpdatedAt: dates.logCreated,
    }
    const create = vi.fn().mockResolvedValue(log)
    const update = vi.fn().mockResolvedValue(instanceRow)
    const transaction = vi.fn((callback: (tx: unknown) => unknown) =>
      callback({
        approvalLog: { create },
        approvalInstance: { update },
      }),
    )
    const prisma = { $transaction: transaction } as unknown as PrismaService

    await expect(
      repository(prisma).processApprovalTransaction({
        instanceId: 'instance-1',
        currentStepSequence: 1,
        action: 'APPROVE',
        userId: 'user-1',
        hasNextStep: true,
        nextStepSequence: 2,
        consequenceType: 'NONE',
      }),
    ).resolves.toMatchObject({
      action: 'APPROVE_STEP',
      log: {
        consequenceType: 'NONE',
        consequenceStatus: 'NOT_REQUIRED',
      },
    })
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        consequenceType: 'NONE',
        consequenceStatus: 'NOT_REQUIRED',
        consequenceError: null,
      }),
    })
    expect(update).toHaveBeenCalledWith({
      where: { id: 'instance-1' },
      data: { currentStepSequence: 2 },
    })
  })

  it('starts final approval logs as pending and returns transition ownership', async () => {
    const pendingLog = {
      ...instanceRow.logs[0],
      consequenceType: 'FINAL_APPROVAL',
      consequenceStatus: 'PENDING',
      consequenceError: null,
      consequenceUpdatedAt: dates.logCreated,
    }
    const create = vi.fn().mockResolvedValue(pendingLog)
    const update = vi.fn().mockResolvedValue(instanceRow)
    const updateManyAndReturn = vi.fn().mockResolvedValue([
      {
        ...pendingLog,
        consequenceStatus: 'COMPLETED',
        consequenceUpdatedAt: new Date('2026-09-14T00:04:00.000Z'),
      },
    ])
    const transaction = vi.fn((callback: (tx: unknown) => unknown) =>
      callback({
        approvalLog: { create, updateManyAndReturn },
        approvalInstance: { update },
      }),
    )
    const prisma = {
      $transaction: transaction,
      approvalLog: { updateManyAndReturn },
    } as unknown as PrismaService
    const approvalRepository = repository(prisma)

    await expect(
      approvalRepository.processApprovalTransaction({
        instanceId: 'instance-1',
        currentStepSequence: 1,
        action: 'APPROVE',
        userId: 'user-1',
        hasNextStep: false,
        consequenceType: 'FINAL_APPROVAL',
      }),
    ).resolves.toMatchObject({
      action: 'APPROVE_FINAL',
      log: {
        consequenceType: 'FINAL_APPROVAL',
        consequenceStatus: 'PENDING',
      },
    })

    const expectedUpdatedAt = dates.logCreated
    await expect(
      approvalRepository.transitionLogConsequence(
        'log-1',
        'PENDING',
        'COMPLETED',
        null,
        expectedUpdatedAt,
      ),
    ).resolves.toMatchObject({
      log: { consequenceStatus: 'COMPLETED' },
      transitioned: true,
    })
    expect(updateManyAndReturn).toHaveBeenCalledWith({
      where: {
        id: 'log-1',
        consequenceStatus: 'PENDING',
        consequenceUpdatedAt: expectedUpdatedAt,
      },
      data: {
        consequenceStatus: 'COMPLETED',
        consequenceError: null,
        consequenceUpdatedAt: expect.any(Date),
      },
    })
    expect(transaction).toHaveBeenCalledTimes(2)
  })

  it('returns stored state without ownership when conditional transition loses the race', async () => {
    const updateManyAndReturn = vi.fn().mockResolvedValue([])
    const findUnique = vi.fn().mockResolvedValue({
      ...instanceRow.logs[0],
      consequenceType: 'FINAL_APPROVAL',
      consequenceStatus: 'FAILED',
      consequenceError: 'Safe failure',
    })
    const transaction = vi.fn((callback: (tx: unknown) => unknown) =>
      callback({ approvalLog: { updateManyAndReturn, findUnique } }),
    )
    const prisma = {
      $transaction: transaction,
      approvalLog: { updateManyAndReturn, findUnique },
    } as unknown as PrismaService

    await expect(
      repository(prisma).transitionLogConsequence(
        'log-1',
        'PENDING',
        'COMPLETED',
      ),
    ).resolves.toMatchObject({
      log: { consequenceStatus: 'FAILED' },
      transitioned: false,
    })
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'log-1' } })
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it('propagates conditional transition write and read errors', async () => {
    const writeError = new Error('approval write failed')
    const write = vi.fn().mockRejectedValue(writeError)
    const writeTransaction = vi.fn((callback: (tx: unknown) => unknown) =>
      callback({ approvalLog: { updateManyAndReturn: write } }),
    )
    const writePrisma = {
      $transaction: writeTransaction,
      approvalLog: { updateManyAndReturn: write },
    } as unknown as PrismaService
    await expect(
      repository(writePrisma).transitionLogConsequence(
        'log-1',
        'PENDING',
        'FAILED',
        'Safe failure',
      ),
    ).rejects.toBe(writeError)

    const readError = new Error('approval read failed')
    const updateManyAndReturn = vi.fn().mockResolvedValue([])
    const findUnique = vi.fn().mockRejectedValue(readError)
    const readTransaction = vi.fn((callback: (tx: unknown) => unknown) =>
      callback({ approvalLog: { updateManyAndReturn, findUnique } }),
    )
    const readPrisma = {
      $transaction: readTransaction,
      approvalLog: { updateManyAndReturn, findUnique },
    } as unknown as PrismaService
    await expect(
      repository(readPrisma).transitionLogConsequence(
        'log-1',
        'PENDING',
        'FAILED',
        'Safe failure',
      ),
    ).rejects.toBe(readError)
  })

  it('does not read after an owned conditional transition', async () => {
    const updateManyAndReturn = vi.fn().mockResolvedValue([instanceRow.logs[0]])
    const findUnique = vi.fn()
    const transaction = vi.fn((callback: (tx: unknown) => unknown) =>
      callback({ approvalLog: { updateManyAndReturn, findUnique } }),
    )
    const prisma = {
      $transaction: transaction,
      approvalLog: { updateManyAndReturn, findUnique },
    } as unknown as PrismaService

    await repository(prisma).transitionLogConsequence(
      'log-1',
      'PENDING',
      'FAILED',
      'Safe failure',
    )

    expect(findUnique).not.toHaveBeenCalled()
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it('does not mutate a completed consequence', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      ...instanceRow.logs[0],
      consequenceType: 'FINAL_APPROVAL',
      consequenceStatus: 'COMPLETED',
      consequenceError: null,
    })
    const updateManyAndReturn = vi.fn()
    const transaction = vi.fn((callback: (tx: unknown) => unknown) =>
      callback({ approvalLog: { updateManyAndReturn, findUnique } }),
    )
    const prisma = { $transaction: transaction } as unknown as PrismaService

    await expect(
      repository(prisma).transitionLogConsequence(
        'log-1',
        'COMPLETED',
        'FAILED',
        'Safe failure',
      ),
    ).resolves.toMatchObject({
      log: { consequenceStatus: 'COMPLETED' },
      transitioned: false,
    })

    expect(updateManyAndReturn).not.toHaveBeenCalled()
  })
})
