// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppCombobox from './AppCombobox.vue'
import BackButton from './BackButton.vue'
import DatePicker from './DatePicker.vue'
import SearchInput from './SearchInput.vue'

const md = 'h-[var(--control-h-md,1.75rem)]'

const source = (name: string) =>
  readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8')

describe('custom components on the control tokens', () => {
  it('date picker trigger is a md control', () => {
    const w = mount(DatePicker, { props: { modelValue: '' } })
    expect(w.get('button').classes()).toContain(md)
    expect(w.get('button').classes()).not.toContain('h-10')
  })

  it('date picker and combobox triggers look like inputs: transparent with the input border', () => {
    const picker = mount(DatePicker, { props: { modelValue: '' } }).get('button').classes()
    const combo = mount(AppCombobox, { props: { options: [] } }).get('button').classes()
    for (const c of [picker, combo]) {
      expect(c).toContain('bg-transparent')
      expect(c).toContain('border-input')
      expect(c).not.toContain('bg-background')
      expect(c).not.toContain('border-border')
      expect(c).toContain('hover:bg-transparent')
      expect(c).toContain('aria-expanded:bg-transparent')
      expect(c).toContain('aria-expanded:border-ring')
      expect(c).not.toContain('hover:bg-muted')
      expect(c).not.toContain('aria-expanded:bg-muted')
    }
  })

  it('icons in fields, menus and pagers follow the icon token', () => {
    const files = [
      'DatePicker.vue',
      'AppCombobox.vue',
      'DataTable.vue',
      'NavUser.vue',
      'ui/select/SelectTrigger.vue',
      'ui/command/CommandInput.vue',
      'ui/calendar/CalendarNextButton.vue',
      'ui/calendar/CalendarPrevButton.vue',
      'ui/range-calendar/RangeCalendarNextButton.vue',
      'ui/range-calendar/RangeCalendarPrevButton.vue',
      'ui/dropdown-menu/DropdownMenuSubTrigger.vue',
      'ui/dropdown-menu/DropdownMenuCheckboxItem.vue',
      'ui/pagination/PaginationEllipsis.vue',
    ]
    const offenders = files.filter((f) =>
      /(?<![\w-])(size-4|h-4 w-4|size-3\.5)(?![\w.-])/.test(source(`./${f}`)),
    )
    expect(offenders).toEqual([])
  })

  it('combobox trigger is a md control', () => {
    const w = mount(AppCombobox, { props: { options: [] } })
    expect(w.get('button').classes()).toContain(md)
    expect(w.get('button').classes()).not.toContain('h-9')
  })

  it('search input keeps the default md control height', () => {
    const w = mount(SearchInput, { props: { modelValue: '' } })
    expect(w.get('input').classes()).not.toContain('h-8')
  })

  it('back button is a md square', () => {
    const w = mount(BackButton, { props: { label: 'Kembali' } })
    expect(w.classes()).toContain('size-[var(--control-h-md,1.75rem)]')
  })

  it('floating field hides the placeholder text of a date trigger while it is empty', () => {
    const css = source('./ui/form/FloatingLabelField.vue')
    const rule = css.slice(css.indexOf(".ff.ff-empty :deep(button[aria-haspopup='dialog'])"))
    expect(rule.slice(0, rule.indexOf('}'))).toContain('color: transparent')
  })

  it('an empty date field lowers its label again once the calendar is closed', () => {
    const css = source('./ui/form/FloatingLabelField.vue')
    const selector =
      ".ff.ff-empty:not(.ff-error):has(button[aria-haspopup='dialog']:not([aria-expanded='true'])) :deep([data-slot='ff-label'])"
    const at = css.indexOf(selector)
    expect(at).toBeGreaterThan(-1)
    const rule = css.slice(at, css.indexOf('}', at))
    expect(rule).toContain('top: calc(0.75rem + var(--control-h-md, 1.75rem) / 2 + 0.75px)')
    expect(rule).toContain('left: calc(0.375rem + 1px)')
    expect(rule).toContain('color: var(--muted-foreground)')
    expect(css).toContain(
      ".ff.ff-empty:not(.ff-error):not(:focus-within):not(:has(button[aria-expanded='true'])) :deep([data-slot='ff-label'])",
    )
    expect(css).toContain(
      ".ff:has(button[aria-haspopup='dialog'][aria-expanded='true']) :deep([data-slot='ff-label'])",
    )
  })

  it('floating field label rests in the middle of a md control and floats at 10px', () => {
    const css = source('./ui/form/FloatingLabelField.vue')
    expect(css).toContain('top: calc(0.75rem + var(--control-h-md, 1.75rem) / 2 + 0.75px)')
    expect(css).toContain('font-size: var(--text-control, 0.75rem)')
    expect(css).toContain('font-size: 0.625rem')
  })

  it('the command input uses the control height token and the number and tags inputs keep the Mira text-sm', () => {
    const command = source('ui/command/CommandInput.vue')
    expect(command).not.toMatch(/\bh-9\b/)
    expect(command).toContain('h-[var(--control-h-lg,2rem)]')
    for (const file of ['ui/number-field/NumberFieldInput.vue', 'ui/tags-input/TagsInputInput.vue']) {
      const text = source(file)
      expect(text, file).toMatch(/(?<![\w:-])text-sm\b/)
    }
  })
})
