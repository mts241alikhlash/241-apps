// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { AdmissionApplication } from '../types'
import { useApplicationFormState } from '../composables/useApplicationFormState'
import ReviewStep from './ReviewStep.vue'

vi.mock('../composables/useFormOptions', () => ({
  useFormOptions: () => ({ nameOf: () => '-' }),
}))

const draft: AdmissionApplication = {
  waveIsFull: false,
  id: 'app-1',
  userId: 'user-1',
  waveId: 'wave-1',
  registrationNumber: 'REG-001',
  status: 'DRAFT',
  fullName: 'Contoh',
  nickname: null,
  gender: null,
  birthPlace: null,
  birthDate: null,
  nik: null,
  nisn: null,
  religionId: null,
  phone: null,
  email: null,
  childOrder: null,
  siblingCount: null,
  street: null,
  rt: null,
  rw: null,
  village: null,
  district: null,
  city: null,
  province: null,
  postalCode: null,
  previousSchoolName: null,
  previousSchoolNpsn: null,
  previousSchoolAddress: null,
  graduationYear: null,
  submittedAt: null,
  revisionNote: null,
  verifiedAt: null,
  decidedAt: null,
  decisionNote: null,
  enrolledAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  wave: {
    id: 'wave-1',
    name: 'Gelombang 1',
    code: 'W1',
    academicYearId: 'year-1',
    academicYear: { id: 'year-1', name: '2026/2027' },
    startDate: '2026-01-01',
    endDate: '2026-02-01',
    quota: 100,
    registrationFee: 100000,
    description: null,
    isActive: true,
    lastRegistrationSeq: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  parents: [],
  documents: [],
  payment: null,
  documentTypes: [],
}

it('reviews separate missing fields and the current school without offering submit when locked', () => {
  const { personal, parents, address, school } = useApplicationFormState()
  personal.value.fullName = 'Contoh'
  personal.value.birthPlace = ''
  school.value.previousSchoolName = 'Sekolah Contoh'
  const wrapper = mount(ReviewStep, {
    props: {
      personal: personal.value,
      parents: parents.value,
      address: address.value,
      school: school.value,
      application: draft,
      editable: false,
      completeness: [],
      onGoToStep: vi.fn(),
    },
  })
  expect(wrapper.text()).toContain('Sekolah Contoh')
  expect(wrapper.text()).toContain('Belum diisi')
  expect(wrapper.text()).toContain('Tempat lahir')
  expect(wrapper.text()).toContain('Tanggal lahir')
  expect(
    wrapper
      .findAll('button')
      .some((button) => button.text() === 'Kirim Formulir'),
  ).toBe(false)
})

it('lists what is incomplete and takes the applicant to that step', async () => {
  const { personal, parents, address, school } = useApplicationFormState()
  const onGoToStep = vi.fn()
  const wrapper = mount(ReviewStep, {
    props: {
      personal: personal.value,
      parents: parents.value,
      address: address.value,
      school: school.value,
      application: draft,
      editable: true,
      completeness: [
        { step: 0, label: 'Data Diri', done: true },
        {
          step: 5,
          label: 'Berkas',
          done: false,
          detail: 'Kartu Keluarga',
        },
      ],
      onGoToStep,
    },
  })

  expect(wrapper.text()).toContain('Kelengkapan Data')
  expect(wrapper.text()).not.toContain('bagian belum lengkap')
  expect(wrapper.findAll('li')).toHaveLength(1)
  expect(wrapper.text()).toContain('Berkas')
  expect(wrapper.text()).toContain('Kartu Keluarga')
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Lengkapi')!
    .trigger('click')
  expect(onGoToStep).toHaveBeenCalledWith(5)
})

it('summarizes every answer in collapsible sections', () => {
  const { personal, parents, address, school, hydrate } =
    useApplicationFormState()
  hydrate({ ...draft, parents: [] })
  Object.assign(personal.value, {
    nickname: 'Budi',
    phone: '081234567890',
    birthDate: '2014-05-05',
  })
  Object.assign(parents.value[1], {
    name: 'Siti',
    nik: '3205014101820002',
    sameAddressAsStudent: false,
    street: 'Jl. Kenanga 2',
  })
  const onGoToStep = vi.fn()
  const wrapper = mount(ReviewStep, {
    props: {
      personal: personal.value,
      parents: parents.value,
      address: address.value,
      school: school.value,
      application: draft,
      editable: true,
      completeness: [],
      onGoToStep,
    },
  })

  expect(wrapper.text()).toContain('Budi')
  expect(wrapper.text()).toContain('081234567890')
  expect(wrapper.text()).toContain('5 Mei 2014')
  expect(wrapper.text()).toContain('3205014101820002')
  expect(wrapper.text()).toContain('Jl. Kenanga 2')
  expect(wrapper.text()).toContain('boleh menyusul')

  expect(wrapper.findAll('details')).toHaveLength(7)
  expect(
    wrapper.findAll('button').filter((button) => button.text() === 'Ubah'),
  ).toHaveLength(0)
  expect(onGoToStep).not.toHaveBeenCalled()
})

it('shows no completeness card when every part is done or the form is locked', () => {
  const { personal, parents, address, school } = useApplicationFormState()
  const props = {
    personal: personal.value,
    parents: parents.value,
    address: address.value,
    school: school.value,
    application: draft,
    onGoToStep: vi.fn(),
  }
  const done = mount(ReviewStep, {
    props: {
      ...props,
      editable: true,
      completeness: [{ step: 0, label: 'Data Diri', done: true }],
    },
  })
  expect(done.text()).not.toContain('Kelengkapan Data')
  const locked = mount(ReviewStep, {
    props: {
      ...props,
      editable: false,
      completeness: [{ step: 5, label: 'Berkas', done: false }],
    },
  })
  expect(locked.text()).not.toContain('Kelengkapan Data')
})

it('has no submit warning box, the confirmation dialog carries it', () => {
  const { personal, parents, address, school } = useApplicationFormState()
  const wrapper = mount(ReviewStep, {
    props: {
      personal: personal.value,
      parents: parents.value,
      address: address.value,
      school: school.value,
      application: draft,
      editable: true,
      completeness: [],
      onGoToStep: vi.fn(),
    },
  })
  expect(wrapper.text()).not.toContain('Pastikan seluruh data sudah benar')
})
