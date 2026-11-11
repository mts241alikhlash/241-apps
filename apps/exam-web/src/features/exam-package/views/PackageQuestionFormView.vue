<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import AnswerKey from '@/features/exam-bank/components/AnswerKey.vue'
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
import {
  cleanContent,
  emptyContent,
  validateDraft,
} from '@/features/exam-bank/utils/questionDraft'
import ApprovedEditNotice from '../components/ApprovedEditNotice.vue'
import { usePackageBuilder } from '../composables/usePackageBuilder'
import { examPackageService } from '../services/examPackageService'

const route = useRoute()
const router = useRouter()
const store = useExamBankStore()

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

const typeFieldId = useId()
const authorFieldId = useId()

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

watch(type, (next) => {
  if (!isEdit.value) {
    draft.value = { ...draft.value, content: emptyContent(next) }
  }
})

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

async function save() {
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
            label="Kembali ke paket"
            @click="router.push(`/exam/packages/${packageId}`)"
          />
          <CardTitle class="font-semibold">
            {{ isEdit ? 'Ubah Soal' : 'Tambah Soal' }}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent
        v-if="!loading"
        class="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6 space-y-6"
      >
        <div
          v-if="detail"
          class="flex flex-wrap items-center gap-2 text-[length:var(--text-control,0.75rem)]"
        >
          <Badge variant="outline">{{ typeLabel(detail.type) }}</Badge>
          <span class="text-muted-foreground">
            Versi {{ detail.currentVersion }}
          </span>
        </div>

        <ApprovedEditNotice v-if="pkg?.status === 'APPROVED' && canEdit" />

        <div
          v-if="note"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
          role="status"
        >
          Catatan penyetuju: {{ note }}
        </div>

        <div
          v-if="!isEdit && !canEdit"
          class="rounded-md border bg-muted/30 p-3 text-[length:var(--text-control,0.75rem)]"
          role="status"
        >
          Paket ini tidak bisa diubah, jadi soal baru tidak bisa ditambahkan.
        </div>

        <div
          v-if="!isEdit && canEdit"
          class="grid gap-5 sm:grid-cols-2"
        >
          <FloatingLabelField
            label="Jenis"
            :for="typeFieldId"
            floating
          >
            <Select v-model="type">
              <SelectTrigger
                :id="typeFieldId"
                class="w-full"
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
          </FloatingLabelField>
          <FloatingLabelField
            v-if="teachers.length > 0"
            label="Penulis"
            :for="authorFieldId"
            floating
          >
            <Select v-model="authorId">
              <SelectTrigger
                :id="authorFieldId"
                class="w-full"
              >
                <SelectValue placeholder="Saya sendiri" />
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
          </FloatingLabelField>
        </div>

        <template v-if="!canEdit && detail">
          <div
            class="rounded-md border bg-muted/30 p-3 text-[length:var(--text-control,0.75rem)]"
            role="status"
          >
            Paket ini tidak bisa diubah. Anda hanya bisa melihat soalnya.
          </div>
          <QuestionPreview
            :type="detail.type"
            :body-html="detail.current.bodyHtml"
            :content="detail.current.content"
            :points="detail.current.points"
          />
          <AnswerKey
            :type="detail.type"
            :content="detail.current.content"
          />
        </template>
        <QuestionEditor
          v-else-if="canEdit"
          v-model="draft"
          :type="type"
        />

        <p
          v-if="formError"
          class="text-[length:var(--text-control,0.75rem)] text-destructive"
          role="alert"
        >
          {{ formError }}
        </p>
      </CardContent>

      <CardFooter
        v-if="!loading && canEdit"
        standard
        class="justify-end"
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
  </div>
</template>
