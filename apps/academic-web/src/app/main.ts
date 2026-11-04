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
import { configureProfile } from '@/features/platform/profile'
import { schoolIdentityProvider } from '@/app/providers/profile/school-identity'

configureAuth({
  appKey: 'ACADEMIC',
  appTitle: '241 Academic',
  appSubtitle: 'Sistem Informasi Akademik',
  logoAlt: 'Logo 241 Academic',
  loginTitle: 'Masuk ke 241 Academic',
  homeRoute: '/academic/info',
  ssoApp: 'academic',
})

configureProfile({ schoolIdentityProvider })

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
