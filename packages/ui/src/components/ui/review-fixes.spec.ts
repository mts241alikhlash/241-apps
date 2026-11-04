// @vitest-environment happy-dom
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { badgeVariants } from './badge'
import { buttonVariants } from './button'
import { Input } from './input'
import { Select, SelectContent, SelectItem } from './select'
import { Textarea } from './textarea'

const dir = (name: string) => fileURLToPath(new URL(name, import.meta.url))
const source = (name: string) => readFileSync(dir(name), 'utf8')

describe('review fixes', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('input and textarea use the Mira text-sm below md and the control token from md', () => {
    for (const w of [mount(Input), mount(Textarea)]) {
      const c = w.classes()
      expect(c).toContain('text-sm')
      expect(c).toContain('md:text-[length:var(--text-control,0.75rem)]')
      expect(c).not.toContain('text-base')
    }
  })

  it('textarea can still be resized', () => {
    expect(mount(Textarea).classes()).not.toContain('resize-none')
  })

  it('destructive button and badge stay solid red', () => {
    expect(buttonVariants({ variant: 'destructive' })).toContain(
      'bg-destructive text-white',
    )
    expect(badgeVariants({ variant: 'destructive' })).toContain(
      'bg-destructive text-white',
    )
  })

  it('outline button keeps the page background and a muted hover', () => {
    const c = buttonVariants({ variant: 'outline' })
    expect(c).toContain('bg-background')
    expect(c).toContain('hover:bg-muted')
    expect(c).not.toContain('hover:bg-input/50')
  })

  it('select content keeps the viewport padding and items read the md token', async () => {
    mount(Select, {
      props: { open: true },
      slots: {
        default: () =>
          h(SelectContent, null, () => h(SelectItem, { value: 'a' }, () => 'A')),
      },
      attachTo: document.body,
    })
    await flushPromises()
    const viewport = document.body.querySelector('[data-slot=select-viewport]')
    expect(viewport?.getAttribute('class')).toContain('p-1')
    const item = document.body.querySelector('[data-slot=select-item]')
    expect(item?.getAttribute('class')).toContain(
      'min-h-[var(--control-h-md,1.75rem)]',
    )
  })

  it('floated label sits away from the rounded corner, resting label lines up with the text', () => {
    const css = source('./form/FloatingLabelField.vue')
    const base = css.slice(css.indexOf(".ff :deep([data-slot='ff-label']) {"))
    expect(base.slice(0, base.indexOf('}'))).toContain('left: calc(0.375rem + 1px)')
    const resting = css.slice(css.indexOf('.ff.ff-empty:not'))
    expect(resting.slice(0, resting.indexOf('}'))).toContain(
      'left: calc(0.375rem + 1px)',
    )
    expect(base.slice(0, base.indexOf('}'))).toContain('left 150ms ease')
    expect(base.slice(0, base.indexOf('}'))).toContain('line-height: 0.5rem')
    expect(base.slice(0, base.indexOf('}'))).toContain('padding-inline: 0.125rem')
  })

  it('navigation menu link and combobox viewport use the reka attributes', () => {
    expect(source('./navigation-menu/NavigationMenuLink.vue')).toContain(
      'data-active:bg-muted',
    )
    expect(source('./navigation-menu/NavigationMenuLink.vue')).not.toContain(
      'data-[active=true]',
    )
    expect(source('./combobox/ComboboxViewport.vue')).toContain(
      '--reka-combobox-content-available-height',
    )
  })

  it('registry copies carry no code comments', () => {
    const offenders: string[] = []
    for (const folder of ['code-block', 'message-scroller', 'questionnaire']) {
      for (const file of readdirSync(dir(`./${folder}`))) {
        const lines = source(`./${folder}/${file}`).split('\n')
        lines.forEach((line, i) => {
          if (/^\s*(\/\/|\/\*|\*\s|\*\/)|<!--/.test(line)) {
            offenders.push(`${folder}/${file}:${i + 1}`)
          }
        })
      }
    }
    expect(offenders).toEqual([])
  })
})
