// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HorizontalStepper from './HorizontalStepper.vue'

const steps = [
  { key: 'a', label: 'Pendaftaran', caption: '3 Okt', status: 'done' as const },
  { key: 'b', label: 'Keputusan', caption: '8 Okt', status: 'rejected' as const },
  { key: 'c', label: 'Daftar ulang', status: 'upcoming' as const },
  { key: 'd', label: 'Berkas', status: 'current' as const },
]

describe('HorizontalStepper', () => {
  it('renders every step with its status', () => {
    const w = mount(HorizontalStepper, { props: { steps } })
    const items = w.findAll('[role="listitem"]')
    expect(items).toHaveLength(4)
    expect(items.map((i) => i.attributes('data-status'))).toEqual([
      'done',
      'rejected',
      'upcoming',
      'current',
    ])
  })

  it('marks only the current step', () => {
    const w = mount(HorizontalStepper, { props: { steps } })
    const current = w.findAll('[aria-current="step"]')
    expect(current).toHaveLength(1)
    expect(current[0]!.text()).toContain('Berkas')
  })

  it('shows the note slot', () => {
    const w = mount(HorizontalStepper, {
      props: { steps },
      slots: { note: 'Kuota penuh' },
    })
    expect(w.text()).toContain('Kuota penuh')
  })

  it('scrolls instead of widening the page', () => {
    const w = mount(HorizontalStepper, { props: { steps } })
    expect(w.get('[role="list"]').classes()).toContain('overflow-x-auto')
  })
})
