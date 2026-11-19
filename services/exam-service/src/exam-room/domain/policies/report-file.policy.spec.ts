import { detectReportFile, extensionOf } from './report-file.policy.js'

describe('detectReportFile', () => {
  it.each([
    [Buffer.from('%PDF-1.7'), 'application/pdf', 'pdf'],
    [Buffer.from([0xff, 0xd8, 0xff, 0xe1]), 'image/jpeg', 'jpg'],
    [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]), 'image/png', 'png'],
  ])('detects by magic bytes', (buffer, mimeType, extension) => {
    expect(detectReportFile(buffer)).toEqual({ mimeType, extension })
  })

  it('refuses text, webp and empty input', () => {
    expect(detectReportFile(Buffer.from('%PDX-'))).toBeNull()
    expect(detectReportFile(Buffer.from('RIFF....WEBP'))).toBeNull()
    expect(detectReportFile(Buffer.alloc(0))).toBeNull()
  })

  it('maps a mime type to an extension', () => {
    expect(extensionOf('image/png')).toBe('png')
    expect(extensionOf('text/plain')).toBe('bin')
  })
})
