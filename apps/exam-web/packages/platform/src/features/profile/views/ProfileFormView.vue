<script setup lang="ts">
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useRoute } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@mts241alikhlash/ui/tabs'
import { useProfileFormPage } from '../composables/useProfileFormPage'
import ProfileFormBasic from '../components/ProfileFormBasic.vue'
import ProfileFormAdvanced from '../components/ProfileFormAdvanced.vue'

const route = useRoute()

const { loading, isSaving, activeTab, form, onSubmit, handleNext, handleBack } =
  useProfileFormPage()

useBreadcrumbs(() => {
  const name = form.values.name
  const { role, id } = route.params
  if (!name || typeof role !== 'string' || typeof id !== 'string') return null
  const trail = route.meta.breadcrumbs ?? []
  return [
    ...trail.slice(0, -1),
    { title: name, href: `/profile/${role}/${id}` },
    { title: 'Ubah' },
  ]
})
</script>

<template>
  <div class="p-4 md:p-6 lg:p-8">
    <Card
      class="overflow-hidden rounded-2xl shadow-sm shadow-black/5 ring-1 ring-black/4 flex flex-col gap-0"
    >
      <CardHeader
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b px-6 py-5 shrink-0 gap-4"
      >
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke profil"
            @click="handleBack"
          />
          <div>
            <CardTitle class="text-2xl font-bold tracking-tight">
              Ubah Data Diri
            </CardTitle>
            <p class="text-sm text-muted-foreground">
              Perbarui data diri dasar dan informasi pendaftaran Anda.
            </p>
          </div>
        </div>
      </CardHeader>

      <div
        v-if="loading"
        class="p-6 flex flex-col items-center justify-center py-20"
      >
        <span class="text-sm text-muted-foreground animate-pulse"
          >Memuat data profil...</span
        >
      </div>

      <form
        v-else
        class="flex flex-col"
        @submit.prevent="onSubmit"
      >
        <Tabs
          v-model="activeTab"
          class="w-full flex flex-col"
          variant="line"
        >
          <div class="px-6 pt-4 border-b shrink-0">
            <TabsList class="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="utama">Data Utama</TabsTrigger>
              <TabsTrigger value="lanjutan">Kontak &amp; Lanjutan</TabsTrigger>
            </TabsList>
          </div>

          <div class="p-6 md:p-8">
            <TabsContent
              value="utama"
              class="mt-0"
            >
              <ProfileFormBasic :form="form" />
            </TabsContent>
            <TabsContent
              value="lanjutan"
              class="mt-0"
            >
              <ProfileFormAdvanced />
            </TabsContent>
          </div>
        </Tabs>

        <div
          class="flex items-center justify-between border-t px-6 py-4 bg-background"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="isSaving"
            @click="handleBack"
          >
            {{ activeTab === 'utama' ? 'Batal' : 'Kembali' }}
          </Button>

          <Button
            v-if="activeTab === 'utama'"
            type="button"
            variant="default"
            @click="handleNext"
          >
            Lanjut
          </Button>
          <Button
            v-else
            type="submit"
            variant="default"
            :disabled="isSaving"
          >
            {{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </Button>
        </div>
      </form>
    </Card>
  </div>
</template>
