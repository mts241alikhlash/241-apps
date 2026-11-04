// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { expect, it, vi } from 'vitest'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import DocumentsStep from './DocumentsStep.vue'

const base = { isActive: true, sortOrder: 1, isRequired: false }
const types = [
  {
    ...base,
    id: 'kk',
    code: 'KK',
    name: 'Kartu Keluarga',
    requirement: 'REQUIRED',
    lateDueMonths: null,
  },
  {
    ...base,
    id: 'ijazah',
    code: 'IJAZAH',
    name: 'Ijazah SD',
    requirement: 'LATER',
    lateDueMonths: 3,
    dueDate: '2026-09-30',
  },
  {
    ...base,
    id: 'rapor',
    code: 'RAPOR',
    name: 'Rapor',
    requirement: 'LATER',
    lateDueMonths: 3,
    dueDate: null,
  },
  {
    ...base,
    id: 'prestasi',
    code: 'PRESTASI',
    name: 'Sertifikat prestasi',
    requirement: 'OPTIONAL',
    lateDueMonths: null,
  },
]

function mountStep(documents: unknown[] = []) {
  return mount(
    defineComponent({
      setup: () => () =>
        h(TooltipProvider, null, () =>
          h(DocumentsStep, {
            documentTypes: types,
            documents,
            documentFiles: {},
            uploadingDoc: null,
            editable: true,
            onFileChange: vi.fn(),
            onClearFile: vi.fn(),
            onUpload: vi.fn(),
          } as never),
        ),
    }),
  )
}

const firstCells = (wrapper: ReturnType<typeof mountStep>) =>
  wrapper.findAll('tbody tr').map((row) => row.findAll('td')[0].text())

it('lists every type in one table ordered Wajib, Susulan and Opsional', async () => {
  const wrapper = mountStep()
  await flushPromises()

  expect(wrapper.find('section').exists()).toBe(false)
  expect(wrapper.text()).not.toContain('Wajib diunggah sekarang')
  expect(wrapper.text()).not.toContain('Boleh menyusul')
  expect(firstCells(wrapper).map((text) => text.replace(/\s*\*$/, ''))).toEqual(
    [
      'Kartu Keluarga',
      'Ijazah SDBoleh dikirim belakangan. Serahkan ke TU paling lambat 30 September 2026.',
      'RaporBoleh dikirim belakangan. Serahkan ke TU sesuai pemberitahuan sekolah.',
      'Sertifikat prestasi',
    ],
  )
})

it('marks only the required type with an asterisk', async () => {
  const wrapper = mountStep()
  await flushPromises()

  const [required, ...others] = firstCells(wrapper)
  expect(required).toContain('*')
  for (const text of others) expect(text).not.toContain('*')
})

it('shows "Serahkan ke TU paling lambat <tanggal>" for a susulan row', async () => {
  const wrapper = mountStep()
  await flushPromises()

  expect(wrapper.text()).toContain(
    'Serahkan ke TU paling lambat 30 September 2026',
  )
})

it('shows "sesuai pemberitahuan sekolah" when there is no due date', async () => {
  const wrapper = mountStep()
  await flushPromises()

  expect(wrapper.text()).toContain('sesuai pemberitahuan sekolah')
})

const rejected = [
  {
    id: 'doc1',
    documentTypeId: 'kk',
    status: 'REJECTED',
    note: 'Foto buram',
    file: { id: 'f1', originalName: 'kk.jpg', mimeType: 'image/jpeg' },
  },
]

it('keeps the reviewer note out of the table cells and in a tooltip on the status badge', async () => {
  const wrapper = mountStep(rejected)
  await flushPromises()

  const row = wrapper.findAll('tbody tr')[0]
  expect(row.text()).not.toContain('Catatan:')
  expect(row.text()).not.toContain('Foto buram')
  const badge = row.findAll('td')[2].get('[data-slot="tooltip-trigger"]')
  expect(badge.text()).toBe('Ditolak')
  expect(badge.attributes('tabindex')).toBe('0')
  expect(badge.classes()).toContain('cursor-help')
})

it('puts the reviewer note next to the status on the phone card', async () => {
  const wrapper = mountStep(rejected)
  await flushPromises()

  const card = wrapper.get('[data-slot="data-table-cards"] li')
  expect(card.text()).toContain('Status:Ditolak. Foto buram')
})

it('shows no tooltip trigger for a document without a note', async () => {
  const wrapper = mountStep([{ ...rejected[0], status: 'PENDING', note: null }])
  await flushPromises()

  const badge = wrapper
    .findAll('tbody tr')[0]
    .findAll('td')[2]
    .get('[data-slot="badge"]')
  expect(badge.attributes('tabindex')).toBeUndefined()
})
