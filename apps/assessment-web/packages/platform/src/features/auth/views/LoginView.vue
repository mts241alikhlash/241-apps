<script setup lang="ts">
import { authConfig } from '../config'
import { ssoService } from '../services/ssoService'
import AuthLogo from '../components/AuthLogo.vue'
import LoginForm from '../components/LoginForm.vue'
import LoginHero from '../components/LoginHero.vue'
</script>

<template>
  <div class="grid min-h-svh lg:h-svh lg:grid-cols-2 lg:overflow-hidden">
    <div
      class="flex flex-col gap-4 bg-muted/50 [--ff-label-bg:color-mix(in_oklab,var(--muted)_50%,var(--background))] p-6 md:p-8 lg:overflow-y-auto lg:pb-4"
    >
      <header class="flex justify-center">
        <AuthLogo wordmark />
      </header>
      <div
        class="flex flex-1 items-start justify-center pt-4 lg:items-center lg:pt-0"
      >
        <LoginForm class="w-full max-w-sm" />
      </div>
      <footer class="flex justify-center">
        <button
          type="button"
          class="cursor-pointer text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          @click="ssoService.startSignIn(authConfig.homeRoute)"
        >
          Masuk sebagai staf
        </button>
      </footer>
    </div>
    <LoginHero />
  </div>
</template>
