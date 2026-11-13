// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

const { listExams, activeSebConfigs } = vi.hoisted(() => ({
  listExams: vi.fn(),
  activeSebConfigs: vi.fn(),
}))

vi.mock('./api/studentExamApi', () => ({
  studentExamApi: { listExams, activeSebConfigs },
}))
vi.mock('@/shared/seb', () => ({ isInSeb: () => false }))

import { studentExamRoutes } from './routes'
import SebRequiredView from './views/SebRequiredView.vue'

beforeEach(() => {
  vi.clearAllMocks()
  activeSebConfigs.mockResolvedValue([])
})

describe('student exam routes outside Safe Exam Browser', () => {
  it('renders SebRequiredView and never calls the exam list', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: studentExamRoutes,
    })
    const wrapper = mount(
      { render: () => h(RouterView) },
      { global: { plugins: [router] } },
    )

    void router.push('/my-exams')
    await router.isReady()
    await flushPromises()

    expect(wrapper.findComponent(SebRequiredView).exists()).toBe(true)
    expect(listExams).not.toHaveBeenCalled()
  })
})
