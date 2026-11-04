// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReturnedNotes from './ReturnedNotes.vue'
import type { PackageReview } from '../types'

const review = (overrides: Partial<PackageReview> = {}): PackageReview => ({
  id: 'r1',
  action: 'RETURN',
  byUserId: 'u9',
  note: 'Perbaiki soal pertama',
  questionNotes: [
    { questionId: 'q1', note: 'Kunci salah' },
    { questionId: 'q2', note: 'Terlalu mudah' },
  ],
  createdAt: '2026-10-29T02:00:00.000Z',
  ...overrides,
})

describe('ReturnedNotes', () => {
  it('shows the general note and how many questions carry a note', () => {
    const wrapper = mount(ReturnedNotes, { props: { review: review() } })

    expect(wrapper.text()).toContain('Dikembalikan oleh penyetuju')
    expect(wrapper.text()).toContain('Perbaiki soal pertama')
    expect(wrapper.text()).toContain('2 soal diberi catatan')
    expect(wrapper.attributes('role')).toBe('alert')
  })

  it('leaves out the count when no question has a note', () => {
    const wrapper = mount(ReturnedNotes, {
      props: { review: review({ questionNotes: [] }) },
    })

    expect(wrapper.text()).not.toContain('diberi catatan')
  })

  it('renders nothing without a review', () => {
    const wrapper = mount(ReturnedNotes, { props: { review: null } })

    expect(wrapper.text()).toBe('')
  })
})
