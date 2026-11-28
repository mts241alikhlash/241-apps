// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DeliveryBadge from './DeliveryBadge.vue'

describe('DeliveryBadge', () => {
  it('shows Online alone', () => {
    const wrapper = mount(DeliveryBadge, {
      props: { deliveryMode: 'ONLINE', offlineKind: null },
    })
    expect(wrapper.text()).toBe('Online')
  })

  it.each([
    ['WRITTEN', 'Written'],
    ['PRACTICAL', 'Practical'],
  ] as const)('shows Offline with the kind %s', (kind, label) => {
    const wrapper = mount(DeliveryBadge, {
      props: { deliveryMode: 'OFFLINE', offlineKind: kind },
    })
    expect(wrapper.text()).toContain('Offline')
    expect(wrapper.text()).toContain(label)
  })

  it('shows Offline alone without a kind', () => {
    const wrapper = mount(DeliveryBadge, {
      props: { deliveryMode: 'OFFLINE', offlineKind: null },
    })
    expect(wrapper.text()).toBe('Offline')
  })
})
