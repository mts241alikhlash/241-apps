import { Test } from '@nestjs/testing'
import { z } from 'zod'
import { AppConfigModule } from './config.module.js'

describe('AppConfigModule', () => {
  const schema = z.object({ PORT: z.coerce.number() })

  it('rejects an environment that fails the schema and names the key', async () => {
    delete process.env.PORT
    await expect(
      Test.createTestingModule({
        imports: [AppConfigModule.forRoot(schema)],
      }).compile(),
    ).rejects.toThrow(/Environment validation failed:[\s\S]*PORT/)
  })

  it('accepts an environment that passes the schema', async () => {
    process.env.PORT = '3000'
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule.forRoot(schema)],
    }).compile()
    expect(moduleRef).toBeDefined()
    delete process.env.PORT
  })
})
