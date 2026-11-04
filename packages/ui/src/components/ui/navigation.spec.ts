// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Calendar } from './calendar'
import { FieldDescription, FieldError } from './field'
import { PaginationEllipsis } from './pagination'

const text = 'text-[length:var(--text-control,0.75rem)]'

describe('navigation and data components', () => {
  it('calendar day cells and heading follow the control tokens', async () => {
    const w = mount(Calendar, { attachTo: document.body })
    await flushPromises()
    const cell = w.get('[data-slot=calendar-cell-trigger]').classes()
    expect(cell).toContain('size-[var(--control-h-sm,1.5rem)]')
    expect(w.get('[data-slot=calendar-heading]').classes()).toContain(text)
    w.unmount()
  })

  it('pagination ellipsis is as big as a md control', () => {
    const w = mount(PaginationEllipsis)
    expect(w.get('[data-slot=pagination-ellipsis]').classes()).toContain(
      'size-[var(--control-h-md,1.75rem)]',
    )
  })

  it('field helper text uses the control text token', () => {
    expect(mount(FieldError, { slots: { default: 'x' } }).classes()).toContain(text)
    expect(mount(FieldDescription).classes()).toContain(text)
  })
})
