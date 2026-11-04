import type { RouteRecordRaw } from 'vue-router'

export const admissionPublicRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: () => import('./views/LandingView.vue'),
    meta: {
      title: 'Penerimaan Santri Baru',
      description: 'Informasi pendaftaran santri baru.',
    },
  },
  {
    path: '/admin/landing/preview',
    name: 'admin-landing-preview',
    component: () => import('./views/LandingPreviewView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-landing.read',
      title: 'Pratinjau Halaman Depan',
    },
  },
  {
    path: '/register',
    redirect: { name: 'login', query: { signup: '1' } },
    meta: {
      guestOnly: true,
      title: 'Daftar Akun',
      description: 'Buat akun pendaftaran santri baru.',
    },
  },
]

export const admissionRoutes: RouteRecordRaw[] = [
  {
    path: '/registration',
    name: 'applicant-dashboard',
    component: () => import('./views/ApplicantDashboardView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admissions.apply',
      title: 'Status Pendaftaran',
      description: 'Pantau status, notifikasi, dan pengumuman pendaftaran.',
      breadcrumbs: [{ title: 'Status Pendaftaran' }],
    },
  },
  {
    path: '/registration/form',
    name: 'applicant-form',
    component: () => import('./views/ApplicationFormView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admissions.apply',
      title: 'Formulir Pendaftaran',
      description: 'Lengkapi formulir pendaftaran santri baru.',
      breadcrumbs: [
        { title: 'Pendaftaran', href: '/registration' },
        { title: 'Formulir' },
      ],
    },
  },

  {
    path: '/admin',
    name: 'admin-stats',
    component: () => import('./views/AdmissionStatsView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admissions.read',
      title: 'Dashboard PSB',
      description: 'Statistik penerimaan santri baru.',
      breadcrumbs: [{ title: 'Dashboard PSB' }],
    },
  },
  {
    path: '/admin/applicants',
    name: 'admin-applications',
    component: () => import('./views/ApplicationListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admissions.read',
      title: 'Daftar Pendaftar',
      description: 'Kelola dan verifikasi pendaftar santri baru.',
      breadcrumbs: [{ title: 'Daftar Pendaftar' }],
    },
  },
  {
    path: '/admin/applicants/:id',
    name: 'admin-application-detail',
    component: () => import('./views/ApplicationDetailView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admissions.read',
      title: 'Detail Pendaftar',
      description: 'Verifikasi berkas dan keputusan penerimaan.',
      breadcrumbs: [
        { title: 'Pendaftar', href: '/admin/applicants' },
        { title: 'Detail' },
      ],
    },
  },
  {
    path: '/admin/applicants/:id/form',
    name: 'admin-application-form',
    component: () => import('./views/ApplicationFormView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admissions.create',
      title: 'Formulir Pendaftar',
      description: 'Isi formulir pendaftaran atas nama pendaftar.',
      breadcrumbs: [
        { title: 'Pendaftar', href: '/admin/applicants' },
        { title: 'Formulir' },
      ],
    },
  },
  {
    path: '/admin/waves',
    name: 'admin-waves',
    component: () => import('./views/WaveListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-waves.read',
      title: 'Gelombang Pendaftaran',
      description: 'Kelola gelombang penerimaan santri baru.',
      breadcrumbs: [{ title: 'Gelombang' }],
    },
  },
  {
    path: '/admin/bank-accounts',
    name: 'admin-bank-accounts',
    component: () => import('./views/BankAccountListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-bank-accounts.read',
      title: 'Rekening Pembayaran',
      description: 'Kelola rekening tujuan transfer biaya pendaftaran.',
      breadcrumbs: [{ title: 'Rekening Pembayaran' }],
    },
  },
  {
    path: '/admin/document-types',
    name: 'admin-document-types',
    component: () => import('./views/DocumentTypeListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-document-types.read',
      title: 'Jenis Berkas',
      description: 'Kelola berkas yang diunggah pendaftar.',
      breadcrumbs: [{ title: 'Jenis Berkas' }],
    },
  },
  {
    path: '/admin/downloads',
    name: 'admin-downloads',
    component: () => import('./views/DownloadListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-downloads.read',
      title: 'Unduhan',
      description:
        'Kelola brosur dan formulir yang bisa diunduh calon pendaftar.',
      breadcrumbs: [{ title: 'Unduhan' }],
    },
  },
  {
    path: '/admin/landing',
    name: 'admin-landing',
    component: () => import('./views/LandingSettingsView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-landing.read',
      title: 'Halaman Depan',
      description: 'Atur teks dan foto halaman depan pendaftaran.',
      breadcrumbs: [{ title: 'Halaman Depan' }],
    },
  },
  {
    path: '/admin/enrollments',
    name: 'admin-enrollments',
    component: () => import('./views/EnrollmentListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-enrollments.read',
      title: 'Daftar Ulang',
      description:
        'Susun NIS dan proses pendaftar yang diterima menjadi santri.',
      breadcrumbs: [{ title: 'Daftar Ulang' }],
    },
  },
  {
    path: '/admin/decisions',
    name: 'admin-decisions',
    component: () => import('./views/DecisionListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-decisions.read',
      title: 'Keputusan',
      description: 'Terima atau tolak pendaftar yang sudah terverifikasi.',
      breadcrumbs: [{ title: 'Keputusan' }],
    },
  },
  {
    path: '/admin/document-reviews',
    name: 'admin-document-reviews',
    component: () => import('./views/DocumentReviewListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-documents.read',
      title: 'Verifikasi Berkas',
      description: 'Periksa berkas yang diunggah pendaftar.',
      breadcrumbs: [{ title: 'Verifikasi Berkas' }],
    },
  },
  {
    path: '/admin/late-documents',
    name: 'admin-late-documents',
    component: () => import('./views/LateDocumentListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-late-documents.read',
      title: 'Berkas Susulan',
      description: 'Pantau dan periksa berkas yang menyusul setelah mendaftar.',
      breadcrumbs: [{ title: 'Berkas Susulan' }],
    },
  },
  {
    path: '/admin/document-reviews/:applicationId',
    name: 'admin-document-review',
    component: () => import('./views/DocumentReviewView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-documents.read',
      title: 'Periksa Berkas',
      description: 'Setujui atau tolak berkas pendaftar, lalu kirim hasilnya.',
      breadcrumbs: [
        { title: 'Verifikasi Berkas', href: '/admin/document-reviews' },
        { title: 'Periksa' },
      ],
    },
  },
  {
    path: '/admin/payments',
    name: 'admin-payments',
    component: () => import('./views/PaymentListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-payments.read',
      title: 'Pembayaran',
      description: 'Verifikasi pembayaran biaya pendaftaran.',
      breadcrumbs: [{ title: 'Pembayaran' }],
    },
  },
  {
    path: '/admin/payments/new',
    name: 'admin-payment-new',
    component: () => import('./views/AddPaymentView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-payments.create',
      title: 'Pembayaran oleh Staf',
      description: 'Catat pembayaran pendaftar yang dibantu oleh staf.',
      breadcrumbs: [
        { title: 'Pembayaran', href: '/admin/payments' },
        { title: 'Pembayaran oleh Staf' },
      ],
    },
  },
  {
    path: '/admin/announcements',
    name: 'admin-announcements',
    component: () => import('./views/AnnouncementListView.vue'),
    meta: {
      requiresAuth: true,
      requiredPermission: 'admission-announcements.read',
      title: 'Pengumuman PSB',
      description: 'Kelola pengumuman penerimaan santri baru.',
      breadcrumbs: [{ title: 'Pengumuman' }],
    },
  },
]
