import { createApp } from 'vue'
import '@/style.css'
import App from '@/app/App.vue'
import router from '@/app/providers/router'
import store from '@/app/providers/store'
import type { Component } from 'vue'
import { authService, configureAuth } from '@/features/platform/auth'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from '@/features/platform/reference-data'
import { publicAdmissionService } from '@/features/admission'
import { i18n, initialLocale, setLocale } from '@/i18n'
import { z } from 'zod'
import { indonesianErrorMap } from '@/i18n/zodErrorMap'

configureAuth({
  appKey: 'ADMISSION',
  appTitle: '241 Admission',
  appSubtitle: 'Sistem Penerimaan Santri Baru',
  logoAlt: 'Logo 241 Admission',
  loginTitle: 'Selamat datang kembali',
  loginSubtitle:
    'Masuk untuk memantau status dan melanjutkan pendaftaran Anda.',
  identifierLabel: 'Email atau nama pengguna',
  homeRoute: '/dashboard',
  ssoApp: 'admission',
  signUpUrl: '/register',
  ensureApplicantApplication: publicAdmissionService.ensureMyApplication,
})

void Promise.all([
  authService.restoreSession(),
  setLocale(initialLocale(), false),
]).finally(() => {
  z.setErrorMap(indonesianErrorMap)
  const app = createApp(App as Component)
    .use(store)
    .use(VueQueryPlugin, { queryClient })
    .use(i18n)

  app.config.errorHandler = (error) => console.error(error)

  app.use(router).mount('#app')
})
