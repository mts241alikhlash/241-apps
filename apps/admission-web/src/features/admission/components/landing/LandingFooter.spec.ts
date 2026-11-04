// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import LandingFooter from './LandingFooter.vue'

const mountFooter = (props: {
  showDownloads?: boolean
  showInfo?: boolean
  showStories?: boolean
}) =>
  mount(LandingFooter, {
    props,
    global: { stubs: { RouterLink: RouterLinkStub } },
  })

describe('LandingFooter', () => {
  it('has no downloads link by default', () => {
    const links = mountFooter({}).findAll('a')
    expect(links.map((link) => link.attributes('href'))).not.toContain(
      '#unduhan',
    )
  })

  it('links to the downloads section, after Persyaratan, when files exist', () => {
    const links = mountFooter({ showDownloads: true })
      .findAll('a')
      .map((link) => [link.text(), link.attributes('href')])

    expect(links).toContainEqual(['Unduhan', '#unduhan'])
    const labels = links.map(([label]) => label)
    expect(labels.indexOf('Unduhan')).toBe(labels.indexOf('Persyaratan') + 1)
  })

  it('links to the information posters, after Gelombang, only when they exist', () => {
    const without = mountFooter({})
      .findAll('a')
      .map((link) => link.attributes('href'))
    expect(without).not.toContain('#informasi')

    const links = mountFooter({ showInfo: true })
      .findAll('a')
      .map((link) => [link.text(), link.attributes('href')])
    expect(links).toContainEqual(['Informasi PPDB', '#informasi'])
    const labels = links.map(([label]) => label)
    expect(labels.indexOf('Informasi PPDB')).toBe(
      labels.indexOf('Gelombang') + 1,
    )
  })

  it('links to the stories by default and hides the link when there is no story', () => {
    const hrefs = (props: { showStories?: boolean }) =>
      mountFooter(props)
        .findAll('a')
        .map((link) => link.attributes('href'))
    expect(hrefs({})).toContain('#cerita')
    expect(hrefs({ showStories: false })).not.toContain('#cerita')
  })
})
