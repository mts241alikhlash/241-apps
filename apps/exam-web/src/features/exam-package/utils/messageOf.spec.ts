import { describe, expect, it } from 'vitest'
import { messageOf } from './messageOf'

const failure = (status: number, message: unknown, code?: string) => ({
  isAxiosError: true,
  response: {
    status,
    data: { statusCode: status, message, code, data: null },
  },
})

describe('messageOf', () => {
  it('maps exam activity and event error codes to Indonesian messages', () => {
    expect(
      messageOf(failure(422, 'Preset locked', 'PRESET_LOCKED'), 'Gagal'),
    ).toBe('Preset kebijakan untuk ujian ini dikunci oleh jenisnya.')
    expect(
      messageOf(
        failure(422, 'Token mode locked', 'TOKEN_MODE_LOCKED'),
        'Gagal',
      ),
    ).toBe('Ujian resmi wajib memakai token berputar.')
    expect(
      messageOf(failure(403, 'Final admin only', 'FINAL_ADMIN_ONLY'), 'Gagal'),
    ).toBe('Kegiatan UAS hanya dapat dibuat oleh admin ujian.')
    expect(
      messageOf(
        failure(422, 'Midterm outside event', 'MIDTERM_OUTSIDE_EVENT'),
        'Gagal',
      ),
    ).toBe('Kegiatan UTS harus berada di dalam periode UTS yang sedang aktif.')
    expect(
      messageOf(failure(422, 'Event required', 'EVENT_REQUIRED'), 'Gagal'),
    ).toBe('Kegiatan ujian wajib ditautkan ke periode ujian yang sesuai.')
    expect(
      messageOf(
        failure(422, 'Event type not exam', 'EVENT_TYPE_NOT_EXAM'),
        'Gagal',
      ),
    ).toBe('Periode ujian hanya dapat dibuat untuk UTS atau UAS.')
  })

  it('shows the message the server wrote for a refused request', () => {
    expect(
      messageOf(
        failure(409, 'Paket sudah dijadwalkan dan tidak bisa diubah'),
        'Gagal',
      ),
    ).toBe('Paket sudah dijadwalkan dan tidak bisa diubah')
    expect(
      messageOf(failure(400, 'Kelas bukan kelas tahun ajaran aktif'), 'Gagal'),
    ).toBe('Kelas bukan kelas tahun ajaran aktif')
    expect(messageOf(failure(404, 'Jadwal tidak ditemukan'), 'Gagal')).toBe(
      'Jadwal tidak ditemukan',
    )
  })

  it('shows what the server wrote when it refuses a person for a reason', () => {
    expect(
      messageOf(
        failure(
          403,
          'Anda tidak bisa menyetujui paket yang Anda susun sendiri',
        ),
        'Gagal',
      ),
    ).toBe('Anda tidak bisa menyetujui paket yang Anda susun sendiri')
  })

  it('does not show a validation list written for developers', () => {
    const text = messageOf(failure(400, ['title must be a string']), 'Gagal')

    expect(text).not.toContain('title must be')
  })

  it('keeps the standard wording for a session, permission or outage problem', () => {
    expect(messageOf(failure(401, 'Unauthorized'), 'Gagal')).toContain('login')
    expect(messageOf(failure(403, 'Forbidden resource'), 'Gagal')).toContain(
      'izin',
    )
    expect(messageOf(failure(503, 'academic down'), 'Gagal')).not.toBe(
      'academic down',
    )
  })

  it('falls back when there is no readable server message', () => {
    expect(messageOf(new Error('boom'), 'Gagal menyimpan paket.')).toBe(
      'Gagal menyimpan paket.',
    )
    expect(messageOf(failure(409, '   '), 'Gagal menyimpan paket.')).not.toBe(
      '   ',
    )
  })
})
