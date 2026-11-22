const IMAGE_TIMEOUT_MS = 8000

export async function waitForPrintImages(
  root: ParentNode = document,
): Promise<void> {
  const images = [...root.querySelectorAll<HTMLImageElement>('.print-only img')]
  const pending = images.filter((image) => !image.complete)
  if (pending.length === 0) return
  await Promise.race([
    Promise.all(
      pending.map(
        (image) =>
          new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          }),
      ),
    ),
    new Promise<void>((resolve) => setTimeout(resolve, IMAGE_TIMEOUT_MS)),
  ])
}
