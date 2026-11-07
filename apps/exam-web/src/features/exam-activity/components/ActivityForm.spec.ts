// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ActivityForm from './ActivityForm.vue'

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

const open = () => mount(ActivityForm, { props })

describe('ActivityForm', () => {
  it('only offers the classrooms of the chosen grade', async () => {
    const wrapper = open()
    await wrapper.findAll('select')[0].setValue('grade-7')

    expect(wrapper.text()).toContain('VII-A')
    expect(wrapper.text()).toContain('VII-B')
    expect(wrapper.text()).not.toContain('IX-A')
  })

  it('clears the chosen classrooms when the grade changes', async () => {
    const wrapper = open()
    await wrapper.findAll('select')[0].setValue('grade-7')
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await wrapper.findAll('select')[0].setValue('grade-9')

    expect(
      wrapper
        .findAll('input[type="checkbox"]')
        .filter((box) => (box.element as HTMLInputElement).checked),
    ).toHaveLength(0)
  })

  it('submits the chosen classrooms and the package subject', async () => {
    const wrapper = open()
    await wrapper.findAll('select')[0].setValue('grade-7')
    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true)
    await wrapper.findAll('select')[1].setValue('package-1')
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
      presetName: 'UJIAN_KETAT',
      tokenMode: 'ROTATING',
      durationMinutes: 90,
    })
  })

  it('keeps the admin section hidden from teachers', async () => {
    expect(open().text()).not.toContain('Lanjutan (admin)')
    const admin = mount(ActivityForm, { props: { ...props, isAdmin: true } })
    expect(admin.text()).toContain('Lanjutan (admin)')
  })
})
