import { describe, expect, it } from 'vitest'
import {
  HEALTH_ROUTES,
  SERVICE_PREFIXES,
  UNROUTED_PREFIXES,
} from '../api-routes.config'

const GATEWAY_URL = (
  process.env.GATEWAY_URL ?? 'http://localhost:5173'
).replace(/\/+$/, '')

const GATEWAY_REFUSAL = 'Route not handled by gateway'

const CLIENT_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'Sec-Fetch-Mode': 'same-origin',
  'Sec-Fetch-Dest': 'empty',
} as const

interface Probe {
  status: number
  contentType: string
  body: string
}

async function probe(path: string): Promise<Probe> {
  let res: Response
  try {
    res = await fetch(`${GATEWAY_URL}${path}`, {
      headers: CLIENT_HEADERS,
      redirect: 'manual',
    })
  } catch (cause) {
    throw new Error(
      `Cannot reach ${GATEWAY_URL}: start the dev server (pnpm run dev) or ` +
        `point GATEWAY_URL at a deployed gateway.`,
      { cause },
    )
  }
  return {
    status: res.status,
    contentType: res.headers.get('content-type') ?? '',
    body: await res.text(),
  }
}

const ROUTED = Object.entries(SERVICE_PREFIXES).flatMap(([service, prefixes]) =>
  prefixes.map((p) => [p, `${service}-service`] as const),
)

describe(`gateway routing @ ${GATEWAY_URL}`, () => {
  describe.each(ROUTED)('%s -> %s', (path) => {
    it('reaches a service', async () => {
      const { status, contentType, body } = await probe(path)

      expect(
        contentType,
        `${path} was answered with HTML: it fell through to the SPA fallback ` +
          `instead of being proxied. Add it to the gateway.`,
      ).not.toContain('text/html')

      expect(
        status === 404 && body.includes(GATEWAY_REFUSAL),
        `${path} is refused by the gateway. It is in api-routes.config.ts but ` +
          `missing from infra/nginx/nginx.conf (and nginx.ssl.conf).`,
      ).toBe(false)

      expect(
        [502, 503, 504],
        `${path} routed correctly but the upstream did not answer (${status}). ` +
          `The service behind it is down, not the routing.`,
      ).not.toContain(status)
    })
  })

  const unrouted: readonly string[] = UNROUTED_PREFIXES

  if (unrouted.length === 0) {
    describe('unrouted prefixes', () => {
      it('there are none, and every prefix this app calls is routed', () => {
        expect(unrouted).toEqual([])
      })
    })
  } else {
    describe.each(unrouted)('%s (no backend yet)', (path) => {
      it('is refused, not swallowed by the SPA', async () => {
        const { status, contentType } = await probe(path)

        expect(
          contentType,
          `${path} was answered with HTML. It has no backend, so it must ` +
            `404. See UNROUTED_PREFIXES in api-routes.config.ts.`,
        ).not.toContain('text/html')

        expect(status, `${path} should 404 until a service owns it`).toBe(404)
      })
    })
  }

  describe.each(HEALTH_ROUTES)('$path', ({ path }) => {
    it('answers 200', async () => {
      const { status, body } = await probe(path)

      expect(
        body.includes(GATEWAY_REFUSAL),
        `${path} is not routed. Both services expose /health, so this prefix ` +
          `must be rewritten onto it.`,
      ).toBe(false)

      expect(status, `${path} should be 200, got ${status}`).toBe(200)
    })
  })
})
