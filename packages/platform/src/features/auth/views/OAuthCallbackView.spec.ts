// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { replaceMock, queryRef } = vi.hoisted(
  (): {
    replaceMock: ReturnType<typeof vi.fn>
    queryRef: { value: Record<string, string> }
  } => ({
    replaceMock: vi.fn(),
    queryRef: { value: {} },
  }),
)

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: queryRef.value }),
  useRouter: () => ({ replace: replaceMock }),
}))

const { restoreSessionMock, hydrateUserMock, ensureMock, store } = vi.hoisted(
  () => ({
    restoreSessionMock: vi.fn(),
    hydrateUserMock: vi.fn(),
    ensureMock: vi.fn(),
    store: {
      user: null as { roles: string[] } | null,
      setUser: (user: { roles: string[] }) => {
        store.user = user
      },
    },
  }),
)

vi.mock('../index', () => ({
  authService: { restoreSession: restoreSessionMock },
  authSessionService: { hydrateUser: hydrateUserMock },
  useAuthStore: () => store,
}))

const { completeSignInMock } = vi.hoisted(() => ({
  completeSignInMock: vi.fn(),
}))

vi.mock('../services/ssoService', () => ({
  ssoService: { completeSignIn: completeSignInMock },
}))

import { configureAuth } from '../config'
import OAuthCallbackView from './OAuthCallbackView.vue'

const buttonStub = { template: '<button><slot /></button>' }

function mountView() {
  return mount(OAuthCallbackView, {
    global: { stubs: { Button: buttonStub } },
  })
}

describe('OAuthCallbackView outcomes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryRef.value = {}
    store.user = { roles: ['TEACHER'] }
    configureAuth({ ensureApplicantApplication: ensureMock })
  })

  it('restores, ensures and opens the form for signup-created', async () => {
    queryRef.value = { oauthOutcome: 'signup-created' }
    store.user = { roles: ['APPLICANT'] }
    restoreSessionMock.mockResolvedValue(true)
    ensureMock.mockResolvedValue({ id: 'app-1' })

    mountView()
    await flushPromises()

    expect(restoreSessionMock).toHaveBeenCalledTimes(1)
    expect(ensureMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith({ name: 'applicant-form' })
  })

  it('restores, ensures and opens the form for signup-existing', async () => {
    queryRef.value = { oauthOutcome: 'signup-existing' }
    store.user = { roles: ['APPLICANT'] }
    restoreSessionMock.mockResolvedValue(true)
    ensureMock.mockResolvedValue({ id: 'app-1' })

    mountView()
    await flushPromises()

    expect(restoreSessionMock).toHaveBeenCalledTimes(1)
    expect(ensureMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith({ name: 'applicant-form' })
  })

  it('shows the not-open state for signup-disabled without touching the session', async () => {
    queryRef.value = { oauthOutcome: 'signup-disabled' }

    const wrapper = mountView()
    await flushPromises()

    expect(restoreSessionMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Pendaftaran dengan Google belum dibuka')
    expect(replaceMock).not.toHaveBeenCalledWith({ name: 'applicant-form' })
  })

  it('keeps the feature-001 behavior when no outcome is present', async () => {
    queryRef.value = {}
    store.user = { roles: ['TEACHER'] }
    restoreSessionMock.mockResolvedValue(true)

    mountView()
    await flushPromises()

    expect(restoreSessionMock).toHaveBeenCalledTimes(1)
    expect(ensureMock).not.toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith('/')
  })

  it('completes a staff sign-in when the callback carries a code', async () => {
    completeSignInMock.mockResolvedValue('/admissions')
    queryRef.value = { code: 'the-code', state: 's' }

    mountView()
    await flushPromises()

    expect(completeSignInMock).toHaveBeenCalledWith('the-code', 's')
    expect(replaceMock).toHaveBeenCalledWith('/admissions')
  })

  it('tells a staff account to use the school sign-in', async () => {
    queryRef.value = { oauthOutcome: 'staff-account' }

    const wrapper = mountView()
    await flushPromises()

    expect(restoreSessionMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Gunakan akun sekolah')
  })

  it('shows the invalid-session state when the code exchange fails', async () => {
    completeSignInMock.mockResolvedValue(null)
    queryRef.value = { code: 'the-code', state: 's' }

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Sesi masuk tidak valid')
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
