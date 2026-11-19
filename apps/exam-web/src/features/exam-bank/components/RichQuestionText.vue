<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { toast } from 'vue-sonner'
import {
  Bold,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Sigma,
  Subscript,
  Superscript,
  Underline,
} from '@lucide/vue'
import { TooltipButton } from '@mts241alikhlash/ui'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { examBankApi } from '../api/examBankApi'
import MathDialog from './MathDialog.vue'
import { buildExtensions } from './tiptap/extensions'
import type { MathEdit } from './tiptap/mathInline'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const props = withDefaults(
  defineProps<{
    label: string
    compact?: boolean
    singleLine?: boolean
    allowImages?: boolean
  }>(),
  { compact: false, singleLine: false, allowImages: true },
)
const model = defineModel<string>({ required: true })

const mathOpen = ref(false)
const mathInitial = ref('')
const editingAt = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

function openMath(edit?: MathEdit) {
  mathInitial.value = edit?.latex ?? ''
  editingAt.value = edit?.pos ?? null
  mathOpen.value = true
}

const editor = useEditor({
  content: model.value,
  extensions: buildExtensions(openMath),
  editorProps: {
    attributes: {
      class: `${props.compact ? 'min-h-8 py-[1px]' : 'min-h-28 py-2'} px-2 text-control focus:outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5`,
      'aria-label': props.label,
      dir: 'auto',
    },
    handleKeyDown: (_view, event) => {
      if (props.singleLine && event.key === 'Enter') return true
      return false
    },
  },
  onUpdate: ({ editor: instance }) => {
    model.value = instance.getHTML()
  },
})

watch(model, (value) => {
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value, { emitUpdate: false })
  }
})

onBeforeUnmount(() => editor.value?.destroy())

function insertMath(latex: string) {
  const chain = editor.value?.chain().focus()
  if (!chain) return
  if (editingAt.value !== null) {
    chain
      .setNodeSelection(editingAt.value)
      .updateAttributes('mathInline', { latex })
      .run()
  } else {
    chain.insertContent({ type: 'mathInline', attrs: { latex } }).run()
  }
  editingAt.value = null
}

async function uploadImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) {
    toast.error('Gambar harus JPG, PNG, atau WebP.')
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast.error('Ukuran gambar maksimal 2 MB.')
    return
  }
  uploading.value = true
  try {
    const response = await examBankApi.uploadImage(file)
    const id = response?.id
    if (id) {
      editor.value
        ?.chain()
        .focus()
        .insertContent({ type: 'examImage', attrs: { fileId: id } })
        .run()
    }
  } catch (err: unknown) {
    toast.error(getIndonesianErrorMessage(err, 'Gagal mengunggah gambar.'))
  } finally {
    uploading.value = false
  }
}

function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) void uploadImage(file)
}

defineExpose({ insertMath, uploadImage, openMath })
</script>

<template>
  <div class="group rounded-md border">
    <div
      v-if="editor"
      class="flex-wrap items-center gap-1 border-b bg-muted/30 p-1"
      :class="compact ? 'hidden group-focus-within:flex' : 'flex'"
    >
      <TooltipButton
        label="Tebal"
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <Bold />
      </TooltipButton>
      <TooltipButton
        label="Miring"
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <Italic />
      </TooltipButton>
      <TooltipButton
        label="Garis bawah"
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('underline') }"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <Underline />
      </TooltipButton>
      <TooltipButton
        label="Pangkat (superskrip)"
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('superscript') }"
        @click="editor.chain().focus().toggleSuperscript().run()"
      >
        <Superscript />
      </TooltipButton>
      <TooltipButton
        label="Indeks (subskrip)"
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('subscript') }"
        @click="editor.chain().focus().toggleSubscript().run()"
      >
        <Subscript />
      </TooltipButton>
      <TooltipButton
        label="Daftar poin"
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <List />
      </TooltipButton>
      <TooltipButton
        label="Daftar bernomor"
        type="button"
        variant="ghost"
        size="icon"
        :class="{ 'bg-accent': editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered />
      </TooltipButton>
      <TooltipButton
        label="Sisipkan rumus"
        type="button"
        variant="ghost"
        size="icon"
        @click="openMath()"
      >
        <Sigma />
      </TooltipButton>
      <TooltipButton
        v-if="allowImages"
        label="Sisipkan gambar"
        type="button"
        variant="ghost"
        size="icon"
        :disabled="uploading"
        @click="fileInput?.click()"
      >
        <ImagePlus />
      </TooltipButton>
      <input
        ref="fileInput"
        type="file"
        class="sr-only"
        accept="image/jpeg,image/png,image/webp"
        tabindex="-1"
        aria-hidden="true"
        @change="onFileChosen"
      />
    </div>
    <EditorContent :editor="editor" />
    <MathDialog
      v-model:open="mathOpen"
      :initial="mathInitial"
      :editing="editingAt !== null"
      @confirm="insertMath"
    />
  </div>
</template>
