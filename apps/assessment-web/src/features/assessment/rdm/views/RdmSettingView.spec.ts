// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { rdmService } from '../services/rdmService'
import type * as RdmServiceModule from '../services/rdmService'
import RdmSettingView from './RdmSettingView.vue'

const mockPermissions = vi.hoisted(() => ({ list: [] as string[] }))

vi.mock('@mts241alikhlash/platform/auth', () => ({
  useRoleGuard: () => ({
    can: (...permissions: string[]) =>
      permissions.some((permission) =>
        mockPermissions.list.includes(permission),
      ),
  }),
}))

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

function getCheckboxes(): HTMLButtonElement[] {
  return Array.from(
    document.body.querySelectorAll<HTMLButtonElement>('[role="checkbox"]'),
  )
}

function getRadios(): HTMLButtonElement[] {
  return Array.from(
    document.body.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
  )
}

function findSaveButton(): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll('button')).find((btn) =>
    btn.textContent?.includes('Simpan'),
  )
}

async function waitForForm() {
  await new Promise((resolve) => setTimeout(resolve, 50))
  await flushPromises()
}

describe('RdmSettingView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPermissions.list = [
      'assessment-settings.read',
      'assessment-settings.update',
    ]
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('loads and displays the current setting with Indonesian assessment type labels', async () => {
    vi.mocked(rdmService.getSettings).mockResolvedValueOnce({
      sumatifTypes: ['DAILY', 'ASSIGNMENT', 'PRACTICAL'],
      sasType: 'FINAL',
    })

    const wrapper = mount(RdmSettingView, { attachTo: document.body })
    await flushPromises()

    expect(rdmService.getSettings).toHaveBeenCalledTimes(1)

    const text = document.body.textContent ?? ''
    for (const label of ['Harian', 'Tugas', 'Praktikum', 'UTS', 'UAS']) {
      expect(text).toContain(label)
    }

    const checkboxes = getCheckboxes()
    expect(checkboxes).toHaveLength(5)
    expect(checkboxes.map((cb) => cb.getAttribute('aria-checked'))).toEqual([
      'true',
      'true',
      'true',
      'false',
      'false',
    ])

    const radios = getRadios()
    expect(radios).toHaveLength(5)
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'false',
      'false',
      'true',
    ])

    wrapper.unmount()
  })

  it('disables ticking the SAS type in Sumatif and unticks it when SAS changes', async () => {
    vi.mocked(rdmService.getSettings).mockResolvedValueOnce({
      sumatifTypes: ['DAILY', 'ASSIGNMENT', 'MIDTERM'],
      sasType: 'FINAL',
    })

    const wrapper = mount(RdmSettingView, { attachTo: document.body })
    await flushPromises()

    const checkboxes = getCheckboxes()
    const finalCheckbox = checkboxes[4]
    expect(finalCheckbox.disabled).toBe(true)
    expect(finalCheckbox.getAttribute('aria-checked')).toBe('false')
    finalCheckbox.click()
    await flushPromises()
    expect(finalCheckbox.getAttribute('aria-checked')).toBe('false')

    const radios = getRadios()
    radios[3].click()
    await flushPromises()

    expect(radios[3].getAttribute('aria-checked')).toBe('true')
    expect(checkboxes[3].disabled).toBe(true)
    expect(checkboxes[3].getAttribute('aria-checked')).toBe('false')
    expect(checkboxes[4].disabled).toBe(false)

    wrapper.unmount()
  })

  it('requires at least one Sumatif type under the Sumatif field and sends PUT body with success toast on save', async () => {
    vi.mocked(rdmService.getSettings).mockResolvedValueOnce({
      sumatifTypes: ['DAILY'],
      sasType: 'FINAL',
    })
    vi.mocked(rdmService.updateSettings).mockResolvedValueOnce({
      sumatifTypes: ['DAILY', 'PRACTICAL'],
      sasType: 'MIDTERM',
    })

    const wrapper = mount(RdmSettingView, { attachTo: document.body })
    await flushPromises()

    const checkboxes = getCheckboxes()
    const radios = getRadios()

    checkboxes[0].click()
    await waitForForm()
    expect(findSaveButton()?.disabled).toBe(true)

    const sumatifFieldItem = document.body.querySelector(
      '[data-slot="form-item"]',
    )
    expect(
      sumatifFieldItem?.querySelector('[data-slot="form-message"]')
        ?.textContent,
    ).toContain('Pilih minimal satu jenis penilaian untuk Sumatif')

    checkboxes[0].click()
    checkboxes[2].click()
    radios[3].click()
    await waitForForm()

    const saveBtn = findSaveButton()
    expect(saveBtn?.disabled).toBe(false)
    saveBtn!.click()
    await waitForForm()

    expect(rdmService.updateSettings).toHaveBeenCalledWith({
      sumatifTypes: ['DAILY', 'PRACTICAL'],
      sasType: 'MIDTERM',
    })
    expect(toast.success).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('shows API error messages verbatim and keeps user choices on failed save', async () => {
    vi.mocked(rdmService.getSettings).mockResolvedValueOnce({
      sumatifTypes: ['DAILY'],
      sasType: 'FINAL',
    })
    vi.mocked(rdmService.updateSettings).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'Jenis penilaian SAS tidak boleh juga dipakai untuk Sumatif',
        },
      },
    })

    const wrapper = mount(RdmSettingView, { attachTo: document.body })
    await flushPromises()

    const checkboxes = getCheckboxes()
    checkboxes[1].click()
    await waitForForm()

    const saveBtn = findSaveButton()
    saveBtn!.click()
    await waitForForm()

    expect(document.body.textContent).toContain(
      'Jenis penilaian SAS tidak boleh juga dipakai untuk Sumatif',
    )
    expect(checkboxes[1].getAttribute('aria-checked')).toBe('true')

    wrapper.unmount()
  })

  it('is read-only without assessment-settings.update permission', async () => {
    mockPermissions.list = ['assessment-settings.read']
    vi.mocked(rdmService.getSettings).mockResolvedValueOnce({
      sumatifTypes: ['DAILY', 'ASSIGNMENT'],
      sasType: 'FINAL',
    })

    const wrapper = mount(RdmSettingView, { attachTo: document.body })
    await flushPromises()

    const saveBtn = findSaveButton()
    expect(saveBtn === undefined || saveBtn.disabled).toBe(true)
    expect(getCheckboxes().every((cb) => cb.disabled)).toBe(true)
    expect(getRadios().every((r) => r.disabled)).toBe(true)

    wrapper.unmount()
  })

  it('shows load error and retries loading settings', async () => {
    vi.mocked(rdmService.getSettings)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        sumatifTypes: ['DAILY'],
        sasType: 'FINAL',
      })

    const wrapper = mount(RdmSettingView, { attachTo: document.body })
    await flushPromises()

    expect(document.body.textContent).toContain('Gagal memuat pengaturan RDM.')
    const retryBtn = Array.from(document.body.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('Coba Lagi'),
    )
    expect(retryBtn).toBeDefined()
    retryBtn!.click()
    await flushPromises()

    expect(rdmService.getSettings).toHaveBeenCalledTimes(2)
    expect(getCheckboxes()).toHaveLength(5)

    wrapper.unmount()
  })
})
