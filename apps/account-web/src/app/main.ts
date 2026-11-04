import { createApp } from 'vue'
import '@/style.css'
import App from '@/app/App.vue'
import router from '@/app/providers/router'
import store from '@/app/providers/store'
import type { Component } from 'vue'
import { authService, configureAuth } from '@/features/platform/auth'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from '@/features/platform/reference-data'
import { i18n, initialLocale, setLocale } from '@/i18n'

configureAuth({
  appKey: 'ACCOUNT',
  appTitle: '241 Akun',
  appSubtitle: 'Akun sekolah',
  logoAlt: 'Logo 241',
  loginTitle: 'Masuk ke 241 Akun',
  loginSubtitle: 'Satu akun untuk semua aplikasi madrasah.',
  identifierLabel: 'Nama pengguna',
  homeRoute: '/',
  ssoApp: 'account',
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
