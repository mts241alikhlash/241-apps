import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const source = (name: string) =>
  readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8')

describe('radius scale', () => {
  const theme = source('../../theme.css')

  it('steps the radius up from md instead of flattening every corner', () => {
    expect(theme).toContain('--radius-sm: calc(var(--radius) * 0.6);')
    expect(theme).toContain('--radius-md: calc(var(--radius) * 0.8);')
    expect(theme).toContain('--radius-lg: var(--radius);')
    for (const step of ['xl', '2xl', '3xl', '4xl']) {
      expect(theme).toMatch(
        new RegExp(
          `--radius-${step}: calc\\(var\\(--radius\\) \\* [\\d.]+\\);`,
        ),
      )
    }
  })

  it('draws controls and the sidebar inset with md', () => {
    for (const file of [
      './input/Input.vue',
      './textarea/Textarea.vue',
      './select/SelectTrigger.vue',
      './sidebar/SidebarInset.vue',
    ]) {
      expect(source(file), file).toContain('rounded-md')
      expect(source(file), file).not.toContain('rounded-[12px]')
    }
  })
})

describe('selection indicators', () => {
  const leftFiles = [
    './select/SelectItem.vue',
    './combobox/ComboboxItemIndicator.vue',
    './dropdown-menu/DropdownMenuCheckboxItem.vue',
    './dropdown-menu/DropdownMenuRadioItem.vue',
    './context-menu/ContextMenuCheckboxItem.vue',
    './context-menu/ContextMenuRadioItem.vue',
  ]

  it('puts the check on the left of every selectable item', () => {
    for (const file of leftFiles) {
      const text = source(file)
      expect(text, file).toContain('absolute left-2')
      expect(text, file).not.toContain('absolute right-2')
    }
  })

  it('pads the label on the left to make room for the check', () => {
    for (const file of leftFiles.filter((f) => !f.includes('Indicator'))) {
      expect(source(file), file).toContain('pl-8')
      expect(source(file), file).not.toContain('pr-8')
    }
    expect(source('./combobox/ComboboxItem.vue')).toContain('pl-8')
  })
})

describe('tooltip text', () => {
  it('wraps long text to fill the box instead of balancing the lines', () => {
    const text = source('./tooltip/TooltipContent.vue')
    expect(text).toContain('text-pretty')
    expect(text).not.toContain('text-balance')
  })
})
