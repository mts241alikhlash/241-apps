<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Separator } from '@mts241alikhlash/ui/separator'
import { Progress } from '@mts241alikhlash/ui/progress'
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
import { Label } from '@mts241alikhlash/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { AcceptableValue } from '@mts241alikhlash/ui/select'
import { ArrowLeft, ChevronDown, Plus } from '@lucide/vue'
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
import { QUESTION_TYPES, typeLabel } from '@/features/exam-bank/types'
import { plainExcerpt } from '@/features/exam-bank/utils/plainText'
import {
  cleanContent,
  emptyContent,
  validateDraft,
} from '@/features/exam-bank/utils/questionDraft'
import ApprovedEditNotice from '../components/ApprovedEditNotice.vue'
import DraftCardList from '../components/DraftCardList.vue'
import { usePackageBuilder } from '../composables/usePackageBuilder'
import { examPackageService } from '../services/examPackageService'
import type { DraftCard } from '../types'

const route = useRoute()
const router = useRouter()
const store = useExamBankStore()
const { user } = useAuthSession()

const ownName = computed(
  () =>
    user.value?.profile?.name?.trim() ||
    user.value?.name?.trim() ||
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
const validCards = computed(() =>
  cards.value.filter(
    (card) =>
      validateDraft(
        card.type,
        card.draft.bodyHtml,
        card.draft.content,
        card.draft.points,
      ) === null,
  ),
)
const activeIndex = ref(0)
const sheetOpen = ref(false)
const confirmOpen = ref(false)
const batchAuthorId = computed({
  get: () => cards.value[0]?.authorId ?? '',
  set: (value: string) => {
    for (const card of cards.value) card.authorId = value
  },
})
const activeCard = computed(() => cards.value[activeIndex.value] ?? null)
const validTotalPoints = computed(() =>
  validCards.value.reduce((sum, card) => sum + card.draft.points, 0),
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
      teachers.value = await examBankService.loadTeachers(pkg.value.subjectId)
    }
  }
  loading.value = false
}

watch([packageId, questionId], init)

onMounted(init)

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
  if (index < activeIndex.value) activeIndex.value -= 1
  activeIndex.value = Math.min(activeIndex.value, cards.value.length - 1)
}

function setDraft(card: DraftCard, next: QuestionDraft) {
  card.draft = next
  card.error = null
}

function parsePoints(value: string | number): number {
  const text = String(value).replace(',', '.')
  return text === '' ? Number.NaN : Number(text)
}

function setCardPoints(card: DraftCard, value: string | number) {
  card.draft = { ...card.draft, points: parsePoints(value) }
  card.error = null
}

function setEditPoints(value: string | number) {
  draft.value = { ...draft.value, points: parsePoints(value) }
}

function changeType(card: DraftCard, value: AcceptableValue) {
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
  if (questionId.value === null) return
  const result = await examPackageService.updateQuestion(
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
          <Plus class="size-4" />
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
                  min="0.25"
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
              <CardContent
                variant="flush"
                class="max-h-[60vh] overflow-y-auto"
              >
                <DraftCardList
                  :cards="cards"
                  :active-index="activeIndex"
                  :snippet-of="snippetOf"
                  @select="selectCard"
                  @remove="removeCard"
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
                        min="0.25"
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
          <ArrowLeft class="size-4" />
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
              cards.length === 0 ? 0 : (validCards.length / cards.length) * 100
            "
          />
        </SheetHeader>
        <Separator />
        <div class="min-h-0 flex-1 overflow-auto">
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
            @remove="removeCard"
          />
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
            <dd class="tabular-nums">{{ validCards.length }}</dd>
            <dt class="text-muted-foreground">Total poin</dt>
            <dd class="text-muted-foreground">:</dd>
            <dd class="tabular-nums">{{ validTotalPoints }}</dd>
            <dt class="text-muted-foreground">Penulis</dt>
            <dd class="text-muted-foreground">:</dd>
            <dd class="min-w-0">
              <Select
                v-if="store.manageAll"
                v-model="batchAuthorId"
              >
                <SelectTrigger aria-label="Penulis soal">
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
          standard
          class="justify-between"
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
            {{ saving ? 'Menyimpan…' : `Simpan ${validCards.length} soal` }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
