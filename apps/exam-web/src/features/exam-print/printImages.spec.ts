import { describe, expect, it, vi } from 'vitest'
import { waitForPrintImages } from './printImages'

type Listener = () => void

const fakeImage = (complete: boolean) => {
  const listeners = new Map<string, Listener>()
  return {
    complete,
    addEventListener: (event: string, listener: Listener) => {
      listeners.set(event, listener)
    },
    fire: (event: string) => listeners.get(event)?.(),
  }
}

const rootWith = (images: ReturnType<typeof fakeImage>[]) =>
  ({ querySelectorAll: () => images }) as unknown as ParentNode

describe('waitForPrintImages', () => {
  it('returns at once when every image is already loaded', async () => {
    await expect(
      waitForPrintImages(rootWith([fakeImage(true)])),
    ).resolves.toBeUndefined()
  })

  it('waits until the pending image finishes loading', async () => {
    const image = fakeImage(false)
    const done = vi.fn()
    const waiting = waitForPrintImages(rootWith([image, fakeImage(true)])).then(
      done,
    )

    await Promise.resolve()
    expect(done).not.toHaveBeenCalled()

    image.fire('load')
    await waiting
    expect(done).toHaveBeenCalled()
  })

  it('stops waiting for an image that fails to load', async () => {
    const image = fakeImage(false)
    const waiting = waitForPrintImages(rootWith([image]))

    image.fire('error')
    await expect(waiting).resolves.toBeUndefined()
  })
})
