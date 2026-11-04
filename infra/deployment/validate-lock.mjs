import { loadInputs } from '../gateway/generate.mjs'

await loadInputs({ requirePinnedImages: true })
console.log('deployment lock valid')
