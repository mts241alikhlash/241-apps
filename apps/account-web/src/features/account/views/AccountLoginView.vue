<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import { accountLoginService } from '../services/accountLoginService'

const route = useRoute()
const identifier = ref('')
const password = ref('')
const busy = ref(false)
const error = ref(
  route.query.error === 'google'
    ? 'Akun Google ini belum terhubung ke akun staf.'
    : '',
)

async function submit() {
  busy.value = true
  error.value = ''
  const result = await accountLoginService.signIn(
    identifier.value,
    password.value,
  )
  if (result !== 'ok') {
    error.value = result
    busy.value = false
    return
  }
  await accountLoginService.continueAfterSignIn(route.query.continue)
}
</script>

<template>
  <div class="flex min-h-svh items-center justify-center bg-muted/50 p-6">
    <form
      class="w-full max-w-sm space-y-4 rounded-md border bg-card p-8"
      @submit.prevent="submit"
    >
      <h1 class="text-xl font-bold tracking-tight">Masuk ke 241 Apps</h1>
      <div class="space-y-2">
        <Label for="identifier">Nama pengguna</Label>
        <Input
          id="identifier"
          v-model="identifier"
          autocomplete="username"
          required
        />
      </div>
      <div class="space-y-2">
        <Label for="password">Kata sandi</Label>
        <Input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <p
        v-if="error"
        class="text-sm text-destructive"
        role="alert"
      >
        {{ error }}
      </p>
      <Button
        type="submit"
        class="w-full"
        :disabled="busy"
      >
        Masuk
      </Button>
      <Button
        as="a"
        variant="outline"
        class="w-full"
        :href="accountLoginService.googleUrl()"
      >
        Masuk dengan Google
      </Button>
      <RouterLink
        to="/forgot-password"
        class="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Lupa kata sandi?
      </RouterLink>
    </form>
  </div>
</template>
