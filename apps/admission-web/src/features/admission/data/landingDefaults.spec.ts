import { describe, expect, it } from 'vitest'
import { landingDefaults } from './landingDefaults'

describe('landingDefaults', () => {
  it('keeps the content that was written in the components', () => {
    expect(landingDefaults.hero.titleLines).toEqual([
      'Di sini, cerita',
      'barumu dimulai.',
    ])
    expect(landingDefaults.hero.schoolPhoto.image).toEqual({
      src: '/hero/baiat.webp',
    })
    expect(landingDefaults.hero.studyPhoto.image).toEqual({
      src: '/hero/tahfidz.webp',
    })
    expect(landingDefaults.life.photos.map((photo) => photo.title)).toEqual([
      "Bai'at Santri",
      "Tahfidz Al-Qur'an",
      'Mabit Rijaalul Ghad',
      'Mabit Ummahatul Ghad',
      'Rapat Orang Tua',
      'In-House Training Guru',
      'Rapat Evaluasi',
    ])
    expect(landingDefaults.steps.items.map((item) => item.title)).toEqual([
      'Buat akun',
      'Isi formulir',
      'Unggah berkas',
      'Bayar biaya pendaftaran',
      'Kirim dan pantau',
    ])
    expect(landingDefaults.faq.items).toHaveLength(8)
    expect(landingDefaults.stories.items).toHaveLength(3)
    expect(
      landingDefaults.stories.items.every((story) => story.placeholder),
    ).toBe(true)
    expect(landingDefaults.closing.photo.image).toEqual({
      src: '/hero/rapat-orangtua.webp',
    })
  })

  it('starts with no poster, so the information section is hidden', () => {
    expect(landingDefaults.info.posters).toEqual([])
  })

  it('only uses built-in photos that exist in public/hero', () => {
    const sources =
      JSON.stringify(landingDefaults).match(/\/hero\/[a-z0-9-]+\.webp/g) ?? []
    expect(new Set(sources)).toEqual(
      new Set([
        '/hero/baiat.webp',
        '/hero/tahfidz.webp',
        '/hero/mabit-rg.webp',
        '/hero/mabit-ug.webp',
        '/hero/rapat-orangtua.webp',
        '/hero/inhouse-training.webp',
        '/hero/rapat-evaluasi.webp',
      ]),
    )
  })
})
