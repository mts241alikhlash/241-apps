import { createApp } from 'vue'
import '@/style.css'
import App from '@/app/App.vue'
import router from '@/app/providers/router'
import store from '@/app/providers/store'
import type { Component } from 'vue'
import { authService, configureAuth } from '@mts241alikhlash/platform/auth'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from '@mts241alikhlash/platform/reference-data'
import { i18n, initialLocale, setLocale } from '@/i18n'

configureAuth({
  appKey: 'EXAM',
  appTitle: '241 Exam',
  appSubtitle: 'Sistem Ujian Berbasis Komputer',
  logoAlt: 'Logo 241 Exam',
  loginTitle: 'Masuk ke 241 Exam',
  loginSubtitle: 'Masuk untuk melanjutkan ke ujian.',
  identifierLabel: 'ID Pengguna',
  homeRoute: '/',
  ssoApp: 'exam',
})

void Promise.all([
  authService.restoreSession(),
  setLocale(initialLocale(), false),
]).finally(() => {
  const app = createApp(App as Component)
    .use(store)
    .use(VueQueryPlugin, { queryClient })
    .use(i18n)

  app.config.errorHandler = (error) => console.error(error)

  app.use(router).mount('#app')
})
