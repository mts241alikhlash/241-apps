// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PublishScoresDialog from './PublishScoresDialog.vue'

const button = (label: string) =>
  [...document.body.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === label,
  )

const mountDialog = (props: Record<string, unknown> = {}) =>
  mount(PublishScoresDialog, {
    props: {
      open: true,
      missingNames: [],
      message: null,
      busy: false,
      ...props,
    },
    attachTo: document.body,
  })

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('PublishScoresDialog', () => {
  it('names the students left out and asks to send without them', async () => {
    const wrapper = mountDialog({ missingNames: ['Citra', 'Dewi'] })
    await flushPromises()
    const list = document.body.querySelector('[data-test="missing"]')!
    expect(
      [...list.querySelectorAll('li')].map((item) => item.textContent?.trim()),
    ).toEqual(['Citra', 'Dewi'])
    expect(button('Kirim')).toBeUndefined()
    button('Kirim tanpa siswa ini')!.click()
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('asks a plain confirmation when every present student has a score', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    expect(document.body.querySelector('[data-test="missing"]')).toBeNull()
    expect(button('Kirim tanpa siswa ini')).toBeUndefined()
    button('Kirim')!.click()
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('shows the message of the server', async () => {
    mountDialog({ message: 'Belum dinilai: Citra', missingNames: ['Citra'] })
    await flushPromises()
    expect(
      document.body.querySelector('[role="alert"]')?.textContent,
    ).toContain('Belum dinilai: Citra')
  })

  it('blocks a second send while one runs', async () => {
    mountDialog({ busy: true })
    await flushPromises()
    expect(button('Mengirim...')?.disabled).toBe(true)
  })
})
