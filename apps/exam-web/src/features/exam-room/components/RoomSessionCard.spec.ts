// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RoomSessionCard from './RoomSessionCard.vue'

const START = Date.parse('2026-11-28T00:00:00.000Z')
const END = Date.parse('2026-11-28T01:15:00.000Z')

const mountCard = (nowMs: number) =>
  mount(RoomSessionCard, {
    props: {
      token: null,
      minutesLeft: null,
      startsAt: new Date(START).toISOString(),
      endsAt: new Date(END).toISOString(),
      nowMs,
      staleness: 'fresh',
      secondsSince: 0,
    },
  })

describe('RoomSessionCard', () => {
  it('counts down to the start before the slot begins', () => {
    const text = mountCard(START - 6 * 86_400_000 + 3_600_000 * 5).text()

    expect(text).toContain('Mulai dalam')
    expect(text).toContain('5 hari 19 jam')
    expect(text).not.toContain('Sisa waktu')
  })

  it('shows clock time just before the start', () => {
    const text = mountCard(START - 90_000).text()

    expect(text).toContain('Mulai dalam')
    expect(text).toContain('00:01:30')
  })

  it('counts down to the end while the slot runs', () => {
    const text = mountCard(START + 15 * 60_000).text()

    expect(text).toContain('Sisa waktu')
    expect(text).toContain('01:00:00')
  })

  it('says the session ended after the slot', () => {
    const text = mountCard(END + 1000).text()

    expect(text).toContain('Sesi berakhir')
    expect(text).toContain('00:00:00')
  })
})
