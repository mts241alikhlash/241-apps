// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FileDropzone from './FileDropzone.vue'

const file = new File(['x'], 'kk.pdf', { type: 'application/pdf' })

function dropOn(w: ReturnType<typeof mount>, files: File[]) {
  const input = w.get('input').element as HTMLInputElement
  Object.defineProperty(input, 'files', { configurable: true, writable: true, value: files })
  return w.get('label').trigger('drop', { dataTransfer: { files } })
}

describe('FileDropzone', () => {
  it('shows the placeholder and the hint until a file is chosen', () => {
    const w = mount(FileDropzone, { props: { hint: 'JPG, PNG, atau PDF, maks. 5 MB' } })
    expect(w.text()).toContain('Klik atau tarik file ke sini')
    expect(w.text()).toContain('JPG, PNG, atau PDF, maks. 5 MB')
    expect(w.get('input').attributes('accept')).toBe('.jpg,.jpeg,.png,.pdf')
  })

  it('shows the file name in the drop area when it is not clearable', () => {
    const w = mount(FileDropzone, { props: { fileName: 'kk.pdf' } })
    expect(w.find('[data-slot="file-dropzone"]').exists()).toBe(true)
    expect(w.text()).toContain('kk.pdf')
    expect(w.find('[data-slot="file-dropzone-selected"]').exists()).toBe(false)
  })

  it('swaps to a removable row when clearable and a file is chosen', async () => {
    const w = mount(FileDropzone, { props: { fileName: 'kk.pdf', clearable: true } })
    expect(w.find('[data-slot="file-dropzone"]').exists()).toBe(false)
    expect(w.get('[data-slot="file-dropzone-selected"]').text()).toContain('kk.pdf')
    await w.get('button').trigger('click')
    expect(w.emitted('clear')).toHaveLength(1)
  })

  it('emits the native change event when a file is picked', async () => {
    const w = mount(FileDropzone)
    await w.get('input').trigger('change')
    expect(w.emitted('change')).toHaveLength(1)
    expect(w.emitted('change')![0]![0]).toBeInstanceOf(Event)
  })

  it('turns a drop into the same change event', async () => {
    const w = mount(FileDropzone)
    await dropOn(w, [file])
    expect(w.emitted('change')).toHaveLength(1)
  })

  it('ignores a drop while disabled', async () => {
    const w = mount(FileDropzone, { props: { disabled: true } })
    await dropOn(w, [file])
    expect(w.emitted('change')).toBeUndefined()
    expect(w.get('input').attributes('disabled')).toBeDefined()
  })

  it('marks the area and the input invalid', () => {
    const w = mount(FileDropzone, { props: { invalid: true, ariaLabel: 'Pilih bukti transfer' } })
    expect(w.get('label').attributes('data-invalid')).toBeDefined()
    expect(w.get('input').attributes('aria-invalid')).toBe('true')
    expect(w.get('input').attributes('aria-label')).toBe('Pilih bukti transfer')
  })
})
