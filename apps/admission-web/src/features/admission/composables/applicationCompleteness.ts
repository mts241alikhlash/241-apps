import {
  achievementsSchemaFor,
  addressSchema,
  parentsSchemaFor,
  personalSchema,
  schoolSchema,
} from '../schemas/applicationFormSchemas'
import type { DocumentRequirement } from '../types'
import type {
  AchievementForm,
  AddressForm,
  ParentForm,
  PersonalForm,
  SchoolForm,
  ScholarshipForm,
} from './useApplicationFormState'

interface Named {
  id: string
  name: string
}

export interface CompletenessInput {
  personal: PersonalForm
  parents: ParentForm[]
  address: AddressForm
  school: SchoolForm
  achievements: AchievementForm[]
  scholarships: ScholarshipForm[]
  lifeStatuses: Named[]
  scholarshipCategories: Named[]
  documentTypes: (Named & { requirement: DocumentRequirement })[]
  documents: { documentTypeId: string; status: string }[]
}

const RELATION_NAMES: Record<string, string> = {
  FATHER: 'ayah',
  MOTHER: 'ibu',
  GUARDIAN: 'wali',
}

export interface CompletenessItem {
  step: number
  label: string
  done: boolean
  detail?: string
}

export function applicationCompleteness(
  input: CompletenessInput,
): CompletenessItem[] {
  const ok = (
    schema: { safeParse: (value: unknown) => { success: boolean } },
    value: unknown,
  ) => schema.safeParse(value).success

  const documentGaps = input.documentTypes
    .filter((type) => type.requirement === 'REQUIRED')
    .flatMap((type) => {
      const document = input.documents.find(
        (item) => item.documentTypeId === type.id,
      )
      if (!document) return [type.name]
      if (document.status === 'REJECTED') {
        return [`${type.name} (ditolak, unggah ulang)`]
      }
      return []
    })

  const sharedNik = input.personal.nik
    ? input.parents.find((parent) => parent.nik === input.personal.nik)
    : undefined

  return [
    { step: 0, label: 'Data Diri', done: ok(personalSchema, input.personal) },
    {
      step: 1,
      label: 'Orang Tua/Wali',
      done:
        !sharedNik &&
        ok(parentsSchemaFor(input.lifeStatuses), {
          parents: input.parents,
        }),
      ...(sharedNik && {
        detail: `NIK ${RELATION_NAMES[sharedNik.relation]} sama dengan NIK santri`,
      }),
    },
    {
      step: 2,
      label: 'Alamat',
      done:
        ok(addressSchema, input.address) &&
        ok(parentsSchemaFor(input.lifeStatuses, 'addresses'), {
          parents: input.parents,
        }),
    },
    { step: 3, label: 'Sekolah Asal', done: ok(schoolSchema, input.school) },
    {
      step: 4,
      label: 'Prestasi & Beasiswa',
      done: ok(achievementsSchemaFor(input.scholarshipCategories), {
        achievements: input.achievements,
        scholarships: input.scholarships,
      }),
    },
    {
      step: 5,
      label: 'Berkas',
      done: documentGaps.length === 0,
      ...(documentGaps.length > 0 && { detail: documentGaps.join(', ') }),
    },
  ]
}
