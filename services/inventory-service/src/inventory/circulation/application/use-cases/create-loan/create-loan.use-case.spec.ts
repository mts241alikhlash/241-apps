import type { Mock } from 'vitest'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import {
  IAssetUnitCapabilityPort,
  IAssetUnitMutationPort,
} from '../../../../asset/index.js'
import { IApprovalCapabilityPort } from '../../../../approval/index.js'
import { IStatusLookupPort } from '../../../../reference-data/status/index.js'
import { IHistoryCapabilityPort } from '../../../domain/repositories/history.repository.js'
import { ILoanRepository } from '../../../domain/repositories/loan.repository.js'
import { ITransactionTypeCapabilityPort } from '../../../domain/repositories/transaction-type.repository.js'
import { CreateLoanUseCase } from './create-loan.use-case.js'

describe('CreateLoanUseCase', () => {
  const input = {
    expectedReturnDate: '2026-10-01T00:00:00.000Z',
    purpose: 'Workshop',
    unitIds: ['unit-1', 'unit-2'],
  }
  const units = [
    {
      id: 'unit-1',
      unitNumber: 'LAP-001',
      statusId: 'status-available',
      asset: { name: 'Laptop' },
      status: { allowTransactions: true },
    },
    {
      id: 'unit-2',
      unitNumber: 'MON-001',
      statusId: 'status-available',
      asset: { name: 'Monitor' },
      status: { allowTransactions: true },
    },
  ]

  function make(overrides: Record<string, Mock> = {}) {
    const loan = {
      findLatestLoan:
        overrides.findLatestLoan ?? vi.fn().mockResolvedValue(null),
      processCreateLoanTransaction:
        overrides.processCreateLoanTransaction ??
        vi.fn().mockResolvedValue({ id: 'loan-1' }),
      updateLoan:
        overrides.updateLoan ?? vi.fn().mockResolvedValue({ id: 'loan-1' }),
    } as unknown as ILoanRepository
    const status = {
      findBySystemKey:
        overrides.findBySystemKey ??
        vi.fn().mockResolvedValue({ id: 'status-pending' }),
    } satisfies IStatusLookupPort
    const unitsPort = {
      findByIds: overrides.findByIds ?? vi.fn().mockResolvedValue(units),
    } satisfies IAssetUnitCapabilityPort
    const mutation = {
      updateStatuses:
        overrides.updateStatuses ?? vi.fn().mockResolvedValue(undefined),
      updateCondition: vi.fn().mockResolvedValue(undefined),
    } satisfies IAssetUnitMutationPort
    const approval = {
      findActiveWorkflow:
        overrides.findActiveWorkflow ?? vi.fn().mockResolvedValue(null),
      createInstance: vi.fn().mockResolvedValue({ id: 'instance-1' }),
    } satisfies IApprovalCapabilityPort
    const transactionType = {
      findTransactionTypeByCode: vi
        .fn()
        .mockResolvedValue({ id: 'tx-loan-out' }),
    } satisfies ITransactionTypeCapabilityPort
    const history = {
      record: vi.fn().mockResolvedValue(undefined),
    } satisfies IHistoryCapabilityPort

    return {
      useCase: new CreateLoanUseCase(
        loan,
        status,
        unitsPort,
        mutation,
        approval,
        transactionType,
        history,
      ),
      loan,
      status,
      unitsPort,
      mutation,
      approval,
      transactionType,
      history,
    }
  }

  it('preserves missing pending status error before unit lookup', async () => {
    const findByIds = vi.fn()
    const { useCase } = make({
      findBySystemKey: vi.fn().mockResolvedValue(null),
      findByIds,
    })

    await expect(useCase.execute(input, 'requester-1')).rejects.toEqual(
      new NotFoundException(
        'The PENDING_APPROVAL status role is not configured under Reference > Asset Status',
      ),
    )
    expect(findByIds).not.toHaveBeenCalled()
  })

  it('preserves missing-unit and unavailable-unit errors', async () => {
    const findLatestLoan = vi.fn()
    const processCreateLoanTransaction = vi.fn()
    const { useCase } = make({
      findByIds: vi.fn().mockResolvedValue([units[0]]),
      findLatestLoan,
      processCreateLoanTransaction,
    })
    await expect(useCase.execute(input, 'requester-1')).rejects.toEqual(
      new BadRequestException('One or more units do not exist.'),
    )
    expect(findLatestLoan).not.toHaveBeenCalled()
    expect(processCreateLoanTransaction).not.toHaveBeenCalled()

    const unavailable = { ...units[0], status: { allowTransactions: false } }
    await expect(
      make({
        findByIds: vi.fn().mockResolvedValue([unavailable, units[1]]),
      }).useCase.execute(input, 'requester-1'),
    ).rejects.toEqual(
      new BadRequestException(
        'Unit "Laptop" (LAP-001) is not available for borrowing.',
      ),
    )
  })

  it('awaits loan, asset, and approval calls in order', async () => {
    const events: string[] = []
    const { useCase, loan, mutation, approval } = make()
    ;(loan.processCreateLoanTransaction as Mock).mockImplementation(() => {
      events.push('loan')
      return { id: 'loan-1' }
    })
    mutation.updateStatuses.mockImplementation(() => {
      events.push('asset')
    })
    approval.findActiveWorkflow.mockImplementation(() => {
      events.push('workflow')
      return { id: 'workflow-1' }
    })
    approval.createInstance.mockImplementation(() => {
      events.push('approval')
      return { id: 'instance-1' }
    })

    await useCase.execute(input, 'requester-1')

    expect(events).toEqual(['loan', 'asset', 'workflow', 'approval'])
    expect(mutation.updateStatuses).toHaveBeenCalledWith({
      unitIds: input.unitIds,
      statusId: 'status-pending',
    })
    expect(approval.createInstance).toHaveBeenCalledWith({
      workflowId: 'workflow-1',
      referenceId: 'loan-1',
      statusId: 'status-pending',
    })
  })
})
