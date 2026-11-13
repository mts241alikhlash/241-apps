interface SafeExamBrowserGlobal {
  version?: string
  security: {
    configKey: string
    updateKeys?: (callback: () => void) => void
  }
}

export interface SebProof { configKeyHash: string; pageUrl: string }

export class SebOutdatedError extends Error {
  constructor() {
    super('Safe Exam Browser is outdated')
    this.name = 'SebOutdatedError'
  }
}

const UPDATE_KEYS_TIMEOUT_MS = 2000

function sebGlobal(): SafeExamBrowserGlobal | undefined {
  return (window as Window & { SafeExamBrowser?: SafeExamBrowserGlobal })
    .SafeExamBrowser
}

export function isInSeb(): boolean {
  return sebGlobal() !== undefined
}

export function sebVersion(): string | null {
  return sebGlobal()?.version ?? null
}

function refreshKeys(
  security: SafeExamBrowserGlobal['security'],
): Promise<void> {
  if (typeof security.updateKeys !== 'function') return Promise.resolve()
  const updateKeys = security.updateKeys
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, UPDATE_KEYS_TIMEOUT_MS)
    updateKeys(() => {
      clearTimeout(timer)
      resolve()
    })
  })
}

export async function readSebProof(): Promise<SebProof | null> {
  const seb = sebGlobal()
  if (!seb) return null
  await refreshKeys(seb.security)
  const configKeyHash = seb.security.configKey
  if (!configKeyHash) throw new SebOutdatedError()
  const url = new URL(window.location.href)
  url.hash = ''
  return { configKeyHash, pageUrl: url.toString() }
}
