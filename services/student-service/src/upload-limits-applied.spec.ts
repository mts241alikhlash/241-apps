import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('UPLOAD_LIMITS', () => {
  it('is applied by every file interceptor in this service', () => {
    const unlimited = globSync('**/*.ts', { cwd: __dirname })
      .filter((file) => !file.endsWith('.spec.ts'))
      .flatMap((file) => {
        const source = readFileSync(join(__dirname, file), 'utf8')
        return [...source.matchAll(/FileInterceptor\(([^)]*)\)/g)]
          .filter((call) => !call[1].includes('limits: UPLOAD_LIMITS'))
          .map(() => file)
      })

    expect(unlimited).toEqual([])
  })
})
