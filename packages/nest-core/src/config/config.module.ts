import { DynamicModule, Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import type { ZodType } from 'zod'

@Module({})
export class AppConfigModule {
  static forRoot(schema: ZodType): DynamicModule {
    return {
      module: AppConfigModule,
      imports: [
        NestConfigModule.forRoot({
          isGlobal: true,
          validate: (config: Record<string, unknown>) => {
            const result = schema.safeParse(config)
            if (!result.success) {
              const errors = result.error.issues
                .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
                .join('\n')
              throw new Error(`Environment validation failed:\n${errors}`)
            }
            return result.data as Record<string, unknown>
          },
        }),
      ],
    }
  }
}
