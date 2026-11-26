// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { toast } from 'vue-sonner'
import { rdmService } from '../services/rdmService'
import type * as RdmServiceModule from '../services/rdmService'
import { useRdmSetting } from './useRdmSetting'

vi.mock('../services/rdmService', async (importOriginal) => {
  const actual = await importOriginal<typeof RdmServiceModule>()
  return {
    ...actual,
    rdmService: {
      getCandidates: vi.fn(),
      downloadWorkbook: vi.fn(),
      fillTemplate: vi.fn(),
      previewImport: vi.fn(),
      confirmImport: vi.fn(),
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    },
  }
})

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

async function waitForForm() {
  await new Promise((resolve) => setTimeout(resolve, 50))
  await flushPromises()
}

function mountComposable<T>(factory: () => T): T {
  let state: T | undefined
  mount(
    defineComponent({
      setup() {
        state = factory()
        return () => null
      },
    }),
  )
  if (state === undefined) throw new Error('composable did not run')
  return state
}

describe('useRdmSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads setting and normalizes SAS type out of Sumatif', async () => {
    vi.mocked(rdmService.getSettings).mockResolvedValueOnce({
      sumatifTypes: ['DAILY', 'FINAL', 'ASSIGNMENT'],
      sasType: 'FINAL',
    })

    const setting = mountComposable(() => useRdmSetting())
    await setting.load()

    expect(setting.sasType.value).toBe('FINAL')
    expect(setting.sumatifTypes.value).toEqual(['DAILY', 'ASSIGNMENT'])
    expect(setting.isValid.value).toBe(true)
  })

  it('shows zod message for empty Sumatif selection and refuses save', async () => {
    vi.mocked(rdmService.getSettings).mockResolvedValueOnce({
      sumatifTypes: ['DAILY'],
      sasType: 'FINAL',
    })

    const setting = mountComposable(() => useRdmSetting())
    await setting.load()

    setting.toggleSumatif('DAILY', false)
    await waitForForm()

    expect(setting.sumatifTypes.value).toEqual([])
    expect(setting.isValid.value).toBe(false)
    expect(setting.form.errors.value.sumatifTypes).toBe(
      'Pilih minimal satu jenis penilaian untuk Sumatif',
    )

    const saved = await setting.save()
    expect(saved).toBe(false)
    expect(rdmService.updateSettings).not.toHaveBeenCalled()
  })

  it('shows zod message when SAS type is included in Sumatif and refuses save', async () => {
    vi.mocked(rdmService.getSettings).mockResolvedValueOnce({
      sumatifTypes: ['DAILY'],
      sasType: 'FINAL',
    })

    const setting = mountComposable(() => useRdmSetting())
    await setting.load()

    setting.form.setFieldValue('sumatifTypes', ['DAILY', 'FINAL'])
    await waitForForm()

    expect(setting.isValid.value).toBe(false)
    expect(setting.form.errors.value.sumatifTypes).toBe(
      'Jenis penilaian SAS tidak boleh juga dipakai untuk Sumatif',
    )

    const saved = await setting.save()
    expect(saved).toBe(false)
    expect(rdmService.updateSettings).not.toHaveBeenCalled()
  })

  it('saves valid settings and preserves user choices on API error', async () => {
    vi.mocked(rdmService.getSettings).mockResolvedValueOnce({
      sumatifTypes: ['DAILY'],
      sasType: 'FINAL',
    })
    vi.mocked(rdmService.updateSettings)
      .mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Konfigurasi tidak valid' },
        },
      })
      .mockResolvedValueOnce({
        sumatifTypes: ['DAILY', 'PRACTICAL'],
        sasType: 'MIDTERM',
      })

    const setting = mountComposable(() => useRdmSetting())
    await setting.load()

    setting.toggleSumatif('PRACTICAL', true)
    setting.setSasType('MIDTERM')
    await flushPromises()

    const failed = await setting.save()
    expect(failed).toBe(false)
    expect(setting.saveError.value).toBe('Konfigurasi tidak valid')
    expect(setting.sumatifTypes.value).toEqual(['DAILY', 'PRACTICAL'])
    expect(setting.sasType.value).toBe('MIDTERM')

    const succeeded = await setting.save()
    expect(succeeded).toBe(true)
    expect(setting.saveError.value).toBeNull()
    expect(toast.success).toHaveBeenCalledWith(
      'Pengaturan RDM berhasil disimpan.',
    )
  })
})
