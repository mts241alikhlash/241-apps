import { createSSRApp, defineComponent } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'
import { useEmployeeCreateForm } from './useEmployeeCreateForm'
import { employeeService } from '../services/employeeService'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../services/employeeService', () => ({
  employeeService: { createEmployeeWithRelations: vi.fn() },
}))
vi.mock('@/features/platform/reference-data', () => ({
  useReferenceList: () => ({ read: () => Promise.resolve([]) }),
}))

describe('useEmployeeCreateForm', () => {
  it('sends NIK as account fallback and omits empty optional fields', async () => {
    let form!: ReturnType<typeof useEmployeeCreateForm>
    await renderToString(
      createSSRApp(
        defineComponent({
          setup() {
            form = useEmployeeCreateForm()
            return () => null
          },
        }),
      ),
    )

    form.setFieldValue('name', 'Budi')
    form.setFieldValue('nik', '1234567890123456')
    form.setFieldValue('birthPlace', 'Bandung')
    form.setFieldValue('birthDate', '1990-01-01')
    form.setFieldValue(
      'employmentTypeId',
      '550e8400-e29b-41d4-a716-446655440007',
    )
    vi.mocked(employeeService.createEmployeeWithRelations).mockResolvedValue({
      success: false,
      warnings: [],
    })

    await form.submit()

    expect(employeeService.createEmployeeWithRelations).toHaveBeenCalledWith({
      core: {
        name: 'Budi',
        nik: '1234567890123456',
        gender: 'MALE',
        birthPlace: 'Bandung',
        birthDate: '1990-01-01',
        employmentTypeId: '550e8400-e29b-41d4-a716-446655440007',
        positionId: undefined,
        identifier: '1234567890123456',
        password: undefined,
        email: undefined,
        phone: undefined,
        nip: undefined,
        nuptk: undefined,
      },
      address: null,
      positions: [],
    })
  })
})
