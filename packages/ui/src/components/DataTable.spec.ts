// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import type { ColumnDef } from '@tanstack/vue-table'
import DataTable from './DataTable.vue'

interface Row {
  id: string
  name: string
}

const columns: ColumnDef<object, unknown>[] = [
  { id: 'select', header: 'Pilih', cell: () => 'x', size: 40 },
  { accessorKey: 'name', header: 'Nama' },
  { id: 'status', header: 'Status', cell: () => 's', size: 120 },
  { id: 'actions', header: 'Aksi', cell: () => 'a', size: 60 },
]
const data: Row[] = [{ id: '1', name: 'Ahmad' }]

const headers = (w: ReturnType<typeof mount>) =>
  Object.fromEntries(
    w.findAll('th').map((th) => [th.text(), th]),
  ) as Record<string, ReturnType<typeof w.get>>

describe('DataTable pinned columns', () => {
  it('pins only actions to the right by default', () => {
    const th = headers(mount(DataTable, { props: { columns, data } }))
    expect(th['Aksi']!.classes()).toEqual(
      expect.arrayContaining(['sticky', 'border-l']),
    )
    expect((th['Aksi']!.element as HTMLElement).style.right).toBe('0px')
    expect((th['Aksi']!.element as HTMLElement).style.width).toBe('')
    expect(th['Status']!.classes()).not.toContain('sticky')
    expect(th['Pilih']!.classes()).not.toContain('sticky')
  })

  it('pins left and several right columns without overlap', () => {
    const w = mount(DataTable, {
      props: {
        columns,
        data,
        pinnedColumns: { left: ['select'], right: ['status', 'actions'] },
      },
    })
    const th = headers(w)
    const style = (key: string) => (th[key]!.element as HTMLElement).style
    expect(style('Pilih').left).toBe('0px')
    expect(style('Aksi').right).toBe('0px')
    expect(style('Status').right).toBe('60px')
    expect(style('Status').width).toBe('120px')
    expect(th['Pilih']!.classes()).toContain('border-r')
    expect(th['Status']!.classes()).toContain('border-l')
    expect(th['Aksi']!.classes()).not.toContain('border-l')
    expect(th['Nama']!.classes()).not.toContain('sticky')
  })

  it('applies the same pins to body cells', () => {
    const w = mount(DataTable, {
      props: {
        columns,
        data,
        pinnedColumns: { left: ['select'], right: ['status', 'actions'] },
      },
    })
    const cells = w.findAll('td')
    expect((cells[0]!.element as HTMLElement).style.left).toBe('0px')
    expect((cells[2]!.element as HTMLElement).style.right).toBe('60px')
    expect((cells[3]!.element as HTMLElement).style.right).toBe('0px')
    expect(cells[1]!.classes()).not.toContain('sticky')
  })
})

describe('DataTable mobile cards', () => {
  const cardColumns: ColumnDef<object, unknown>[] = [
    { id: 'no', header: 'No', cell: () => '1' },
    { accessorKey: 'name', header: 'Nama', meta: { strong: true } },
    { id: 'wave', header: 'Gelombang', cell: () => 'G1' },
    { id: 'status', header: 'Status', cell: () => 'Diterima', meta: { mobileValue: () => 'Diterima' } },
    { id: 'secret', header: 'Rahasia', cell: () => 'x', meta: { mobile: 'hide' } },
    { id: 'actions', header: 'Aksi', cell: () => 'menu' },
  ]
  const rows: Row[] = [
    { id: '1', name: 'Ahmad' },
    { id: '2', name: 'Budi' },
  ]
  const mountCards = (extra: Record<string, unknown> = {}) =>
    mount(DataTable, {
      props: { columns: cardColumns, data: rows, mobile: 'cards', ...extra },
    })

  it('keeps the table for desktop and hides it on phones', () => {
    const w = mountCards()
    const wrapper = w.get('table').element.parentElement!.parentElement!
    expect(wrapper.className).toContain('hidden')
    expect(wrapper.className).toContain('md:block')
    expect(w.find('[data-slot="data-table-cards"]').exists()).toBe(true)
  })

  it('draws no cards unless the cards mode is on', () => {
    const w = mount(DataTable, { props: { columns: cardColumns, data: rows } })
    expect(w.find('[data-slot="data-table-cards"]').exists()).toBe(false)
  })

  it('shows the strong column as the title and the others as label and value', () => {
    const cards = mountCards().get('[data-slot="data-table-cards"]')
    const first = cards.findAll('li')[0]!
    expect(first.text()).toContain('Ahmad')
    expect(first.text()).toContain('Gelombang:')
    expect(first.text()).toContain('G1')
    expect(first.text()).toContain('Diterima')
    expect(first.text()).toContain('menu')
  })

  it('leaves out the number and the hidden columns but keeps the status label', () => {
    const first = mountCards().get('[data-slot="data-table-cards"] li')
    expect(first.text()).not.toContain('No:')
    expect(first.text()).not.toContain('Rahasia')
    expect(first.text()).toContain('Status:')
  })

  it('emits row-click with the row when rows are clickable', async () => {
    const w = mountCards({ rowClickable: true })
    await w.get('[data-slot="data-table-cards"] li [role="link"]').trigger('click')
    expect(w.emitted('row-click')![0]).toEqual([{ id: '1', name: 'Ahmad' }])
  })

  it('does not make the card a link without rowClickable', () => {
    expect(mountCards().find('[data-slot="data-table-cards"] [role="link"]').exists()).toBe(false)
  })

  it('shows the empty text and a compact pager', () => {
    const empty = mountCards({ data: [] })
    expect(empty.get('[data-slot="data-table-cards"]').text()).toContain('Tidak ada data.')
    const paged = mountCards({ totalItems: 40, pageSize: 10 })
    const text = paged.get('[data-slot="data-table-cards"]').text()
    expect(text).toContain('1 / 4')
    expect(text).toContain('dari 40')
  })

  it('draws the select cell at the left of the card', () => {
    const selectable: ColumnDef<object, unknown>[] = [
      { id: 'select', header: 'Pilih', cell: () => h('input', { type: 'checkbox', 'data-test': 'pick' }) },
      ...cardColumns,
    ]
    const w = mount(DataTable, { props: { columns: selectable, data: rows, mobile: 'cards' } })
    const first = w.get('[data-slot="data-table-cards"] li')
    expect(first.find('[data-test="pick"]').exists()).toBe(true)
    expect(first.text()).not.toContain('Pilih:')
    expect(first.element.firstElementChild!.querySelector('[data-test="pick"]')).not.toBeNull()
  })

  it('uses the mobile label and the mobile value of a column', () => {
    const columns: ColumnDef<object, unknown>[] = [
      { accessorKey: 'name', header: 'Nama', meta: { strong: true } },
      { id: 'note', header: 'Catatan', cell: () => h('b', 'rich'), meta: { mobileLabel: 'Info', mobileValue: () => 'plain' } },
    ]
    const w = mount(DataTable, { props: { columns, data: rows, mobile: 'cards' } })
    const text = w.get('[data-slot="data-table-cards"] li').text()
    expect(text).toContain('Info:')
    expect(text).toContain('plain')
    expect(text).not.toContain('rich')
  })

  it('keeps the filter slot in the middle column of the phone toolbar', () => {
    const w = mount(DataTable, {
      props: { columns: cardColumns, data: rows, mobile: 'cards', totalItems: 40, pageSize: 10 },
      slots: { 'header-left': 'Tambah', 'mobile-filter': 'Filter' },
    })
    const toolbar = w.findAll('div').find((d) => d.classes().includes('grid-cols-[1fr_auto_1fr]'))!
    expect(toolbar).toBeDefined()
    const [left, middle, right] = toolbar.element.children
    expect(left!.textContent).toContain('Tambah')
    expect(middle!.textContent).toContain('Filter')
    expect(middle!.className).toContain('justify-self-center')
    expect(right!.className).toContain('justify-self-end')
  })
})
