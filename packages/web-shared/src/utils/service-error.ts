const SERVICE_LABELS: Record<string, string> = {
  identity: 'Identitas & akun',
  academic: 'Akademik',
  student: 'Kesiswaan',
  hr: 'Kepegawaian',
  assessment: 'Penilaian',
  presence: 'Presensi',
  admission: 'Penerimaan siswa baru',
  inventory: 'Sarana & prasarana',
  portal: 'Portal',
}

const SERVICE_BY_PREFIX: Record<string, string> = {
  '/accounts': 'identity',
  '/audit-logs': 'identity',
  '/auth': 'identity',
  '/blood-types': 'identity',
  '/permissions': 'identity',
  '/profiles': 'identity',
  '/regions': 'identity',
  '/religions': 'identity',
  '/roles': 'identity',
  '/school-unit-addresses': 'identity',
  '/school-unit-social-medias': 'identity',
  '/school-unit-types': 'identity',
  '/school-units': 'identity',
  '/sessions': 'identity',
  '/users': 'identity',

  '/academic-calendar-types': 'academic',
  '/academic-calendars': 'academic',
  '/academic-settings': 'academic',
  '/academic-years': 'academic',
  '/classroom-structures': 'academic',
  '/classroom-supervisors': 'academic',
  '/classrooms': 'academic',
  '/curricula': 'academic',
  '/curriculum-subjects': 'academic',
  '/educations': 'academic',
  '/grade-academic-years': 'academic',
  '/grades': 'academic',
  '/occupations': 'academic',
  '/schedules': 'academic',
  '/semester-rollovers': 'academic',
  '/semester-types': 'academic',
  '/semesters': 'academic',
  '/subjects': 'academic',
  '/teaching-assignments': 'academic',
  '/time-slots': 'academic',

  '/parents': 'student',
  '/student-enrollments': 'student',
  '/student-graduations': 'student',
  '/student-parents': 'student',
  '/student-promotions': 'student',
  '/students': 'student',

  '/employee-positions': 'hr',
  '/employees': 'hr',
  '/employment-types': 'hr',
  '/payroll': 'hr',
  '/position-categories': 'hr',
  '/positions': 'hr',

  '/assessment-items': 'assessment',
  '/assessment-weights': 'assessment',
  '/attendances': 'assessment',
  '/dashboards': 'assessment',
  '/rapors': 'assessment',
  '/student-scores': 'assessment',

  '/presence': 'presence',
  '/admissions': 'admission',
  '/inventory': 'inventory',
  '/files': 'portal',
  '/portal': 'portal',
}

const OUTAGE_STATUSES = new Set([502, 503, 504])

interface AxiosLikeError {
  code?: string
  message?: string
  config?: { url?: string; baseURL?: string }
  response?: {
    status?: number
    data?: { message?: string | string[] }
  }
}

function asAxiosLike(err: unknown): AxiosLikeError {
  return (err as AxiosLikeError) ?? {}
}

function messageOf(err: unknown): string {
  const e = asAxiosLike(err)
  const raw = e.response?.data?.message
  if (typeof raw === 'string') return raw
  return e.message ?? ''
}

function labelFromMessage(err: unknown): string | null {
  const match = /the (\w+) service could not be/i.exec(messageOf(err))
  if (!match) return null
  return SERVICE_LABELS[match[1].toLowerCase()] ?? null
}

function labelFromUrl(err: unknown): string | null {
  const url = asAxiosLike(err).config?.url
  if (!url) return null

  const pathOnly = url.replace(/^[a-z]+:\/\/[^/]+/i, '').split(/[?#]/)[0]
  const first = pathOnly.replace(/^\/+/, '').split('/')[0]
  if (!first) return null

  const service = SERVICE_BY_PREFIX[`/${first}`]
  return service ? SERVICE_LABELS[service] : null
}

export function isServiceUnavailable(err: unknown): boolean {
  const e = asAxiosLike(err)

  if (e.code === 'ERR_NETWORK' || e.message === 'Network Error') return true

  const status = e.response?.status
  return status !== undefined && OUTAGE_STATUSES.has(status)
}

export function unavailableServiceLabel(err: unknown): string | null {
  return labelFromMessage(err) ?? labelFromUrl(err)
}

export function serviceUnavailableMessage(err: unknown): string {
  const e = asAxiosLike(err)

  if (e.code === 'ERR_NETWORK' || e.message === 'Network Error') {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
  }

  const label = unavailableServiceLabel(err)

  if (e.response?.status === 504) {
    return label
      ? `Layanan ${label} terlalu lama merespons. Silakan coba lagi.`
      : 'Server terlalu lama merespons. Silakan coba lagi.'
  }

  if (label) {
    return `Layanan ${label} sedang tidak berjalan, jadi data ini belum bisa ditampilkan.`
  }

  return 'Salah satu layanan sedang tidak berjalan, jadi data ini belum bisa ditampilkan.'
}

export function serviceErrorMessage(err: unknown): string {
  const label = unavailableServiceLabel(err)
  return label
    ? `Layanan ${label} mengalami kesalahan. Silakan coba lagi nanti.`
    : 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
}
