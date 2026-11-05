import { vue } from '@mts241alikhlash/vitest-config'
import { defineConfig, mergeConfig } from 'vitest/config'

const DOM_SPECS = ['**/InstitutionDashboard.spec.ts']

export default mergeConfig(
  vue({ root: import.meta.dirname }),
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: { name: 'node', exclude: DOM_SPECS },
        },
        {
          extends: true,
          test: {
            name: 'happy-dom',
            environment: 'happy-dom',
            include: DOM_SPECS,
          },
        },
      ],
    },
  }),
)
