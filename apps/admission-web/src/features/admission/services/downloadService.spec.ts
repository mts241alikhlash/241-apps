import { beforeEach, expect, it, vi } from 'vitest'
import { downloadService } from './downloadService'

const api = vi.hoisted(() => ({
  getDownloads: vi.fn(),
  createDownload: vi.fn(),
  updateDownload: vi.fn(),
  reorderDownloads: vi.fn(),
  deleteDownload: vi.fn(),
}))
vi.mock('../api/admissionApi', () => ({ admissionApi: api }))

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('vue-sonner', () => ({ toast }))

const payload = {
  title: 'Brosur',
  description: '',
  isActive: true,
  file: new File(['%PDF-'], 'a.pdf', { type: 'application/pdf' }),
}

beforeEach(() => vi.clearAllMocks())

it('loads the list', async () => {
  api.getDownloads.mockResolvedValue({ data: { data: [{ id: 'd1' }] } })
  await expect(downloadService.fetchAll()).resolves.toEqual({
    downloads: [{ id: 'd1' }],
  })
})

it('reports a load failure as an error message', async () => {
  api.getDownloads.mockRejectedValue(new Error('boom'))
  const result = await downloadService.fetchAll()
  expect(result).toHaveProperty('error')
  expect(typeof (result as { error: string }).error).toBe('string')
})

it('creates when there is no id and updates when there is one', async () => {
  api.createDownload.mockResolvedValue({})
  api.updateDownload.mockResolvedValue({})

  await expect(downloadService.save(null, payload)).resolves.toEqual({
    success: true,
  })
  expect(api.createDownload).toHaveBeenCalledWith(payload)
  expect(toast.success).toHaveBeenLastCalledWith('Berkas ditambahkan.')

  await expect(downloadService.save('d1', payload)).resolves.toEqual({
    success: true,
  })
  expect(api.updateDownload).toHaveBeenCalledWith('d1', payload)
  expect(toast.success).toHaveBeenLastCalledWith('Berkas diperbarui.')
})

it('toasts the failure and reports it', async () => {
  api.createDownload.mockRejectedValue(new Error('boom'))
  await expect(downloadService.save(null, payload)).resolves.toEqual({
    success: false,
  })
  expect(toast.error).toHaveBeenCalledTimes(1)
})

it('reorders and deletes with a success flag', async () => {
  api.reorderDownloads.mockResolvedValue({})
  api.deleteDownload.mockResolvedValue({})
  await expect(downloadService.reorder(['b', 'a'])).resolves.toEqual({
    success: true,
  })
  expect(api.reorderDownloads).toHaveBeenCalledWith(['b', 'a'])
  await expect(downloadService.remove('d1')).resolves.toEqual({ success: true })
  expect(toast.success).toHaveBeenLastCalledWith('Berkas dihapus.')

  api.deleteDownload.mockRejectedValue(new Error('boom'))
  await expect(downloadService.remove('d1')).resolves.toEqual({
    success: false,
  })
})
