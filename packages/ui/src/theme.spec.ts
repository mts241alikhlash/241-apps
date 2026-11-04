import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
  fileURLToPath(new URL('./theme.css', import.meta.url)),
  'utf8',
)

const mobile = css.slice(css.indexOf('@media (max-width: 767px)'))

describe('theme.css', () => {
  it('defines every size token for desktop', () => {
    expect(css).toContain('--control-h-xs: 1.25rem')
    expect(css).toContain('--control-h-sm: 1.5rem')
    expect(css).toContain('--control-h-md: 1.75rem')
    expect(css).toContain('--control-h-lg: 2rem')
    expect(css).toContain('--text-control: 0.75rem')
    expect(css).toContain('--icon-control: 0.875rem')
  })

  it('raises the size tokens below md', () => {
    expect(mobile).toContain('--control-h-xs: 1.5rem')
    expect(mobile).toContain('--control-h-sm: 2rem')
    expect(mobile).toContain('--control-h-md: 2.25rem')
    expect(mobile).toContain('--control-h-lg: 2.5rem')
    expect(mobile).toContain('--text-control: 0.8125rem')
    expect(mobile).toContain('--icon-control: 1rem')
  })

  it('uses the logo navy as primary and as ring and sidebar primary', () => {
    expect(css).toContain('--primary: oklch(0.37 0.105 261)')
    expect(css).toContain('--ring: oklch(0.37 0.105 261)')
    expect(css).toContain('--sidebar-primary: oklch(0.37 0.105 261)')
    expect(css).toContain('--brand-gold: oklch(0.694 0.072 97)')
  })

  it('uses a deep red for destructive that sits next to the navy primary', () => {
    expect(css).toContain('--destructive: oklch(0.48 0.17 27)')
  })

  it('lets the sidebar share the page background for the inset look', () => {
    expect(css).toContain('--sidebar: var(--background)')
  })

  it('keeps the identity colors the apps already use', () => {
    expect(css).toContain('--background: oklch(0.985 0.003 260)')
    expect(css).toContain('--chart-1: oklch(0.646 0.222 41.116)')
    expect(css).toContain('--radius: 0.625rem')
  })
})
