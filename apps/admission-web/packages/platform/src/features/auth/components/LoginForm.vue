<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLoginForm } from '../composables/useLoginForm'
import { cn } from '@mts241alikhlash/web-shared/utils/utils'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { FloatingField, FormControl } from '@mts241alikhlash/ui/form'
import { Eye, EyeOff } from '@lucide/vue'

import { authConfig } from '../config'
import { authApi } from '../api/authApi'

const props = defineProps<{
  class?: string
}>()

const { isSubmitting, errorMessage, onSubmit } = useLoginForm()

const showPassword = ref(false)

const loginTitle = computed(() => authConfig.value.loginTitle)
const loginSubtitle = computed(() => authConfig.value.loginSubtitle)
const signUpUrl = computed(() => authConfig.value.signUpUrl)
const signUpLabel = computed(() => authConfig.value.signUpLabel)

function startGoogleSignIn() {
  window.location.href = authApi.googleStartUrl(window.location.origin)
}
</script>

<template>
  <form
    :class="cn('flex flex-col gap-4', props.class)"
    @submit.prevent="onSubmit"
  >
    <div class="flex flex-col items-center gap-1 text-center">
      <h1 class="text-2xl font-bold">{{ loginTitle }}</h1>
      <p class="text-muted-foreground text-sm text-balance">
        {{ loginSubtitle }}
      </p>
    </div>
    <div class="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        class="h-10 w-full cursor-pointer bg-background"
        :disabled="isSubmitting"
        @click="startGoogleSignIn"
      >
        <svg
          class="size-4 mr-1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
          />
        </svg>
        Lanjutkan dengan Google
      </Button>
    </div>
    <div class="mt-1 flex items-center gap-3">
      <span class="h-px flex-1 bg-border" />
      <span class="text-xs text-muted-foreground">atau</span>
      <span class="h-px flex-1 bg-border" />
    </div>
    <div class="-mt-4 flex flex-col gap-2">
      <FloatingField
        v-slot="{ componentField }"
        name="identifier"
        :label="authConfig.identifierLabel"
      >
        <FormControl>
          <Input
            v-bind="componentField"
            type="text"
            class="h-10 scroll-my-28 bg-transparent"
            autocapitalize="none"
            autocomplete="username"
            spellcheck="false"
          />
        </FormControl>
      </FloatingField>
      <div class="flex flex-col gap-1">
        <FloatingField
          v-slot="{ componentField }"
          name="password"
          label="Kata sandi"
        >
          <div class="relative">
            <FormControl>
              <Input
                :type="showPassword ? 'text' : 'password'"
                class="h-10 scroll-my-28 bg-transparent pr-10"
                autocomplete="current-password"
                v-bind="componentField"
              />
            </FormControl>
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              :aria-label="
                showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
              "
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <component
                :is="showPassword ? EyeOff : Eye"
                class="size-4"
              />
            </button>
          </div>
        </FloatingField>
        <div class="flex justify-end">
          <router-link
            to="/forgot-password"
            class="text-xs text-primary font-semibold hover:underline"
          >
            Lupa kata sandi?
          </router-link>
        </div>
      </div>
      <Button
        type="submit"
        :disabled="isSubmitting"
        class="h-10 w-full cursor-pointer"
      >
        {{ isSubmitting ? 'Sedang masuk...' : 'Masuk' }}
      </Button>
      <p
        v-if="errorMessage"
        class="text-center text-sm text-destructive"
      >
        {{ errorMessage }}
      </p>
      <p
        v-if="signUpUrl"
        class="text-center text-sm text-muted-foreground"
      >
        {{ signUpLabel }}
        <router-link
          data-testid="login-signup-link"
          :to="signUpUrl"
          class="text-primary font-bold underline underline-offset-4"
        >
          Daftar sekarang
        </router-link>
      </p>
    </div>
  </form>
</template>
