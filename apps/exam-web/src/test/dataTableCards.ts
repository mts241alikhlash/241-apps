import { flushPromises } from '@vue/test-utils'
import type { DOMWrapper, VueWrapper } from '@vue/test-utils'

type Parent = Pick<VueWrapper, 'findAll' | 'find' | 'get' | 'findComponent'>

export const CARDS = '[data-slot="data-table-cards"]'

export const cardRows = (wrapper: Parent) => wrapper.findAll(`${CARDS} li`)

export const cardRow = (wrapper: Parent, index = 0) => cardRows(wrapper)[index]

export const cardsFooter = (wrapper: Parent) => wrapper.get(CARDS)

export const nextCardPage = (wrapper: Parent) =>
  wrapper.get(`${CARDS} [aria-label="Halaman berikutnya"]`)

export const previousCardPage = (wrapper: Parent) =>
  wrapper.get(`${CARDS} [aria-label="Halaman sebelumnya"]`)

export async function openRowMenu(row: DOMWrapper<Element>) {
  closeMenus()
  const trigger = row.findAll('button').find((b) => b.text().includes('Opsi'))
  if (!trigger) throw new Error('row has no action menu')
  await trigger.trigger('keydown', { key: 'Enter' })
  await flushPromises()
}

export function menuLabels() {
  return [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
    item.textContent?.trim(),
  )
}

export async function chooseRowAction(row: DOMWrapper<Element>, label: string) {
  await openRowMenu(row)
  const item = [...document.body.querySelectorAll('[role="menuitem"]')].find(
    (element) => element.textContent?.trim() === label,
  ) as HTMLElement | undefined
  if (!item) throw new Error(`no menu item "${label}"`)
  item.click()
  await flushPromises()
}

export function closeMenus() {
  document.body
    .querySelectorAll('[role="menu"]')
    .forEach((menu) => menu.remove())
}

type ActionProps = Record<string, (...args: unknown[]) => unknown>

export function rowActionProps<T>(wrapper: Parent, original: T): ActionProps {
  const columns = wrapper
    .findComponent({ name: 'DataTable' })
    .props('columns') as {
    id?: string
    cell: (context: { row: { original: T } }) => { props: ActionProps }
  }[]
  const column = columns.find((item) => item.id === 'actions')
  if (!column) throw new Error('no actions column')
  return column.cell({ row: { original } }).props
}
