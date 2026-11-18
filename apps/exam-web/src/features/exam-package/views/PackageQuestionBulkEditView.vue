<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@mts241alikhlash/ui/sheet'
import { ArrowLeft, ChevronDown } from '@lucide/vue'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import QuestionEditor from '@/features/exam-bank/components/QuestionEditor.vue'
import QuestionPreview from '@/features/exam-bank/components/QuestionPreview.vue'
import type { QuestionContent, QuestionDraft } from '@/features/exam-bank/types'
import { typeLabel } from '@/features/exam-bank/types'
import { plainExcerpt } from '@/features/exam-bank/utils/plainText'
import {
  cleanContent,
  validateDraft,
} from '@/features/exam-bank/utils/questionDraft'
import DraftCardList from '../components/DraftCardList.vue'
import { usePackageBuilder } from '../composables/usePackageBuilder'
import { examPackageService } from '../services/examPackageService'
import type { EditCard, EditChange } from '../types'

const route = useRoute()
const router = useRouter()

const packageId = computed(() => String(route.params.id ?? ''))
const builder = usePackageBuilder(packageId)
const { pkg, canEdit, loading } = builder

const cards = ref<EditCard[]>([])
const activeIndex = ref(0)
const saving = ref(false)
const formError = ref<string | null>(null)
const sheetOpen = ref(false)

let cardSeq = 0

const activeCard = computed<EditCard | null>(
  () => cards.value[activeIndex.value] ?? null,
)

const changedCards = computed(() => cards.value.filter(isChanged))

const dirtyCount = computed(() => changedCards.value.length)

useBreadcrumbs(() => [
  { title: 'Paket Soal', href: '/exam/packages' },
  {
    title: pkg.value?.title ?? 'Paket',
    href: `/exam/packages/${packageId.value}`,
  },
  { title: 'Ubah Soal Massal' },
])

function isChanged(card: EditCard): boolean {
  return (
    card.bodyHtml !== card.original.bodyHtml ||
    card.points !== card.original.points ||
    JSON.stringify(card.content) !== JSON.stringify(card.original.content)
  )
}

function toCard(
  questionId: string,
  type: EditCard['type'],
  bodyHtml: string,
  content: QuestionContent,
  points: number,
): EditCard {
  cardSeq += 1
  return {
    key: `ubah-${cardSeq}`,
    questionId,
    type,
    bodyHtml,
    content,
    points,
    original: { bodyHtml, content, points },
    error: null,
  }
}

async function loadCards() {
  const items = pkg.value?.items ?? []
  const loaded: EditCard[] = []
  for (const item of items) {
    const detail = await examPackageService.loadQuestion(
      packageId.value,
      item.questionId,
    )
    if (detail === null) continue
    loaded.push(
      toCard(
        item.questionId,
        detail.type,
        detail.current.bodyHtml,
        detail.current.content,
        detail.current.points,
      ),
    )
  }
  cards.value = loaded
  activeIndex.value = 0
}

async function init() {
  await builder.load()
  if (builder.notFound.value) {
    await router.replace('/exam/packages')
    return
  }
  await loadCards()
}

watch(packageId, init)
onMounted(init)

function snippetOf(card: EditCard): string {
  const text = plainExcerpt(card.bodyHtml, 60)
  return text === '' ? 'Soal kosong' : text
}

function selectCard(index: number) {
  activeIndex.value = index
}

function addPoints(value: string | number) {
  if (!activeCard.value) return
  const text = String(value).replace(',', '.')
  activeCard.value.points = text === '' ? Number.NaN : Number(text)
  activeCard.value.error = null
}

function setDraft(next: QuestionDraft) {
  const card = activeCard.value
  if (!card) return
  card.bodyHtml = next.bodyHtml
  card.content = next.content
  card.error = null
}

function resetAll() {
  for (const card of cards.value) {
    card.bodyHtml = card.original.bodyHtml
    card.content = card.original.content
    card.points = card.original.points
    card.error = null
  }
  formError.value = null
}

async function save() {
  if (saving.value) return
  formError.value = null

  for (const card of cards.value) {
    card.error = isChanged(card)
      ? validateDraft(card.type, card.bodyHtml, card.content, card.points)
      : null
  }

  const targets = changedCards.value.filter((card) => card.error === null)
  if (targets.length === 0) {
    formError.value = 'Belum ada soal yang diubah.'
    return
  }

  saving.value = true
  const failed: EditCard[] = []
  for (const card of targets) {
    const change: EditChange = { questionId: card.questionId }
    if (card.bodyHtml !== card.original.bodyHtml)
      change.bodyHtml = card.bodyHtml
    if (card.points !== card.original.points) change.points = card.points
    if (
      JSON.stringify(card.content) !== JSON.stringify(card.original.content)
    ) {
      change.content = cleanContent(card.type, card.content)
    }
    const result = await examPackageService.updateQuestion(
      packageId.value,
      card.questionId,
      {
        ...(change.bodyHtml !== undefined ? { bodyHtml: change.bodyHtml } : {}),
        ...(change.content !== undefined ? { content: change.content } : {}),
        ...(change.points !== undefined ? { points: change.points } : {}),
      },
    )
    if (!result.success) {
      card.error = result.error
      failed.push(card)
      continue
    }
    card.original = {
      bodyHtml: card.bodyHtml,
      content: card.content,
      points: card.points,
    }
  }
  saving.value = false

  if (failed.length === 0) {
    await router.push(`/exam/packages/${packageId.value}`)
    return
  }
  formError.value = `${failed.length} soal gagal disimpan. Perbaiki lalu simpan lagi.`
  activeIndex.value = cards.value.findIndex((card) => card.error !== null)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader
        standard
        class="px-2"
      >
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke paket"
            @click="router.push(`/exam/packages/${packageId}`)"
          />
          <CardTitle class="font-semibold">Ubah Soal Massal</CardTitle>
        </div>
        <Button
          v-if="!loading && canEdit"
          class="lg:hidden"
          :disabled="saving"
          @click="sheetOpen = true"
        >
          <span class="truncate">
            Soal {{ activeIndex + 1 }} dari {{ cards.length }}
          </span>
          <ChevronDown class="ml-1 size-3 shrink-0" />
        </Button>
      </CardHeader>

      <CardContent
        v-if="!loading"
        class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2"
      >
        <div
          v-if="!canEdit"
          class="rounded-md border bg-muted/30 p-3 text-control"
          role="status"
        >
          Paket ini tidak bisa diubah, jadi soal tidak bisa disunting.
        </div>

        <p
          v-else-if="cards.length === 0"
          class="text-control text-muted-foreground"
        >
          Paket ini belum berisi soal.
        </p>

        <div
          v-else
          class="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        >
          <Card
            gap="none"
            class="hidden min-w-0 lg:flex"
          >
            <CardHeader
              standard
              class="px-2"
            >
              <CardTitle>Daftar soal</CardTitle>
              <span class="text-control text-muted-foreground tabular-nums">
                {{ dirtyCount }} diubah
              </span>
            </CardHeader>
            <CardContent
              variant="flush"
              class="max-h-[60vh] overflow-y-auto"
            >
              <DraftCardList
                :cards="cards"
                :active-index="activeIndex"
                :snippet-of="snippetOf"
                @select="selectCard"
                @remove="() => undefined"
              />
            </CardContent>
          </Card>

          <div class="flex min-w-0 flex-col gap-2">
            <Card
              v-if="activeCard"
              gap="none"
              class="min-w-0"
            >
              <CardHeader
                standard
                class="px-2"
              >
                <CardTitle>Soal {{ activeIndex + 1 }}</CardTitle>
                <span
                  v-if="isChanged(activeCard)"
                  class="text-control text-warning"
                >
                  Belum disimpan
                </span>
              </CardHeader>
              <CardContent class="flex flex-col gap-2 p-2">
                <dl
                  class="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-control"
                >
                  <div class="flex items-baseline gap-1.5">
                    <dt class="text-muted-foreground">Jenis</dt>
                    <dd class="font-medium">
                      {{ typeLabel(activeCard.type) }}
                    </dd>
                  </div>
                  <div class="flex items-baseline gap-1.5">
                    <dt class="text-muted-foreground">Posisi</dt>
                    <dd class="font-medium tabular-nums">
                      {{ activeIndex + 1 }} dari {{ cards.length }}
                    </dd>
                  </div>
                </dl>

                <QuestionEditor
                  :model-value="{
                    bodyHtml: activeCard.bodyHtml,
                    content: activeCard.content,
                    points: activeCard.points,
                  }"
                  :type="activeCard.type"
                  @update:model-value="setDraft"
                >
                  <template #answer-actions>
                    <Label
                      :for="`${activeCard.key}-points`"
                      class="text-muted-foreground"
                    >
                      Poin
                    </Label>
                    <Input
                      :id="`${activeCard.key}-points`"
                      :model-value="
                        Number.isNaN(activeCard.points)
                          ? ''
                          : String(activeCard.points)
                      "
                      type="number"
                      inputmode="decimal"
                      min="0.25"
                      max="100"
                      step="0.25"
                      class="w-14 text-center"
                      @update:model-value="addPoints"
                    />
                  </template>
                </QuestionEditor>

                <QuestionPreview
                  :type="activeCard.type"
                  :body-html="activeCard.bodyHtml"
                  :content="activeCard.content"
                  :points="activeCard.points"
                />

                <p
                  v-if="activeCard.error"
                  class="text-control text-destructive"
                  role="alert"
                >
                  {{ activeCard.error }}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <p
          v-if="formError"
          class="text-control text-destructive"
          role="alert"
        >
          {{ formError }}
        </p>
      </CardContent>

      <CardFooter
        v-if="!loading && canEdit && cards.length > 0"
        class="justify-end px-2"
      >
        <Button
          v-if="dirtyCount > 0"
          variant="outline"
          type="button"
          :disabled="saving"
          @click="resetAll"
        >
          Batalkan perubahan
        </Button>
        <Button
          type="button"
          :disabled="saving || dirtyCount === 0"
          @click="save"
        >
          {{ saving ? 'Menyimpan…' : `Simpan ${dirtyCount} soal` }}
        </Button>
      </CardFooter>
    </Card>

    <div
      v-if="!loading && canEdit && cards.length > 0"
      class="mt-2 flex min-h-[var(--control-h-lg,2.25rem)] shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card/85 px-3 py-1 shadow-xs backdrop-blur-md"
    >
      <div class="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          @click="router.push(`/exam/packages/${packageId}`)"
        >
          <ArrowLeft class="size-4" />
          Kembali
        </Button>
        <Button
          v-if="dirtyCount > 0"
          variant="ghost"
          @click="resetAll"
        >
          Batalkan
        </Button>
      </div>
      <Button
        type="button"
        :disabled="saving || dirtyCount === 0"
        @click="save"
      >
        {{ saving ? 'Menyimpan…' : `Simpan ${dirtyCount} soal` }}
      </Button>
    </div>

    <Sheet v-model:open="sheetOpen">
      <SheetContent
        side="bottom"
        class="max-h-[70vh]"
      >
        <SheetHeader>
          <SheetTitle>Daftar soal</SheetTitle>
          <SheetDescription>
            Pilih soal yang ingin disunting.
          </SheetDescription>
        </SheetHeader>
        <div class="max-h-[50vh] overflow-y-auto">
          <DraftCardList
            :cards="cards"
            :active-index="activeIndex"
            :snippet-of="snippetOf"
            @select="
              (index) => {
                selectCard(index)
                sheetOpen = false
              }
            "
            @remove="() => undefined"
          />
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
