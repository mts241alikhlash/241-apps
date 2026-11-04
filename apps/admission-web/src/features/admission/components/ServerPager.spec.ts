// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ServerPager from './ServerPager.vue'

function mountPager(
  props: Partial<InstanceType<typeof ServerPager>['$props']> = {},
) {
  return mount(ServerPager, {
    props: {
      page: 1,
      pageSize: 10,
      total: 25,
      itemLabel: 'pendaftar',
      ...props,
    },
  })
}

it('shows the range and the page count', () => {
  const wrapper = mountPager({ page: 2 })

  expect(wrapper.text()).toContain('11–20 dari 25 pendaftar')
  expect(wrapper.text()).toContain('Halaman 2 dari 3')
})

it('shows the short last page', () => {
  expect(mountPager({ page: 3 }).text()).toContain('21–25 dari 25 pendaftar')
})

it('shows 0–0 and no buttons when there is nothing', () => {
  const wrapper = mountPager({ total: 0 })

  expect(wrapper.text()).toContain('0–0 dari 0 pendaftar')
  expect(wrapper.find('[data-test="pager-next"]').exists()).toBe(false)
})

it('hides the buttons when everything fits on one page', () => {
  expect(mountPager({ total: 10 }).find('button').exists()).toBe(false)
})

it('disables previous on the first page and next on the last', () => {
  const first = mountPager({ page: 1 })
  expect(
    first.get('[data-test="pager-previous"]').attributes('disabled'),
  ).toBeDefined()
  const last = mountPager({ page: 3 })
  expect(
    last.get('[data-test="pager-next"]').attributes('disabled'),
  ).toBeDefined()
})

it('asks for the neighboring page', async () => {
  const wrapper = mountPager({ page: 2 })

  await wrapper.get('[data-test="pager-next"]').trigger('click')
  await wrapper.get('[data-test="pager-previous"]').trigger('click')

  expect(wrapper.emitted('update:page')).toEqual([[3], [1]])
})

it('cannot be used while disabled', () => {
  const wrapper = mountPager({ page: 2, disabled: true })

  expect(
    wrapper.get('[data-test="pager-next"]').attributes('disabled'),
  ).toBeDefined()
  expect(
    wrapper.get('[data-test="pager-previous"]').attributes('disabled'),
  ).toBeDefined()
})
