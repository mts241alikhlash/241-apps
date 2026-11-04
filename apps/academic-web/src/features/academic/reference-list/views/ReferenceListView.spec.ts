// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, reactive, type PropType } from 'vue'
import ReferenceListView from './ReferenceListView.vue'

const route = reactive({ meta: { referenceList: 'transportations' } })
const mounted: string[] = []

vi.mock('vue-router', () => ({ useRoute: () => route }))
vi.mock('@/features/platform/auth', () => ({
  useRoleGuard: () => ({ can: () => true }),
}))
vi.mock('@/reference-data', () => ({
  ReferenceDataListView: defineComponent({
    props: {
      config: {
        type: Object as PropType<{ entityLabel: { singular: string } }>,
        required: true,
      },
    },
    mounted() {
      mounted.push(this.config.entityLabel.singular)
    },
    template: '<div />',
  }),
}))

describe('ReferenceListView', () => {
  it('loads the list the new route names when the menu moves between two lists', async () => {
    mount(ReferenceListView)
    route.meta.referenceList = 'domiciles'
    await nextTick()

    expect(mounted).toEqual(['Transportasi', 'Domisili'])
  })
})
