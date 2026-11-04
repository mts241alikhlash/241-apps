import * as z from 'zod'
import { jakartaToday } from '../utils'

const postalCodeSchema = z
  .string()
  .max(10)
  .optional()
  .default('')
  .refine((v) => !v || /^\d{5}$/.test(v), 'Kode pos harus 5 digit angka')

const optionalRtRw = (label: string) =>
  z
    .string()
    .optional()
    .default('')
    .refine((v) => !v || /^\d{1,3}$/.test(v), `${label} harus 1–3 digit angka`)

const requiredRtRw = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (v) => /^\d{1,3}$/.test(v),
      (v) => ({
        message: v ? `${label} harus 1–3 digit angka` : `${label} wajib diisi`,
      }),
    )

const nikSchema = z
  .string()
  .optional()
  .default('')
  .refine((v) => !v || /^\d{16}$/.test(v), 'NIK harus 16 digit angka')

export function normalizePhone(value: string) {
  return value.replace(/[\s-]/g, '')
}

const phoneSchema = z
  .string()
  .max(20)
  .optional()
  .default('')
  .refine(
    (v) => !v || /^(\+62|0)8\d{8,11}$/.test(normalizePhone(v)),
    'Nomor HP harus nomor seluler (08… atau +628…)',
  )

function countSchema(min: number, message: string) {
  return z
    .string()
    .optional()
    .default('')
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= 30),
      message,
    )
}

const today = () => jakartaToday()

export const personalSchema = z.object({
  fullName: z.string().trim().min(1, 'Nama lengkap wajib diisi').max(100),
  nickname: z.string().max(50).optional().default(''),
  gender: z.string().min(1, 'Jenis kelamin wajib dipilih'),
  birthPlace: z.string().trim().min(1, 'Tempat lahir wajib diisi').max(100),
  birthDate: z
    .string()
    .min(1, 'Tanggal lahir wajib diisi')
    .refine(
      (v) => v >= '2000-01-01' && v <= today(),
      'Tanggal lahir tidak valid',
    ),
  nik: z.string().refine(
    (v) => /^\d{16}$/.test(v),
    (v) => ({
      message: v ? 'NIK harus 16 digit angka' : 'NIK wajib diisi',
    }),
  ),
  nisn: z
    .string()
    .optional()
    .default('')
    .refine((v) => !v || /^\d{10}$/.test(v), 'NISN harus 10 digit angka'),
  religionId: z.string().min(1, 'Agama wajib dipilih'),
  childOrder: countSchema(1, 'Anak ke- harus 1 sampai 30'),
  siblingCount: countSchema(0, 'Jumlah saudara harus 0 sampai 30'),
  phone: phoneSchema,
  hobby: z.string().max(100).optional().default(''),
  aspiration: z.string().max(100).optional().default(''),
  financingSourceId: z.string().min(1, 'Yang membiayai sekolah wajib dipilih'),
  disabilityTypeId: z.string().optional().default(''),
  specialNeedId: z.string().optional().default(''),
})

const parentEntrySchema = z.object({
  relation: z.string(),
  name: z.string().trim().max(100),
  nik: nikSchema,
  birthPlace: z.string().max(100).optional().default(''),
  birthDate: z.string().optional().default(''),
  phone: phoneSchema,
  occupationId: z.string().optional().default(''),
  educationId: z.string().optional().default(''),
  incomeRangeId: z.string().optional().default(''),
  lifeStatusId: z.string().optional().default(''),
  domicileId: z.string().optional().default(''),
  residenceId: z.string().optional().default(''),
  sameAddressAsStudent: z.boolean().default(true),
  street: z.string().max(255).optional().default(''),
  rt: optionalRtRw('RT'),
  rw: optionalRtRw('RW'),
  postalCode: postalCodeSchema,
  provinceCode: z.string().optional().default(''),
  regencyCode: z.string().optional().default(''),
  districtCode: z.string().optional().default(''),
  villageCode: z.string().optional().default(''),
  isPrimary: z.boolean(),
})

interface LifeStatus {
  id: string
  name: string
}

export const LIFE_STATUS = {
  alive: 'Masih hidup',
  dead: 'Meninggal',
  unknown: 'Tidak diketahui',
} as const

export function isGone(lifeStatuses: LifeStatus[], id: string) {
  const name = lifeStatuses.find((status) => status.id === id)?.name
  return name === LIFE_STATUS.dead || name === LIFE_STATUS.unknown
}

export function addressOwnerOf<
  T extends { relation: string; lifeStatusId: string; isPrimary: boolean },
>(parents: T[], lifeStatuses: LifeStatus[]): T['relation'] {
  const father = parents.find((parent) => parent.relation === 'FATHER')
  if (father && !isGone(lifeStatuses, father.lifeStatusId)) return 'FATHER'
  return parents.find((parent) => parent.isPrimary)?.relation ?? 'FATHER'
}

export function isAlive(lifeStatuses: LifeStatus[], id: string) {
  return (
    lifeStatuses.find((status) => status.id === id)?.name === LIFE_STATUS.alive
  )
}

const GUARDIAN_FIELDS = [
  ['nik', 'NIK wajib diisi untuk wali'],
  ['birthPlace', 'Tempat lahir wajib diisi untuk wali'],
  ['birthDate', 'Tanggal lahir wajib diisi untuk wali'],
  ['occupationId', 'Pekerjaan wajib dipilih untuk wali'],
  ['phone', 'No. HP wajib diisi untuk wali'],
] as const

function yearsAgo(years: number) {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return date.toISOString().slice(0, 10)
}

export function parentsSchemaFor(
  lifeStatuses: LifeStatus[],
  part: 'people' | 'addresses' = 'people',
) {
  const statusName = (id: string) =>
    lifeStatuses.find((status) => status.id === id)?.name
  const entry = parentEntrySchema.superRefine((parent, ctx) => {
    const ownParent = parent.relation !== 'GUARDIAN'
    const status = statusName(parent.lifeStatusId)
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })
    if (part === 'addresses') return
    if (ownParent && !parent.lifeStatusId) {
      issue('lifeStatusId', 'Status wajib dipilih')
    }
    if (!parent.name && !(ownParent && status === LIFE_STATUS.unknown)) {
      issue('name', 'Nama wajib diisi')
    }
    if (
      ownParent &&
      parent.isPrimary &&
      status !== undefined &&
      status !== LIFE_STATUS.alive
    ) {
      issue('lifeStatusId', 'Wali harus masih hidup')
    }
    if (parent.isPrimary) {
      for (const [field, message] of GUARDIAN_FIELDS) {
        if (!parent[field]) issue(field, message)
      }
    } else if (ownParent && status === LIFE_STATUS.alive && !parent.nik) {
      issue('nik', 'NIK wajib diisi')
    }
    if (
      parent.birthDate &&
      (parent.birthDate < '1940-01-01' || parent.birthDate > yearsAgo(15))
    ) {
      issue('birthDate', 'Tanggal lahir tidak valid')
    }
  })
  return z.object({
    parents: z
      .array(entry)
      .min(1, 'Minimal satu orang tua/wali')
      .superRefine((parents, ctx) => {
        if (part === 'addresses') {
          const owner = addressOwnerOf(parents, lifeStatuses)
          parents.forEach((parent, index) => {
            if (
              parent.relation === owner ||
              parent.sameAddressAsStudent ||
              isGone(lifeStatuses, parent.lifeStatusId)
            ) {
              return
            }
            const issue = (path: string, message: string) =>
              ctx.addIssue({ code: 'custom', path: [index, path], message })
            if (!parent.street.trim()) issue('street', 'Alamat wajib diisi')
            if (!parent.rt) issue('rt', 'RT wajib diisi')
            if (!parent.rw) issue('rw', 'RW wajib diisi')
            if (!parent.villageCode) {
              issue(
                'villageCode',
                'Wilayah wajib dipilih sampai desa/kelurahan',
              )
            }
          })
          return
        }
        parents.forEach((parent, index) => {
          if (
            parent.nik &&
            parents.slice(0, index).some((other) => other.nik === parent.nik)
          ) {
            ctx.addIssue({
              code: 'custom',
              path: [index, 'nik'],
              message: 'NIK sama dengan orang tua/wali lain',
            })
          }
        })
      }),
  })
}

export const addressSchema = z.object({
  street: z.string().trim().min(1, 'Alamat wajib diisi').max(255),
  rt: requiredRtRw('RT'),
  rw: requiredRtRw('RW'),
  postalCode: postalCodeSchema,
  provinceCode: z.string().optional().default(''),
  regencyCode: z.string().optional().default(''),
  districtCode: z.string().optional().default(''),
  villageCode: z.string().min(1, 'Wilayah wajib dipilih sampai desa/kelurahan'),
  studentResidenceId: z.string().min(1, 'Status tempat tinggal wajib dipilih'),
  travelDistanceId: z.string().min(1, 'Jarak tempat tinggal wajib dipilih'),
  travelTimeId: z.string().min(1, 'Waktu tempuh wajib dipilih'),
  transportationId: z.string().min(1, 'Transportasi wajib dipilih'),
})

const currentYear = () => new Date().getFullYear()

export const schoolSchema = z.object({
  previousSchoolName: z
    .string()
    .trim()
    .min(1, 'Nama sekolah asal wajib diisi')
    .max(200),
  previousSchoolNpsn: z
    .string()
    .optional()
    .default('')
    .refine((v) => !v || /^\d{8}$/.test(v), 'NPSN harus 8 digit angka'),
  previousSchoolAddress: z.string().max(255).optional().default(''),
  graduationYear: z.string().refine(
    (v) =>
      /^\d{4}$/.test(v) &&
      Number(v) >= currentYear() - 5 &&
      Number(v) <= currentYear(),
    (v) => ({
      message: v
        ? `Tahun lulus harus antara ${currentYear() - 5} dan ${currentYear()}`
        : 'Tahun lulus wajib diisi',
    }),
  ),
})

const yearSchema = z.string().refine(
  (v) => Number(v) >= 2015 && Number(v) <= currentYear(),
  () => ({ message: `Tahun harus antara 2015 dan ${currentYear()}` }),
)

const achievementEntrySchema = z.object({
  year: yearSchema,
  competitionName: z.string().trim().min(1, 'Nama lomba wajib diisi').max(150),
  competitionFieldId: z.string().min(1, 'Bidang wajib dipilih'),
  organizer: z.string().max(150).optional().default(''),
  competitionLevelId: z.string().min(1, 'Tingkat wajib dipilih'),
  rank: z.string().trim().min(1, 'Peringkat wajib diisi').max(50),
  fileId: z.string().optional().default(''),
  fileName: z.string().optional().default(''),
})

const scholarshipEntrySchema = z.object({
  year: yearSchema,
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  scholarshipName: z
    .string()
    .trim()
    .min(1, 'Nama beasiswa wajib diisi')
    .max(150),
  providerName: z
    .string()
    .trim()
    .min(1, 'Instansi pemberi wajib diisi')
    .max(150),
  providerTypeId: z.string().min(1, 'Jenis instansi wajib dipilih'),
  duration: z.string().max(50).optional().default(''),
  kipNumber: z.string().max(30).optional().default(''),
  amount: z
    .string()
    .optional()
    .default('')
    .refine((v) => !v || Number(v) >= 0, 'Jumlah tidak valid'),
  fileId: z.string().optional().default(''),
  fileName: z.string().optional().default(''),
})

export const achievementsSchema = z.object({
  achievements: z.array(achievementEntrySchema).max(20),
  scholarships: z.array(scholarshipEntrySchema).max(20),
})

export const KIP_CATEGORY = 'KIP/PIP'

export function isKipScholarship(
  categories: { id: string; name: string }[],
  categoryId: string,
) {
  return (
    categories.find((category) => category.id === categoryId)?.name ===
    KIP_CATEGORY
  )
}

export function achievementsSchemaFor(
  categories: { id: string; name: string }[],
) {
  return achievementsSchema.superRefine((value, ctx) => {
    value.scholarships.forEach((row, index) => {
      if (
        isKipScholarship(categories, row.categoryId) &&
        !row.kipNumber.trim()
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['scholarships', index, 'kipNumber'],
          message: 'No. KIP wajib diisi',
        })
      }
    })
  })
}

export const paymentSchema = z.object({
  bankAccountId: z.string().min(1, 'Pilih rekening tujuan transfer'),
  bankName: z.string().trim().min(1, 'Nama bank wajib diisi').max(100),
  senderAccountName: z
    .string()
    .trim()
    .min(1, 'Nama pengirim wajib diisi')
    .max(100),
  transferDate: z
    .string()
    .min(1, 'Tanggal transfer wajib diisi')
    .refine(
      (v) => v <= today(),
      'Tanggal transfer tidak boleh melewati hari ini',
    ),
})

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(1, 'Nama bank wajib diisi').max(100),
  accountNumber: z
    .string()
    .refine((v) => /^\d{5,30}$/.test(v), 'Nomor rekening 5–30 digit angka'),
  accountHolder: z.string().trim().min(1, 'Atas nama wajib diisi').max(100),
  isActive: z.boolean(),
})

export const documentTypeSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama jenis berkas wajib diisi').max(100),
    requirement: z.enum(['REQUIRED', 'LATER', 'OPTIONAL']),
    lateDueMonths: z.preprocess(
      (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
      z.number().nullable(),
    ),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.requirement !== 'LATER') return
    const months = value.lateDueMonths
    if (
      months === null ||
      !Number.isInteger(months) ||
      months < 1 ||
      months > 12
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['lateDueMonths'],
        message: 'Batas 1 sampai 12 bulan',
      })
    }
  })
  .transform((value) => ({
    ...value,
    lateDueMonths: value.requirement === 'LATER' ? value.lateDueMonths : null,
  }))

export const downloadSchema = z.object({
  title: z.string().trim().min(1, 'Judul berkas wajib diisi').max(100),
  description: z.string().trim().max(255, 'Keterangan maksimal 255 karakter'),
  isActive: z.boolean(),
})
