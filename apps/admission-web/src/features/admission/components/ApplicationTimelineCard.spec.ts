// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ApplicationTimelineCard from './ApplicationTimelineCard.vue'
import type { AdmissionApplication } from '../types'

const baseApp = {
  id: 'app-1',
  applicantId: 'user-1',
  waveId: 'wave-1',
  registrationNumber: 'PSB-001',
  status: 'SUBMITTED',
  fullName: 'Ahmad Fauzi',
  nickname: 'Fauzi',
  gender: 'MALE',
  birthPlace: 'Cirebon',
  birthDate: '2010-01-01',
  nik: '3209010101010001',
  nisn: '0012345678',
  phone: '08123456789',
  email: 'fauzi@example.com',
  childOrder: 1,
  siblingCount: 2,
  street: 'Jl. Pesantren No. 1',
  rt: '01',
  rw: '02',
  village: 'Cirengit',
  district: 'Sindanglaut',
  city: 'Cirebon',
  province: 'Jawa Barat',
  postalCode: '45181',
  previousSchoolName: 'SDIT Cirebon',
  previousSchoolNpsn: null,
  previousSchoolAddress: null,
  graduationYear: 2026,
  submittedAt: '2026-10-01T10:00:00.000Z',
  revisionNote: null,
  verifiedAt: null,
  decidedAt: null,
  decisionNote: null,
  enrolledAt: null,
  createdAt: '2026-09-30T08:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  waveIsFull: false,
  parents: [],
  documents: [],
  achievements: [],
  scholarships: [],
} as unknown as AdmissionApplication

describe('ApplicationTimelineCard', () => {
  it('renders submitted timeline stages properly', () => {
    const wrapper = mount(ApplicationTimelineCard, {
      props: { application: baseApp },
    })

    expect(wrapper.text()).toContain('Riwayat & Linimasa Pendaftaran')
    expect(wrapper.text()).toContain('Akun & Formulir Dibuat')
    expect(wrapper.text()).toContain('Formulir Dikirim')
    expect(wrapper.text()).toContain('Pemeriksaan Berkas & Pembayaran')
    expect(wrapper.text()).toContain('Keputusan Pendaftaran')
    expect(wrapper.text()).toContain('Daftar Ulang')

    const events = wrapper.findAll('[data-test="timeline-event"]')
    expect(events.length).toBe(5)
  })

  it('renders revision notice and note when revision is requested', () => {
    const app = {
      ...baseApp,
      status: 'REVISION_NEEDED' as const,
      revisionNote: 'Foto KK buram dan tidak terbaca',
    }
    const wrapper = mount(ApplicationTimelineCard, {
      props: { application: app },
    })

    expect(wrapper.text()).toContain('Perlu Perbaikan Berkas')
    expect(wrapper.text()).toContain('Catatan: Foto KK buram dan tidak terbaca')
  })

  it('renders decision accepted and enrolled milestone with NIS', () => {
    const app = {
      ...baseApp,
      status: 'ENROLLED' as const,
      verifiedAt: '2026-10-02T09:00:00.000Z',
      decidedAt: '2026-10-03T14:00:00.000Z',
      decisionNote: 'Lulus seleksi wawancara dan tahfidz',
      enrolledAt: '2026-10-05T11:00:00.000Z',
      nis: '272807001',
    }
    const wrapper = mount(ApplicationTimelineCard, {
      props: { application: app },
    })

    expect(wrapper.text()).toContain('Verifikasi Berkas & Pembayaran')
    expect(wrapper.text()).toContain('Keputusan: Diterima')
    expect(wrapper.text()).toContain('Lulus seleksi wawancara dan tahfidz')
    expect(wrapper.text()).toContain('Daftar Ulang Selesai')
    expect(wrapper.text()).toContain('272807001')
  })

  it('renders decision rejected when application is rejected', () => {
    const app = {
      ...baseApp,
      status: 'REJECTED' as const,
      decidedAt: '2026-10-03T14:00:00.000Z',
      decisionNote: 'Kapasitas asrama putra telah penuh',
    }
    const wrapper = mount(ApplicationTimelineCard, {
      props: { application: app },
    })

    expect(wrapper.text()).toContain('Keputusan: Ditolak')
    expect(wrapper.text()).toContain('Kapasitas asrama putra telah penuh')
  })
})
