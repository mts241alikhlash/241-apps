// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import { expect, it, vi } from 'vitest'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import AchievementsStep from './AchievementsStep.vue'

const year = String(new Date().getFullYear())

function row(overrides: Record<string, string>) {
  return {
    year,
    competitionName: 'OSN',
    competitionFieldId: 'field-1',
    organizer: '',
    competitionLevelId: 'level-1',
    rank: 'Juara 1',
    fileId: '',
    fileName: '',
    ...overrides,
  }
}

it('opens the first incomplete row when the step does not validate', async () => {
  const step = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(TooltipProvider, null, () =>
          h(AchievementsStep, {
            ref: step,
            editable: true,
            uploadAttachment: vi.fn(),
            achievements: [row({}), row({ competitionName: 'KSM', rank: '' })],
            scholarships: [],
          }),
        ),
    }),
    { attachTo: document.body },
  )
  await flushPromises()

  const { valid } = await step.value!.validate()
  await flushPromises()

  expect(valid).toBe(false)
  expect(document.body.textContent).toContain('Edit Prestasi')
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('Peringkat wajib diisi'),
  )
  wrapper.unmount()
})

it('validates after a new row is checked and then cancelled', async () => {
  const step = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(TooltipProvider, null, () =>
          h(AchievementsStep, {
            ref: step,
            editable: true,
            uploadAttachment: vi.fn(),
            achievements: reactive([]),
            scholarships: reactive([]),
          }),
        ),
    }),
    { attachTo: document.body },
  )
  await flushPromises()

  const button = (text: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === text,
    )!
  await wrapper
    .findAll('button')
    .filter((item) => item.text() === 'Tambah')[1]
    .trigger('click')
  await flushPromises()
  await vi.waitFor(() => expect(button('Simpan')).toBeDefined())
  button('Simpan').click()
  await flushPromises()
  await vi.waitFor(() => expect(document.body.textContent).toContain('wajib'))
  button('Batal').click()
  await flushPromises()

  const { valid } = await step.value!.validate()
  expect(valid).toBe(true)
  wrapper.unmount()
})
