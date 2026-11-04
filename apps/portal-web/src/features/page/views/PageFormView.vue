<script setup lang="ts">
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { BackButton } from '@mts241alikhlash/ui'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@mts241alikhlash/ui/card'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import { Separator } from '@mts241alikhlash/ui/separator'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { AlertTriangle, EyeOff, Save, Send } from '@lucide/vue'
import { CONTENT_STATUS_LABELS, RichTextEditor } from '@/features/post'
import { pageService } from '../services/pageService'
import { usePageStore } from '../stores/pageStore'

const route = useRoute()
const router = useRouter()
const store = usePageStore()

const pageId = computed(() => route.params.id as string | undefined)
const isEdit = computed(() => Boolean(pageId.value))

const form = ref({
  title: '',
  slug: '',
  body: '',
  metaTitle: '',
  metaDescription: '',
})

const slugChanged = computed(
  () => isEdit.value && form.value.slug !== store.current?.slug,
)

onMounted(async () => {
  store.reset()
  if (!pageId.value) return

  const page = await pageService.fetchOne(pageId.value)
  if (page) {
    form.value = {
      title: page.title,
      slug: page.slug,
      body: page.body,
      metaTitle: page.metaTitle ?? '',
      metaDescription: page.metaDescription ?? '',
    }
  }
})

function payload() {
  return {
    title: form.value.title,
    body: form.value.body,
    metaTitle: form.value.metaTitle || undefined,
    metaDescription: form.value.metaDescription || undefined,
    ...(slugChanged.value ? { slug: form.value.slug } : {}),
  }
}

async function save() {
  if (!form.value.title.trim()) return

  const saved = store.current
    ? await pageService.update(store.current.id, {
        ...payload(),
        version: store.current.version,
      })
    : await pageService.create(payload())

  if (saved && !isEdit.value) {
    await router.replace({
      name: 'admin-page-edit',
      params: { id: saved.id },
    })
  }
}

async function togglePublished() {
  if (!store.current) {
    await save()
    if (!store.current) return
  }
  await pageService.setPublished(
    store.current.id,
    store.current.version,
    store.current.status !== 'PUBLISHED',
  )
}

useBreadcrumbs(() => {
  const name = store.current?.title
  if (!name) return null
  const trail = route.meta.breadcrumbs ?? []
  return [...trail.slice(0, -1), { title: name }]
})
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="w-full overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-start gap-3">
          <BackButton
            label="Kembali ke daftar halaman"
            @click="router.push('/admin/pages')"
          />
          <div>
            <CardTitle size="lg">
              {{ isEdit ? 'Ubah Halaman' : 'Halaman Baru' }}
            </CardTitle>
            <CardDescription v-if="store.current">
              Versi {{ store.current.version }}
            </CardDescription>
          </div>
        </div>
        <Badge
          v-if="store.current"
          variant="secondary"
        >
          {{ CONTENT_STATUS_LABELS[store.current.status] }}
        </Badge>
      </CardHeader>

      <CardContent
        variant="standard"
        class="space-y-6"
      >
        <Alert
          v-if="store.conflict"
          variant="destructive"
        >
          <AlertTriangle class="size-4" />
          <AlertTitle>Halaman berubah di tempat lain</AlertTitle>
          <AlertDescription>{{ store.conflict }}</AlertDescription>
        </Alert>

        <div class="space-y-1.5">
          <Label for="page-title">
            Judul <span class="text-destructive">*</span>
          </Label>
          <Input
            id="page-title"
            v-model="form.title"
            placeholder="mis. Visi &amp; Misi"
          />
        </div>

        <div
          v-if="isEdit"
          class="space-y-1.5"
        >
          <Label for="page-slug">Alamat halaman</Label>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">/</span>
            <Input
              id="page-slug"
              v-model="form.slug"
            />
          </div>
          <p
            v-if="slugChanged"
            class="text-xs text-amber-600"
          >
            Alamat lama akan tetap mengarah ke sini, tetapi tautan yang sudah
            dicetak sebaiknya diperbarui.
          </p>
        </div>

        <div class="space-y-1.5">
          <Label>Isi <span class="text-destructive">*</span></Label>
          <RichTextEditor v-model="form.body" />
        </div>

        <details class="rounded-md border p-4">
          <summary class="cursor-pointer text-sm font-medium">
            Pengaturan pencarian &amp; berbagi
          </summary>
          <div class="mt-4 space-y-4">
            <div class="space-y-1.5">
              <Label for="page-meta-title">Judul di hasil pencarian</Label>
              <Input
                id="page-meta-title"
                v-model="form.metaTitle"
                :placeholder="form.title || 'Mengikuti judul halaman'"
              />
            </div>
            <div class="space-y-1.5">
              <Label for="page-meta-description"
                >Deskripsi di hasil pencarian</Label
              >
              <Textarea
                id="page-meta-description"
                v-model="form.metaDescription"
                rows="2"
                placeholder="Kosongkan untuk mengambil awal isi halaman"
              />
            </div>
          </div>
        </details>

        <Separator />

        <div class="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            :disabled="store.isSaving || !form.title.trim()"
            @click="save"
          >
            <Save class="mr-2 size-4" />
            Simpan
          </Button>

          <Button
            class="ml-auto"
            :disabled="store.isSaving"
            @click="togglePublished"
          >
            <component
              :is="store.current?.status === 'PUBLISHED' ? EyeOff : Send"
              class="mr-2 size-4"
            />
            {{
              store.current?.status === 'PUBLISHED'
                ? 'Tarik dari publikasi'
                : 'Terbitkan'
            }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
