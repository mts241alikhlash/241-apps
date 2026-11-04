<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardHeader } from '@mts241alikhlash/ui/card'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@mts241alikhlash/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { useRoleGuard } from '@/features/platform/auth'
import LandingSectionForm from '../components/landing-admin/LandingSectionForm.vue'
import { landingDefaults } from '../data/landingDefaults'
import { LANDING_SECTIONS } from '../data/landingFormConfig'
import { landingService } from '../services/landingService'
import type { LandingDraftOverview, LandingSectionKey } from '../types/landing'
import { formatDate } from '../utils'

const router = useRouter()
const { can } = useRoleGuard()
const canUpdate = computed(() => can('admission-landing.update'))
const canPublish = computed(() => can('admission-landing.publish'))

const overview = ref<LandingDraftOverview | null>(null)
const loadError = ref<string | null>(null)
const loading = ref(false)
const active = ref<LandingSectionKey>('hero')
const dirtyKeys = ref(new Set<LandingSectionKey>())
const confirmOpen = ref(false)
const action = ref<'publish' | 'discard'>('publish')
const busy = ref(false)
const formsVersion = ref(0)

function sectionContent(key: LandingSectionKey) {
  return overview.value?.sections[key] ?? landingDefaults[key]
}

const anyDirty = computed(() => dirtyKeys.value.size > 0)

function ask(next: 'publish' | 'discard') {
  action.value = next
  confirmOpen.value = true
}

async function load() {
  loading.value = true
  const result = await landingService.fetchDraft()
  loadError.value = 'error' in result ? result.error : null
  if ('overview' in result) overview.value = result.overview
  loading.value = false
}

function onSaved(key: LandingSectionKey, next: LandingDraftOverview) {
  overview.value = next
  dirtyKeys.value.delete(key)
}

function onDirty(key: LandingSectionKey, value: boolean) {
  if (value) dirtyKeys.value.add(key)
  else dirtyKeys.value.delete(key)
  dirtyKeys.value = new Set(dirtyKeys.value)
}

async function run(chosen: 'publish' | 'discard') {
  busy.value = true
  const result =
    chosen === 'publish'
      ? await landingService.publish()
      : await landingService.discard()
  busy.value = false
  confirmOpen.value = false
  if ('error' in result) return
  overview.value = result.overview
  if (chosen === 'discard') {
    dirtyKeys.value = new Set()
    formsVersion.value += 1
  }
}

function confirmLeave() {
  return (
    !anyDirty.value ||
    window.confirm('Ada perubahan yang belum disimpan. Tinggalkan halaman ini?')
  )
}

onBeforeRouteLeave(() => confirmLeave())
onMounted(load)

const publishedLabel = computed(() =>
  overview.value?.publishedAt
    ? `Terakhir terbit ${formatDate(overview.value.publishedAt)}`
    : 'Belum pernah diterbitkan',
)
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="justify-end min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <Button
          class="w-full sm:w-auto"
          variant="outline"
          @click="router.push('/admin/landing/preview')"
        >
          Pratinjau
        </Button>
      </CardHeader>

      <div class="space-y-5 p-0 sm:px-0">
        <div
          v-if="loadError"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">
            {{ loadError }}
          </p>
          <Button
            variant="outline"
            @click="load()"
          >
            Coba lagi
          </Button>
        </div>

        <template v-else-if="overview">
          <div
            data-test="landing-status"
            class="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4"
          >
            <div class="space-y-1">
              <Badge
                :variant="
                  overview.hasUnpublishedChanges ? 'default' : 'secondary'
                "
              >
                {{
                  overview.hasUnpublishedChanges
                    ? 'Ada perubahan belum diterbitkan'
                    : overview.publishedAt
                      ? 'Sudah terbit'
                      : 'Isi bawaan'
                }}
              </Badge>
              <p class="text-xs text-muted-foreground">{{ publishedLabel }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                v-if="canUpdate"
                variant="outline"
                :disabled="!overview.hasUnpublishedChanges || busy"
                @click="ask('discard')"
              >
                Buang perubahan
              </Button>
              <Button
                v-if="canPublish"
                :disabled="!overview.hasUnpublishedChanges || busy"
                @click="ask('publish')"
              >
                Terbitkan
              </Button>
            </div>
          </div>

          <Tabs
            v-model="active"
            variant="line"
          >
            <TabsList class="flex-wrap">
              <TabsTrigger
                v-for="section in LANDING_SECTIONS"
                :key="section.key"
                :value="section.key"
              >
                {{ section.label
                }}<span
                  v-if="dirtyKeys.has(section.key)"
                  class="ml-1.5 text-xs text-amber-700"
                  >(belum disimpan)</span
                >
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <LandingSectionForm
            v-for="section in LANDING_SECTIONS"
            v-show="active === section.key"
            :key="`${section.key}-${formsVersion}`"
            :config="section"
            :initial="sectionContent(section.key)"
            :disabled="!canUpdate"
            @saved="onSaved(section.key, $event)"
            @dirty="onDirty(section.key, $event)"
          />
        </template>
      </div>
    </Card>

    <AlertDialog
      :open="confirmOpen"
      @update:open="
        (open) => {
          if (!open) confirmOpen = false
        }
      "
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{
              action === 'publish'
                ? 'Terbitkan halaman depan?'
                : 'Buang semua perubahan?'
            }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{
              action === 'publish'
                ? 'Semua bagian yang sudah disimpan sebagai draf langsung tampil di halaman depan untuk pengunjung.'
                : 'Draf semua bagian dihapus dan halaman kembali ke isi yang sudah terbit. Perubahan yang belum disimpan di layar ini ikut hilang.'
            }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            :disabled="busy"
            @click="run(action)"
          >
            {{ action === 'publish' ? 'Terbitkan sekarang' : 'Buang sekarang' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
