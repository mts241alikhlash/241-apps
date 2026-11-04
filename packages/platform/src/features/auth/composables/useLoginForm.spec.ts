// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { authConfig, configureAuth } from '../config'
import { useLoginForm } from './useLoginForm'

const push = vi.fn()
const loginUser = vi.fn()

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('./useAuthLogin', () => ({ useAuthLogin: () => ({ loginUser }) }))

function submit() {
  let api!: ReturnType<typeof useLoginForm>
  mount(
    defineComponent({
      setup() {
        api = useLoginForm()
        return () => null
      },
    }),
  )
  api.form.setValues({ identifier: 'admin', password: 'secret' })
  return api
}

describe('useLoginForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockReset()
    loginUser.mockReset().mockResolvedValue(undefined)
  })

  it('goes to the configured home route after login', async () => {
    configureAuth({ homeRoute: '/beranda' })
    const api = submit()
    await api.onSubmit()
    await flushPromises()
    expect(push).toHaveBeenCalledWith('/beranda')
  })

  it('goes to / with the default config', async () => {
    authConfig.value.homeRoute = '/'
    const api = submit()
    await api.onSubmit()
    await flushPromises()
    expect(push).toHaveBeenCalledWith('/')
  })
})
