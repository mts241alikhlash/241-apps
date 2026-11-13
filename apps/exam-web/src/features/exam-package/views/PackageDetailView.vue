<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton, DataTable } from '@mts241alikhlash/ui'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@mts241alikhlash/ui/collapsible'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Plus } from '@lucide/vue'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { buildBuilderColumns } from '../components/builderColumns'
import AdjustKeyDialog from '../components/AdjustKeyDialog.vue'
import ApprovedEditNotice from '../components/ApprovedEditNotice.vue'
import ReturnedNotes from '../components/ReturnedNotes.vue'
import TakeQuestionsDialog from '../components/TakeQuestionsDialog.vue'
import { usePackageBuilder } from '../composables/usePackageBuilder'
import { examPackageService } from '../services/examPackageService'
import { useExamPackageStore } from '../stores/examPackageStore'
import {
  packageStatusLabel,
  statusVariant,
  type ExamPackageItemView,
} from '../types'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuthSession()
const store = useExamPackageStore()

const id = computed(() => String(route.params.id ?? ''))
const builder = usePackageBuilder(id)
const { pkg, loading, loadFailed, error, canEdit } = builder

const takeOpen = ref(false)
const adjustTarget = ref<ExamPackageItemView | null>(null)

const status = computed(() => pkg.value?.status ?? null)
const totalPoints = computed(() =>
  (pkg.value?.items ?? []).reduce((sum, item) => sum + item.points, 0),
)
const updatedFormat = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const updatedLabel = computed(() =>
  pkg.value ? updatedFormat.format(new Date(pkg.value.updatedAt)) : null,
)
const canAdjustKey = computed(
  () => hasPermission('exam-packages.adjust-key') && status.value === 'LOCKED',
)

const columns = computed(() =>
  buildBuilderColumns({
    canEdit: canEdit.value,
    canAdjustKey: canAdjustKey.value,
    onAdjustKey: (item: ExamPackageItemView) => {
      adjustTarget.value = item
    },
    total: pkg.value?.items.length ?? 0,
    noteOf: builder.noteOf,
    onOpen: (item: ExamPackageItemView) =>
      void router.push(
        `/exam/packages/${id.value}/questions/${item.questionId}`,
      ),
    onMove: (item, direction) => void builder.move(item.questionId, direction),
    onRemove: async (item, { closeAlert, setLoading }) => {
      setLoading(true)
      const removed = await builder.remove(item.questionId)
      setLoading(false)
      if (removed) closeAlert()
    },
  }),
)

useBreadcrumbs(() => [
  { title: 'Paket Soal', href: '/exam/packages' },
  { title: pkg.value?.title ?? 'Paket' },
])

async function reload() {
  takeOpen.value = false
  await builder.load()
}

watch(id, reload)

onMounted(async () => {
  await examPackageService.loadReferences()
  await builder.load()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader variant="muted">
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke Paket Soal"
            @click="router.push('/exam/packages')"
          />
          <CardTitle class="truncate font-semibold">{{
            pkg?.title ?? 'Paket Soal'
          }}</CardTitle>
        </div>
        <Button
          v-if="pkg && canEdit"
          class="shrink-0"
          @click="router.push(`/exam/packages/${id}/questions/new`)"
        >
          <Plus class="mr-1.5 size-4" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6 space-y-4"
      >
        <Alert
          v-if="loadFailed"
          variant="destructive"
          class="grid-cols-1"
        >
          <AlertDescription class="flex flex-wrap items-center gap-3">
            <span>Paket tidak dapat dimuat.</span>
            <Button
              variant="outline"
              size="sm"
              @click="builder.load()"
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
        <p
          v-else-if="!loading && !pkg"
          class="text-[length:var(--text-control,0.75rem)]"
          role="status"
        >
          Paket tidak ditemukan.
        </p>
        <template v-if="pkg">
          <Alert
            v-if="error"
            variant="destructive"
            class="grid-cols-1"
          >
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <ApprovedEditNotice v-if="status === 'APPROVED' && canEdit" />
          <ReturnedNotes :review="builder.lastReturn.value" />
          <div class="flex flex-wrap items-start gap-x-6 gap-y-3">
            <div class="flex flex-col gap-1">
              <span class="text-[length:var(--text-control,0.75rem)] text-muted-foreground">
                Status
              </span>
              <Badge
                :variant="statusVariant(pkg.status)"
                class="w-fit"
              >
                {{ packageStatusLabel(pkg.status) }}
              </Badge>
            </div>
            <dl
              class="flex flex-wrap items-start gap-x-6 gap-y-3 text-[length:var(--text-control,0.75rem)]"
            >
              <div class="flex flex-col gap-1">
                <dt class="text-muted-foreground">Mapel</dt>
                <dd class="font-medium">
                  {{ store.subjectName(pkg.subjectId) }}
                </dd>
              </div>
              <div class="flex flex-col gap-1">
                <dt class="text-muted-foreground">Tingkat</dt>
                <dd class="font-medium">{{ store.gradeName(pkg.gradeId) }}</dd>
              </div>
              <div class="flex flex-col gap-1">
                <dt class="text-muted-foreground">Soal</dt>
                <dd class="font-medium tabular-nums">
                  {{ pkg.items.length }}
                </dd>
              </div>
              <div class="flex flex-col gap-1">
                <dt class="text-muted-foreground">Poin</dt>
                <dd class="font-medium tabular-nums">{{ totalPoints }}</dd>
              </div>
              <div
                v-if="updatedLabel"
                class="flex flex-col gap-1"
              >
                <dt class="text-muted-foreground">Diperbarui</dt>
                <dd class="font-medium tabular-nums">{{ updatedLabel }}</dd>
              </div>
            </dl>
          </div>
          <DataTable
            mobile="cards"
            hide-pagination
            :columns="columns"
            :data="pkg.items"
            :page="1"
            :page-size="Math.max(pkg.items.length, 1)"
            :total-items="pkg.items.length"
            item-label="soal"
          >
            <template #empty>
              <div class="space-y-3 py-2">
                <p
                  class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                >
                  {{
                    canEdit
                      ? 'Paket ini belum berisi soal. Mulai dari salah satu cara berikut.'
                      : 'Paket ini belum berisi soal dan tidak bisa Anda ubah.'
                  }}
                </p>
                <div
                  v-if="canEdit"
                  class="flex flex-wrap items-center justify-center gap-2"
                >
                  <Button
                    size="sm"
                    @click="router.push(`/exam/packages/${id}/questions/new`)"
                  >
                    Buat soal pertama
                  </Button>
                  <Button
                    v-if="hasPermission('exam-questions.create')"
                    variant="outline"
                    size="sm"
                    @click="router.push(`/exam/packages/${id}/import`)"
                  >
                    Impor Excel/Word
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="takeOpen = true"
                  >
                    Ambil dari paket lain
                  </Button>
                </div>
              </div>
            </template>
          </DataTable>
          <Collapsible
            v-if="pkg.reviews.length > 0"
            class="text-[length:var(--text-control,0.75rem)]"
          >
            <CollapsibleTrigger as-child>
              <Button
                variant="ghost"
                size="sm"
                class="w-full justify-between px-2"
              >
                Riwayat tinjauan
                <ChevronDown class="size-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul class="mt-2 space-y-1 px-2">
                <li
                  v-for="review in pkg.reviews"
                  :key="review.id"
                >
                  {{
                    review.action === 'SUBMIT'
                      ? 'Diajukan'
                      : review.action === 'APPROVE'
                        ? 'Disetujui'
                        : 'Dikembalikan'
                  }}
                  · {{ new Date(review.createdAt).toLocaleString('id-ID') }}
                  <span v-if="review.note"> · {{ review.note }}</span>
                </li>
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </template>
      </CardContent>
      <CardFooter variant="thin" />
    </Card>

    <TakeQuestionsDialog
      v-if="takeOpen && pkg"
      v-model:open="takeOpen"
      :package-id="pkg.id"
      :subject-id="pkg.subjectId"
      :grade-id="pkg.gradeId"
      @taken="builder.load()"
    />

    <AdjustKeyDialog
      v-if="adjustTarget && pkg"
      :open="true"
      :package-id="pkg.id"
      :item="adjustTarget"
      @update:open="(value: boolean) => !value && (adjustTarget = null)"
      @adjusted="builder.load()"
    />
  </div>
</template>
