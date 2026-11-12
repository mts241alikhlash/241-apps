// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ActivityForm from './ActivityForm.vue'

const { patch, post } = vi.hoisted(() => ({
  patch: vi.fn(),
  post: vi.fn(),
}))
vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({
  default: { get: vi.fn(), post, patch },
}))

const props = {
  semesterId: 'sem-1',
  isAdmin: false,
  grades: [
    { id: 'grade-7', label: 'Kelas 7' },
    { id: 'grade-9', label: 'Kelas 9' },
  ],
  classrooms: [
    { id: 'class-7a', gradeId: 'grade-7', label: 'VII-A' },
    { id: 'class-7b', gradeId: 'grade-7', label: 'VII-B' },
    { id: 'class-9a', gradeId: 'grade-9', label: 'IX-A' },
  ],
  packages: [
    { id: 'package-1', subjectId: 'subject-inf', label: 'Informatika' },
  ],
}

const open = (overrides: Record<string, unknown> = {}) =>
  mount(ActivityForm, { props: { ...props, ...overrides } })

const pastActivity = {
  id: 'activity-1',
  semesterId: 'sem-1',
  gradeId: 'grade-7',
  status: 'DRAFT' as const,
  tokenMode: 'ROTATING' as const,
  tokenRotation: 1,
  durationMinutes: 90,
  policy: {},
  startsAt: '2020-11-10T01:00:00.000Z',
  endsAt: '2020-11-10T04:00:00.000Z',
}

describe('ActivityForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('only offers the classrooms of the chosen grade', async () => {
    const wrapper = open()
    await wrapper.find('#activity-grade').setValue('grade-7')

    expect(wrapper.text()).toContain('VII-A')
    expect(wrapper.text()).toContain('VII-B')
    expect(wrapper.text()).not.toContain('IX-A')
  })

  it('clears the chosen classrooms when the grade changes', async () => {
    const wrapper = open()
    await wrapper.find('#activity-grade').setValue('grade-7')
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await wrapper.find('#activity-grade').setValue('grade-9')

    expect(
      wrapper
        .findAll('input[type="checkbox"]')
        .filter((box) => (box.element as HTMLInputElement).checked),
    ).toHaveLength(0)
  })

  it('locks preset and token mode to Token berputar when MIDTERM is selected', async () => {
    const wrapper = open({
      isAdmin: true,
      events: [{ id: 'ev-1', name: 'UTS Ganjil', type: 'MIDTERM' }],
    })
    await wrapper.find('#activity-type').setValue('MIDTERM')

    expect(wrapper.text()).toContain('Kebijakan UTS')
    expect(wrapper.text()).toContain('Token berputar')
    expect(wrapper.find('#activity-preset').exists()).toBe(false)
    expect(wrapper.find('#activity-token-mode').exists()).toBe(false)
  })

  it('lets DAILY activities choose between DAILY and ASSIGNMENT presets', async () => {
    const wrapper = open()
    await wrapper.find('#activity-type').setValue('DAILY')

    const presetOptions = wrapper
      .find('#activity-preset')
      .findAll('option')
      .map((opt) => (opt.element as HTMLOptionElement).value)
    expect(presetOptions).toEqual(['DAILY', 'ASSIGNMENT'])
  })

  it('submits the chosen classrooms and the package subject', async () => {
    const wrapper = open()
    await wrapper.find('#activity-grade').setValue('grade-7')
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true)
    await wrapper.find('#activity-package').setValue('package-1')
    await wrapper
      .findAll('input[type="datetime-local"]')[0]
      .setValue('2026-11-10T08:00')
    await wrapper
      .findAll('input[type="datetime-local"]')[1]
      .setValue('2026-11-10T11:00')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      gradeId: 'grade-7',
      classroomIds: ['class-7a', 'class-7b'],
      packageId: 'package-1',
      subjectId: 'subject-inf',
      type: 'DAILY',
      presetName: 'DAILY',
      tokenMode: 'ROTATING',
      durationMinutes: 90,
    })
  })

  it('blocks the form and explains when a teacher has no active midterm period', async () => {
    const wrapper = open({ category: 'EXAM', events: [] })
    await wrapper.find('#activity-grade').setValue('grade-7')
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await wrapper.find('#activity-package').setValue('package-1')
    await wrapper
      .findAll('input[type="datetime-local"]')[0]
      .setValue('2026-11-10T08:00')
    await wrapper
      .findAll('input[type="datetime-local"]')[1]
      .setValue('2026-11-10T11:00')

    expect(wrapper.text()).toContain('Belum ada periode UTS yang aktif')
    expect(
      wrapper.find('button[type="submit"]').attributes('disabled'),
    ).toBeDefined()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('keeps the admin section hidden from teachers', () => {
    expect(open().text()).not.toContain('Lanjutan (admin)')
    const admin = open({ isAdmin: true })
    expect(admin.text()).toContain('Lanjutan (admin)')
  })

  it('patches the chosen status for an existing activity', async () => {
    const wrapper = mount(ActivityForm, {
      props: { ...props, activity: pastActivity },
    })
    await wrapper.find('#activity-status').setValue('ACTIVE')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith('/exam-activities/activity-1', {
      status: 'ACTIVE',
    })
  })

  it('confirms before leaving ACTIVE', async () => {
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    vi.stubGlobal('confirm', confirm)
    const wrapper = mount(ActivityForm, {
      props: { ...props, activity: { ...pastActivity, status: 'ACTIVE' } },
    })
    await wrapper.find('#activity-status').setValue('CLOSED')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('sesi yang masih berjalan'),
    )
    expect(patch).not.toHaveBeenCalled()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith('/exam-activities/activity-1', {
      status: 'CLOSED',
    })
    vi.unstubAllGlobals()
  })

  it('asks the registry to issue participant numbers', async () => {
    post.mockResolvedValueOnce({ data: { data: { issued: true } } })
    const wrapper = mount(ActivityForm, {
      props: { ...props, activity: pastActivity },
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Terbitkan nomor peserta')!
      .trigger('click')
    await flushPromises()

    expect(post).toHaveBeenCalledWith(
      '/exam-activities/activity-1/participant-numbers/issue',
      {},
    )
    expect(wrapper.emitted('numbers-issued')?.[0]).toEqual([true])
  })

  it('warns when the activity is activated outside its window', async () => {
    const wrapper = mount(ActivityForm, {
      props: { ...props, activity: pastActivity },
    })
    expect(wrapper.text()).not.toContain('di luar jendela')
    await wrapper.find('#activity-status').setValue('ACTIVE')
    expect(wrapper.text()).toContain('di luar jendela')
    await wrapper.find('#activity-status').setValue('CLOSED')
    expect(wrapper.text()).not.toContain('di luar jendela')
  })
})
