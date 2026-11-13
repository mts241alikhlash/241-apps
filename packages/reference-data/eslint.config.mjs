import { vue } from '@mts241alikhlash/eslint-config'

export default vue({
  tsconfigRootDir: import.meta.dirname,
  overrides: [
    {
      files: ['src/components/ReferenceDataListView.vue'],
      rules: { '@typescript-eslint/no-unnecessary-type-assertion': 'off' },
    },
  ],
})
