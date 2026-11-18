import { nextTick, ref } from 'vue'

export const ALL_SCOPES = 'all'

export type PrintScopeGroup = 'room' | 'class' | 'grade'

export interface PrintScopeOption {
  key: string
  label: string
  group: PrintScopeGroup
}

const PRINT_FONTS = ['Tusker Grotesk', 'Ruberoid', 'Trajan Pro', 'Inter']

const scope = ref(ALL_SCOPES)

async function waitForFonts() {
  if (!('fonts' in document)) return
  await Promise.all(
    PRINT_FONTS.map((font) =>
      document.fonts.load(`600 1em "${font}"`).catch(() => undefined),
    ),
  )
  await document.fonts.ready
}

export function usePrintScope() {
  async function printWith(selected: string = ALL_SCOPES) {
    scope.value = selected
    await nextTick()
    await waitForFonts()
    document.body.classList.add('printing-stack')
    window.print()
    document.body.classList.remove('printing-stack')
    scope.value = ALL_SCOPES
  }

  return { scope, printWith }
}
