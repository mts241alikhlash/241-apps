import { describe, expect, it } from 'vitest'
import {
  isServiceUnavailable,
  serviceErrorMessage,
  serviceUnavailableMessage,
  unavailableServiceLabel,
} from './service-error'

describe('isServiceUnavailable', () => {
  const withStatus = (status: number, message?: string) => ({
    response: { status, data: message ? { message } : undefined },
  })

  it('is true when the origin never answered', () => {
    expect(isServiceUnavailable({ code: 'ERR_NETWORK' })).toBe(true)
    expect(isServiceUnavailable({ message: 'Network Error' })).toBe(true)
  })

  it('is true for the gateway failing to reach an upstream', () => {
    expect(isServiceUnavailable(withStatus(502))).toBe(true)
    expect(isServiceUnavailable(withStatus(504))).toBe(true)
  })

  it('is true for a service whose own dependency is unreachable', () => {
    expect(
      isServiceUnavailable(
        withStatus(503, 'The hr service could not be reached, ...'),
      ),
    ).toBe(true)
  })

  it('is false for a 500, which is a bug rather than an outage', () => {
    expect(isServiceUnavailable(withStatus(500))).toBe(false)
  })

  it('is false for the ordinary refusals', () => {
    expect(isServiceUnavailable(withStatus(403))).toBe(false)
    expect(isServiceUnavailable(withStatus(404))).toBe(false)
    expect(isServiceUnavailable(withStatus(409))).toBe(false)
  })

  it('is false for a resolved response and for nothing at all', () => {
    expect(isServiceUnavailable(undefined)).toBe(false)
    expect(isServiceUnavailable(null)).toBe(false)
    expect(isServiceUnavailable({})).toBe(false)
  })
})

describe('naming the service', () => {
  it('reads the service out of the 503 a service raises', () => {
    const err = {
      response: {
        status: 503,
        data: {
          message:
            'The hr service could not be reached, so this request cannot be answered.',
        },
      },
    }

    expect(unavailableServiceLabel(err)).toBe('Kepegawaian')
    expect(serviceUnavailableMessage(err)).toContain('Kepegawaian')
  })

  it('names the upstream from the request URL when the body cannot', () => {
    const err = { response: { status: 502 }, config: { url: '/students' } }

    expect(unavailableServiceLabel(err)).toBe('Kesiswaan')
    expect(serviceUnavailableMessage(err)).toContain('Kesiswaan')
  })

  it('reads the prefix, not the rest of the path or the query', () => {
    const at = (url: string) =>
      unavailableServiceLabel({ response: { status: 502 }, config: { url } })

    expect(at('/student-graduations/candidates?page=1')).toBe('Kesiswaan')
    expect(at('/employees/abc/exists')).toBe('Kepegawaian')
    expect(at('https://app.example.test/api/v1')).toBeNull()
  })

  it('stays general when there is no body and no URL to read', () => {
    const err = { response: { status: 502 } }

    expect(unavailableServiceLabel(err)).toBeNull()
    expect(serviceUnavailableMessage(err)).toBe(
      'Salah satu layanan sedang tidak berjalan, jadi data ini belum bisa ditampilkan.',
    )
  })

  it('prefers what the body says over what the URL implies', () => {
    const err = {
      config: { url: '/classrooms' },
      response: {
        status: 503,
        data: { message: 'The student service could not be reached.' },
      },
    }

    expect(unavailableServiceLabel(err)).toBe('Kesiswaan')
  })

  it('names a service nobody serves as unknown rather than raw', () => {
    const err = {
      response: {
        status: 503,
        data: { message: 'The billing service could not be reached.' },
      },
    }

    expect(unavailableServiceLabel(err)).toBeNull()
  })

  it('says a 500 is a fault in a named service, not an outage', () => {
    const err = {
      config: { url: '/students' },
      response: { status: 500, data: { message: 'Internal server error' } },
    }

    expect(isServiceUnavailable(err)).toBe(false)
    expect(serviceErrorMessage(err)).toBe(
      'Layanan Kesiswaan mengalami kesalahan. Silakan coba lagi nanti.',
    )
  })

  it('keeps a 504 a timeout, not an outage, even once it can name the service', () => {
    const err = { response: { status: 504 }, config: { url: '/students' } }

    expect(serviceUnavailableMessage(err)).toBe(
      'Layanan Kesiswaan terlalu lama merespons. Silakan coba lagi.',
    )
  })

  it('tells someone offline that it is their connection', () => {
    expect(serviceUnavailableMessage({ code: 'ERR_NETWORK' })).toContain(
      'koneksi internet',
    )
  })
})
