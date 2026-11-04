// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from './dropdown-menu'
import { Popover, PopoverContent } from './popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

const text = 'text-[length:var(--text-control,0.75rem)]'
const md = 'min-h-[var(--control-h-md,1.75rem)]'

function classOf(selector: string) {
  const el = document.body.querySelector(selector)
  expect(el, selector).not.toBeNull()
  return el!.getAttribute('class') ?? ''
}

describe('overlays', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('dropdown item is a md control row with the control text token', async () => {
    mount(DropdownMenu, {
      props: { open: true },
      slots: {
        default: () =>
          h(DropdownMenuContent, null, () => [
            h(DropdownMenuLabel, null, () => 'L'),
            h(DropdownMenuItem, null, () => 'Item'),
          ]),
      },
      attachTo: document.body,
    })
    await flushPromises()
    const item = classOf('[data-slot=dropdown-menu-item]')
    expect(item).toContain(md)
    expect(item).toContain(text)
    expect(item).toContain('rounded-md')
    expect(classOf('[data-slot=dropdown-menu-label]')).toContain(text)
  })

  it('dialog keeps its default width and close button, with Mira title and text', async () => {
    mount(Dialog, {
      props: { open: true },
      slots: {
        default: () =>
          h(DialogContent, null, () => [
            h(DialogTitle, null, () => 'T'),
            h(DialogDescription, null, () => 'D'),
          ]),
      },
      attachTo: document.body,
    })
    await flushPromises()
    const content = classOf('[data-slot=dialog-content]')
    expect(content).toContain('sm:max-w-sm')
    expect(content).toContain('rounded-md')
    expect(content).toContain('p-4')
    expect(document.body.querySelector('[data-slot=dialog-close]')).not.toBeNull()
    const title = classOf('[data-slot=dialog-title]')
    expect(title).toContain('text-sm')
    expect(title).toContain('font-medium')
    expect(classOf('[data-slot=dialog-description]')).toContain(text)
  })

  it('popover uses the md radius and text', async () => {
    mount(Popover, {
      props: { open: true },
      slots: { default: () => h(PopoverContent, null, () => 'P') },
      attachTo: document.body,
    })
    await flushPromises()
    const c = classOf('[data-slot=popover-content]')
    expect(c).toContain('rounded-md')
    expect(c).toContain(text)
  })

  it('tooltip keeps its compact text', async () => {
    mount(TooltipProvider, {
      slots: {
        default: () =>
          h(Tooltip, { open: true }, () => [
            h(TooltipTrigger, null, () => 'x'),
            h(TooltipContent, null, () => 'tip'),
          ]),
      },
      attachTo: document.body,
    })
    await flushPromises()
    expect(classOf('[data-slot=tooltip-content]')).toContain('text-xs')
  })
})
