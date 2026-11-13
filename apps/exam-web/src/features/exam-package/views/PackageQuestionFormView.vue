<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Separator } from '@mts241alikhlash/ui/separator'
import { Progress } from '@mts241alikhlash/ui/progress'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@mts241alikhlash/ui/sheet'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
} from '@mts241alikhlash/ui/item'
import { Label } from '@mts241alikhlash/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { ArrowLeft, ChevronDown, Plus, Trash2 } from '@lucide/vue'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import QuestionEditor from '@/features/exam-bank/components/QuestionEditor.vue'
import QuestionPreview from '@/features/exam-bank/components/QuestionPreview.vue'
import { examBankService } from '@/features/exam-bank/services/examBankService'
import { useExamBankStore } from '@/features/exam-bank/stores/examBankStore'
import type {
  NamedOption,
  QuestionDetail,
  QuestionDraft,
  QuestionType,
} from '@/features/exam-bank/types'
import {
  QUESTION_TYPES,
  typeCode,
  typeLabel,
} from '@/features/exam-bank/types'
import { plainExcerpt } from '@/features/exam-bank/utils/plainText'
import {
  cleanContent,
  emptyContent,
  validateDraft,
} from '@/features/exam-bank/utils/questionDraft'
import ApprovedEditNotice from '../components/ApprovedEditNotice.vue'
import { usePackageBuilder } from '../composables/usePackageBuilder'
import { examPackageService } from '../services/examPackageService'

interface DraftCard {
  key: string
  type: QuestionType
  draft: QuestionDraft
  authorId: string
  error: string | null
}

const route = useRoute()
const router = useRouter()
const store = useExamBankStore()
const { user } = useAuthSession()

const ownName = computed(
  () =>
    user.value?.profile?.name?.trim() ??
    user.value?.name?.trim() ??
    'Saya sendiri',
)

const packageId = computed(() => String(route.params.id ?? ''))
const questionId = computed(() =>
  typeof route.params.questionId === 'string' ? route.params.questionId : null,
)
const isEdit = computed(() => questionId.value !== null)
const builder = usePackageBuilder(packageId)
const { pkg, canEdit } = builder

const type = ref<QuestionType>('MULTIPLE_CHOICE')
const draft = ref<QuestionDraft>({
  bodyHtml: '',
  content: emptyContent('MULTIPLE_CHOICE'),
  points: 1,
})
const detail = ref<QuestionDetail | null>(null)
const authorId = ref('')
const teachers = ref<NamedOption[]>([])
const saving = ref(false)
const loading = ref(true)
const formError = ref<string | null>(null)

let cardSeq = 0
function newCard(): DraftCard {
  cardSeq += 1
  return {
    key: `soal-${cardSeq}`,
    type: 'MULTIPLE_CHOICE',
    draft: {
      bodyHtml: '',
      content: emptyContent('MULTIPLE_CHOICE'),
      points: 1,
    },
    authorId: '',
    error: null,
  }
}
const cards = ref<DraftCard[]>([newCard()])
const completedCount = computed(
  () =>
    cards.value.filter(
      (card) =>
        validateDraft(
          card.type,
          card.draft.bodyHtml,
          card.draft.content,
          card.draft.points,
        ) === null,
    ).length,
)
const activeIndex = ref(0)
const listRef = ref<HTMLElement | null>(null)
const sheetOpen = ref(false)
const confirmOpen = ref(false)
const batchAuthorId = computed({
  get: () => cards.value[0]?.authorId ?? '',
  set: (value: string) => {
    for (const card of cards.value) card.authorId = value
  },
})
const atTop = ref(true)
const atBottom = ref(true)
function viewportOf(event?: Event): HTMLElement | null {
  if (event?.target instanceof HTMLElement) return event.target
  return (
    listRef.value?.querySelector<HTMLElement>(
      '[data-slot=scroll-area-viewport]',
    ) ?? null
  )
}

function updateScrollHints(event?: Event) {
  const element = viewportOf(event)
  if (element === null) {
    atTop.value = true
    atBottom.value = true
    return
  }
  atTop.value = element.scrollTop <= 0
  atBottom.value =
    element.scrollTop + element.clientHeight >= element.scrollHeight - 1
}
const activeCard = computed(() => cards.value[activeIndex.value] ?? null)
const draftTotalPoints = computed(() =>
  cards.value.reduce(
    (sum, card) =>
      sum + (Number.isFinite(card.draft.points) ? card.draft.points : 0),
    0,
  ),
)


const note = computed(() =>
  questionId.value === null ? undefined : builder.noteOf(questionId.value),
)

useBreadcrumbs(() => [
  { title: 'Paket Soal', href: '/exam/packages' },
  {
    title: pkg.value?.title ?? 'Paket',
    href: `/exam/packages/${packageId.value}`,
  },
  { title: isEdit.value ? 'Soal' : 'Soal Baru' },
])

function applyDetail(next: QuestionDetail) {
  detail.value = next
  type.value = next.type
  draft.value = {
    bodyHtml: next.current.bodyHtml,
    content: next.current.content,
    points: next.current.points,
  }
}

async function init() {
  loading.value = true
  await builder.load()
  if (builder.notFound.value) {
    await router.replace('/exam/packages')
    return
  }
  if (questionId.value !== null) {
    const loaded = await examPackageService.loadQuestion(
      packageId.value,
      questionId.value,
    )
    if (loaded === null) {
      await router.replace(`/exam/packages/${packageId.value}`)
      return
    }
    applyDetail(loaded)
  } else if (pkg.value) {
    await examBankService.loadReferences()
    if (store.manageAll) {
      teachers.value = await examBankService.loadTeachers()
    }
  }
  loading.value = false
}

watch([packageId, questionId], init)

onMounted(async () => {
  await init()
  await nextTick()
  updateScrollHints()
})

watch(
  cards,
  () => void nextTick(updateScrollHints),
  { deep: true },
)

function snippetOf(card: DraftCard): string {
  const text = plainExcerpt(card.draft.bodyHtml, 60)
  return text === '' ? 'Soal baru' : text
}

function selectCard(index: number) {
  activeIndex.value = index
}

function addCard() {
  cards.value.push(newCard())
  selectCard(cards.value.length - 1)
}

function removeCard(index: number) {
  if (cards.value.length === 1) return
  cards.value.splice(index, 1)
  activeIndex.value = Math.min(activeIndex.value, cards.value.length - 1)
}

function setDraft(card: DraftCard, next: QuestionDraft) {
  card.draft = next
  card.error = null
}

function parsePoints(value: unknown): number {
  const text = String(value ?? '').replace(',', '.')
  return text === '' ? Number.NaN : Number(text)
}

function setCardPoints(card: DraftCard, value: unknown) {
  card.draft = { ...card.draft, points: parsePoints(value) }
  card.error = null
}

function setEditPoints(value: unknown) {
  draft.value = { ...draft.value, points: parsePoints(value) }
}

function changeType(card: DraftCard, value: unknown) {
  const next = QUESTION_TYPES.find((option) => option === value)
  if (next === undefined) return
  card.type = next
  card.draft = { ...card.draft, content: emptyContent(next) }
  card.error = null
}

async function saveEdit() {
  const problem = validateDraft(
    type.value,
    draft.value.bodyHtml,
    draft.value.content,
    draft.value.points,
  )
  if (problem) {
    formError.value = problem
    return
  }
  saving.value = true
  formError.value = null
  const body = {
    bodyHtml: draft.value.bodyHtml,
    content: cleanContent(type.value, draft.value.content),
    points: draft.value.points,
  }
  const result =
    questionId.value === null
      ? await examPackageService.addQuestion(packageId.value, {
          type: type.value,
          ...body,
          ...(authorId.value ? { authorEmployeeId: authorId.value } : {}),
        })
      : await examPackageService.updateQuestion(
          packageId.value,
          questionId.value,
          body,
        )
  saving.value = false
  if (!result.success) {
    formError.value = result.error
    return
  }
  await router.push(`/exam/packages/${packageId.value}`)
}

async function saveBulk() {
  if (saving.value) return
  formError.value = null
  for (const card of cards.value) {
    card.error = validateDraft(
      card.type,
      card.draft.bodyHtml,
      card.draft.content,
      card.draft.points,
    )
  }
  if (cards.value.every((card) => card.error !== null)) {
    formError.value = 'Isi dulu minimal satu soal.'
    return
  }
  saving.value = true
  for (const card of cards.value) {
    if (card.error !== null) continue
    const result = await examPackageService.addQuestion(packageId.value, {
      type: card.type,
      bodyHtml: card.draft.bodyHtml,
      content: cleanContent(card.type, card.draft.content),
      points: card.draft.points,
      ...(card.authorId ? { authorEmployeeId: card.authorId } : {}),
    })
    if (!result.success) card.error = result.error
  }
  saving.value = false
  const remaining = cards.value.filter((card) => card.error !== null)
  if (remaining.length === 0) {
    await router.push(`/exam/packages/${packageId.value}`)
    return
  }
  cards.value = remaining
  activeIndex.value = 0
  formError.value = `${remaining.length} soal belum tersimpan. Perbaiki lalu simpan lagi.`
}

function save() {
  if (isEdit.value) return void saveEdit()
  confirmOpen.value = true
}

async function confirmSave() {
  await saveBulk()
  if (formError.value === null) confirmOpen.value = false
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader
        variant="muted"
        class="px-2"
      >
        <div class="flex items-center gap-3">
          <BackButton
            v-if="isEdit"
            label="Kembali ke paket"
            @click="router.push(`/exam/packages/${packageId}`)"
          />
          <CardTitle class="font-semibold">
            {{ isEdit ? 'Ubah Soal' : 'Tambah Soal' }}
          </CardTitle>
        </div>
        <Button
          v-if="!loading && canEdit && !isEdit"
          class="lg:hidden"
          :disabled="saving"
          @click="addCard"
        >
          <Plus class="mr-1.5 size-4" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent
        v-if="!loading"
        class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2"
      >
        <ApprovedEditNotice v-if="pkg?.status === 'APPROVED' && canEdit" />

        <template v-if="isEdit">
          <dl
            v-if="detail"
            class="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[length:var(--text-control,0.75rem)]"
          >
            <div class="flex items-baseline gap-1.5">
              <dt class="text-muted-foreground">Jenis</dt>
              <dd class="font-medium">{{ typeLabel(detail.type) }}</dd>
            </div>
            <div class="flex items-baseline gap-1.5">
              <dt class="text-muted-foreground">Versi</dt>
              <dd class="font-medium tabular-nums">
                {{ detail.currentVersion }}
              </dd>
            </div>
          </dl>

          <div
            v-if="note"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
            role="status"
          >
            Catatan penyetuju: {{ note }}
          </div>

          <template v-if="!canEdit">
            <div
              class="rounded-md border bg-muted/30 p-3 text-[length:var(--text-control,0.75rem)]"
              role="status"
            >
              Paket ini tidak bisa diubah. Anda hanya bisa melihat soalnya.
            </div>
            <QuestionPreview
              v-if="detail"
              :type="detail.type"
              :body-html="detail.current.bodyHtml"
              :content="detail.current.content"
              :points="detail.current.points"
            />
          </template>
          <template v-else>
            <QuestionEditor
              v-model="draft"
              :type="type"
            >
              <template #answer-actions>
                <Label
                  for="edit-points"
                  class="text-muted-foreground"
                >
                  Poin
                </Label>
                <Input
                  id="edit-points"
                  :model-value="
                    Number.isNaN(draft.points) ? '' : String(draft.points)
                  "
                  type="number"
                  inputmode="decimal"
                  min="1"
                  max="100"
                  step="0.25"
                  class="h-[var(--control-h-sm,1.5rem)] w-14 text-center appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  @update:model-value="setEditPoints"
                />
              </template>
            </QuestionEditor>
            <QuestionPreview
              :type="type"
              :body-html="draft.bodyHtml"
              :content="draft.content"
              :points="draft.points"
            />
          </template>
        </template>

        <template v-else>
          <div
            v-if="!canEdit"
            class="rounded-md border bg-muted/30 p-3 text-[length:var(--text-control,0.75rem)]"
            role="status"
          >
            Paket ini tidak bisa diubah, jadi soal baru tidak bisa ditambahkan.
          </div>

          <div
            v-else
            class="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          >
            <Card
              gap="none"
              class="hidden min-w-0 lg:flex"
            >
              <CardHeader
                variant="muted"
                class="px-2"
              >
                <CardTitle>Daftar soal</CardTitle>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Tambah soal"
                  title="Tambah soal"
                  :disabled="saving"
                  @click="addCard"
                >
                  <Plus />
                </Button>
              </CardHeader>
              <CardContent variant="flush">
                <div
                  v-if="!atTop"
                  class="text-[length:var(--text-control,0.75rem)] text-center text-muted-foreground"
                >
                  ⋯
                </div>
                <div
                  v-if="cards.length > 0"
                  ref="listRef"
                >
                <ScrollArea
                  class="max-h-[60vh] [&_[data-slot=scroll-area-scrollbar]]:w-1.5 [&_[data-slot=scroll-area-viewport]]:max-h-[60vh] [&_[data-slot=scroll-area-viewport]]:overflow-y-auto"
                  @scroll.capture="updateScrollHints"
                >
                <ItemGroup class="gap-0">
                  <Item
                    v-for="(card, index) in cards"
                    :key="card.key"
                    class="min-w-0 flex-nowrap gap-1 rounded-none border-0 px-2 py-1 hover:bg-muted"
                    :class="index === activeIndex ? 'bg-muted' : undefined"
                  >
                    <ItemContent class="min-w-0">
                      <button
                        type="button"
                        class="flex w-full min-w-0 items-center gap-2 text-left"
                        :aria-current="
                          index === activeIndex ? 'true' : undefined
                        "
                        @click="selectCard(index)"
                      >
                        <span
                          class="w-4 shrink-0 text-right text-[length:var(--text-control,0.75rem)] text-muted-foreground tabular-nums"
                        >
                          {{ index + 1 }}
                        </span>
                        <span
                          class="min-w-0 flex-1 truncate text-[length:var(--text-control,0.75rem)]"
                        >
                          {{ snippetOf(card) }}
                        </span>
                      </button>
                    </ItemContent>
                    <ItemActions class="shrink-0">
                      <span
                        class="w-8 shrink-0 text-right text-[length:var(--text-control,0.75rem)] text-muted-foreground"
                        :title="typeLabel(card.type)"
                      >
                        {{ typeCode(card.type) }}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        :aria-label="`Hapus soal ${index + 1}`"
                        :title="`Hapus soal ${index + 1}`"
                        :disabled="cards.length === 1"
                        @click="removeCard(index)"
                      >
                        <Trash2 />
                      </Button>
                    </ItemActions>
                  </Item>
                </ItemGroup>
                </ScrollArea>
                </div>
                <div
                  v-if="!atBottom"
                  class="text-[length:var(--text-control,0.75rem)] text-center text-muted-foreground"
                >
                  ⋯
                </div>
              </CardContent>
            </Card>

            <div class="flex min-w-0 flex-col gap-2">
              <Card
                v-if="activeCard"
                gap="none"
                class="min-w-0"
              >
                <CardHeader
                  variant="muted"
                  class="px-2"
                >
                  <CardTitle>Soal {{ activeIndex + 1 }}</CardTitle>
                </CardHeader>
                <CardContent class="flex flex-col gap-2 p-2">
                  <QuestionEditor
                    :model-value="activeCard.draft"
                    :type="activeCard.type"
                    @update:model-value="(next) => setDraft(activeCard, next)"
                  >
                    <template #soal-actions>
                      <Label
                        :for="`${activeCard.key}-type`"
                        class="text-muted-foreground"
                      >
                        Jenis
                      </Label>
                      <Select
                        :model-value="activeCard.type"
                        @update:model-value="
                          (value) => changeType(activeCard, value)
                        "
                      >
                        <SelectTrigger
                          :id="`${activeCard.key}-type`"
                          size="sm"
                          :title="typeLabel(activeCard.type)"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="option in QUESTION_TYPES"
                            :key="option"
                            :value="option"
                          >
                            {{ typeLabel(option) }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </template>
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
                          Number.isNaN(activeCard.draft.points)
                            ? ''
                            : String(activeCard.draft.points)
                        "
                        type="number"
                        inputmode="decimal"
                        min="1"
                        max="100"
                        step="0.25"
                        class="h-[var(--control-h-sm,1.5rem)] w-14 text-center appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        @update:model-value="
                          (value) => setCardPoints(activeCard, value)
                        "
                      />
                    </template>
                  </QuestionEditor>

                  <QuestionPreview
                    :type="activeCard.type"
                    :body-html="activeCard.draft.bodyHtml"
                    :content="activeCard.draft.content"
                    :points="activeCard.draft.points"
                  />

                  <p
                    v-if="activeCard.error"
                    class="text-[length:var(--text-control,0.75rem)] text-destructive"
                    role="alert"
                  >
                    {{ activeCard.error }}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </template>

        <p
          v-if="formError"
          class="text-[length:var(--text-control,0.75rem)] text-destructive"
          role="alert"
        >
          {{ formError }}
        </p>
      </CardContent>

      <CardFooter
        v-if="!loading && canEdit && isEdit"
        standard
        class="justify-end px-2"
      >
        <Button
          type="button"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Menyimpan…' : 'Simpan' }}
        </Button>
      </CardFooter>
    </Card>

    <div
      v-if="!loading && canEdit && !isEdit"
      class="mt-2 flex min-h-[var(--control-h-lg,2rem)] shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card/85 px-3 py-1 shadow-xs backdrop-blur-md"
    >
      <div class="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          @click="router.push(`/exam/packages/${packageId}`)"
        >
          <ArrowLeft class="mr-1.5 size-4" />
          Kembali
        </Button>
        <div
          v-if="activeCard"
          class="flex items-center gap-2 lg:hidden"
        >
          <Button
            variant="outline"
            size="sm"
            class="min-w-0"
            @click="sheetOpen = true"
          >
            <span class="truncate">
              Soal {{ activeIndex + 1 }} dari {{ cards.length }}
            </span>
            <ChevronDown class="ml-1 size-3 shrink-0" />
          </Button>
        </div>
      </div>
      <Button
        type="button"
        :disabled="saving"
        @click="save"
      >
        {{ saving ? 'Menyimpan…' : `Simpan ${cards.length} soal` }}
      </Button>
    </div>


    <Sheet v-model:open="sheetOpen">
      <SheetContent
        side="bottom"
        class="flex max-h-[80vh] flex-col gap-0"
      >
        <SheetHeader class="gap-2 p-3">
          <SheetTitle>Daftar soal</SheetTitle>
          <SheetDescription class="sr-only">
            Pilih soal yang ingin diedit
          </SheetDescription>
          <Progress
            :model-value="
              cards.length === 0 ? 0 : (completedCount / cards.length) * 100
            "
          />
        </SheetHeader>
        <Separator />
        <div class="min-h-0 flex-1 overflow-auto">
          <ItemGroup class="gap-0 divide-y divide-border">
            <Item
              v-for="(card, index) in cards"
              :key="card.key"
              class="min-w-0 flex-nowrap gap-1.5 rounded-none border-0 px-2 py-2 hover:bg-muted"
              :class="index === activeIndex ? 'bg-muted' : undefined"
            >
              <ItemContent class="min-w-0">
                <button
                  type="button"
                  class="flex w-full min-w-0 items-center gap-2 text-left"
                  :aria-current="index === activeIndex ? 'true' : undefined"
                  @click="
                    () => {
                      selectCard(index)
                      sheetOpen = false
                    }
                  "
                >
                  <span
                    class="grid size-5 shrink-0 place-items-center rounded-md bg-background text-[length:var(--text-control,0.75rem)] text-muted-foreground tabular-nums"
                  >
                    {{ index + 1 }}
                  </span>
                  <span
                    class="min-w-0 flex-1 truncate text-[length:var(--text-control,0.75rem)]"
                  >
                    {{ snippetOf(card) }}
                  </span>
                </button>
              </ItemContent>
              <ItemActions class="shrink-0">
                <Badge
                  variant="outline"
                  :title="typeLabel(card.type)"
                >
                  {{ typeCode(card.type) }}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  :aria-label="`Hapus soal ${index + 1}`"
                  :disabled="cards.length === 1"
                  @click="removeCard(index)"
                >
                  <Trash2 />
                </Button>
              </ItemActions>
            </Item>
          </ItemGroup>
        </div>
      </SheetContent>
    </Sheet>

    <Dialog v-model:open="confirmOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Simpan Soal</DialogTitle>
        </DialogHeader>
        <DialogBody class="space-y-3">
          <dl
            class="grid grid-cols-[6rem_auto_1fr] items-center gap-x-2 gap-y-2 text-[length:var(--text-control,0.75rem)]"
          >
            <dt class="text-muted-foreground">Paket</dt>
            <dd class="text-muted-foreground">:</dd>
            <dd class="min-w-0 truncate font-medium">
              {{ pkg?.title ?? 'Paket ini' }}
            </dd>
            <dt class="text-muted-foreground">Jumlah soal</dt>
            <dd class="text-muted-foreground">:</dd>
            <dd class="tabular-nums">{{ cards.length }}</dd>
            <dt class="text-muted-foreground">Total poin</dt>
            <dd class="text-muted-foreground">:</dd>
            <dd class="tabular-nums">{{ draftTotalPoints }}</dd>
            <dt class="text-muted-foreground">Penulis</dt>
            <dd class="text-muted-foreground">:</dd>
            <dd class="min-w-0">
              <Select
                v-if="store.manageAll"
                v-model="batchAuthorId"
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Penulis soal"
                >
                  <SelectValue :placeholder="ownName" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="teacher in teachers"
                    :key="teacher.id"
                    :value="teacher.id"
                  >
                    {{ teacher.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <span
                v-else
                class="font-medium"
              >
                {{ ownName }}
              </span>
            </dd>
          </dl>
          <p
            v-if="formError"
            class="text-[length:var(--text-control,0.75rem)] text-destructive"
            role="alert"
          >
            {{ formError }}
          </p>
        </DialogBody>
        <DialogFooter
          class="flex-row items-center justify-end gap-2 border-t border-border px-4 py-3"
        >
          <Button
            variant="outline"
            @click="confirmOpen = false"
          >
            Batal
          </Button>
          <Button
            :disabled="saving"
            @click="confirmSave"
          >
            {{ saving ? 'Menyimpan…' : `Simpan ${cards.length} soal` }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
