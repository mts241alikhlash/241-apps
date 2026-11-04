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
  appKey: 'INVENTORY',
  appTitle: '241 Inventory',
  appSubtitle: 'Sistem Informasi Manajemen Aset',
  logoAlt: 'Logo 241 Inventory',
  loginTitle: 'Masuk ke 241 Inventory',
  loginSubtitle: 'Manajemen aset dan inventaris madrasah.',
  identifierLabel: 'Nama pengguna',
  homeRoute: '/dashboard',
  ssoApp: 'inventory',
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
