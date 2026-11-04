import { computed, ref } from 'vue'
import type {
  AdmissionApplication,
  ParentRelation,
  UpdateMyApplicationDto,
} from '../types'
import {
  addressOwnerOf,
  isGone,
  isKipScholarship,
  normalizePhone,
} from '../schemas/applicationFormSchemas'
import { useFormOptions } from './useFormOptions'

export interface PersonalForm {
  fullName: string
  nickname: string
  gender: string
  birthPlace: string
  birthDate: string
  nik: string
  nisn: string
  phone: string
  hobby: string
  aspiration: string
  financingSourceId: string
  disabilityTypeId: string
  specialNeedId: string
  religionId: string
  childOrder: string
  siblingCount: string
}

export interface RegionCodesForm {
  provinceCode: string
  regencyCode: string
  districtCode: string
  villageCode: string
}

export interface ParentForm extends RegionCodesForm {
  relation: ParentRelation
  name: string
  nik: string
  birthPlace: string
  birthDate: string
  phone: string
  occupationId: string
  educationId: string
  incomeRangeId: string
  lifeStatusId: string
  domicileId: string
  residenceId: string
  sameAddressAsStudent: boolean
  street: string
  rt: string
  rw: string
  postalCode: string
  isPrimary: boolean
}

export interface AddressForm extends RegionCodesForm {
  street: string
  rt: string
  rw: string
  postalCode: string
  studentResidenceId: string
  travelDistanceId: string
  travelTimeId: string
  transportationId: string
}

export interface SchoolForm {
  previousSchoolName: string
  previousSchoolNpsn: string
  previousSchoolAddress: string
  graduationYear: string
}

export interface AchievementForm {
  year: string
  competitionName: string
  competitionFieldId: string
  organizer: string
  competitionLevelId: string
  rank: string
  fileId: string
  fileName: string
}

export interface ScholarshipForm {
  year: string
  categoryId: string
  scholarshipName: string
  providerName: string
  providerTypeId: string
  duration: string
  kipNumber: string
  amount: string
  fileId: string
  fileName: string
}

export interface PaymentForm {
  bankAccountId: string
  bankName: string
  senderAccountName: string
  transferDate: string
}

export function blankParent(
  relation: ParentRelation,
  isPrimary = false,
): ParentForm {
  return {
    relation,
    name: '',
    nik: '',
    birthPlace: '',
    birthDate: '',
    phone: '',
    occupationId: '',
    educationId: '',
    incomeRangeId: '',
    lifeStatusId: '',
    domicileId: '',
    residenceId: '',
    sameAddressAsStudent: true,
    street: '',
    rt: '',
    rw: '',
    postalCode: '',
    provinceCode: '',
    regencyCode: '',
    districtCode: '',
    villageCode: '',
    isPrimary,
  }
}

export function blankAchievement(): AchievementForm {
  return {
    year: '',
    competitionName: '',
    competitionFieldId: '',
    organizer: '',
    competitionLevelId: '',
    rank: '',
    fileId: '',
    fileName: '',
  }
}

export function blankScholarship(): ScholarshipForm {
  return {
    year: '',
    categoryId: '',
    scholarshipName: '',
    providerName: '',
    providerTypeId: '',
    duration: '',
    kipNumber: '',
    amount: '',
    fileId: '',
    fileName: '',
  }
}

const RELATION_ORDER: ParentRelation[] = ['FATHER', 'MOTHER', 'GUARDIAN']

type SavedParent = NonNullable<AdmissionApplication['parents']>[number]

function parentFromSaved(p: SavedParent): ParentForm {
  return {
    relation: p.relation,
    name: p.name,
    nik: p.nik ?? '',
    birthPlace: p.birthPlace ?? '',
    birthDate: p.birthDate ? p.birthDate.slice(0, 10) : '',
    phone: p.phone ?? '',
    occupationId: p.occupationId ?? '',
    educationId: p.educationId ?? '',
    incomeRangeId: p.incomeRangeId ?? '',
    lifeStatusId: p.lifeStatusId ?? '',
    domicileId: p.domicileId ?? '',
    residenceId: p.residenceId ?? '',
    sameAddressAsStudent: p.sameAddressAsStudent,
    street: p.street ?? '',
    rt: p.rt ?? '',
    rw: p.rw ?? '',
    postalCode: p.postalCode ?? '',
    provinceCode: p.provinceCode ?? '',
    regencyCode: p.regencyCode ?? '',
    districtCode: p.districtCode ?? '',
    villageCode: p.villageCode ?? '',
    isPrimary: p.isPrimary,
  }
}

export function useApplicationFormState() {
  const personal = ref<PersonalForm>({
    fullName: '',
    nickname: '',
    gender: '',
    birthPlace: '',
    birthDate: '',
    nik: '',
    nisn: '',
    phone: '',
    hobby: '',
    aspiration: '',
    financingSourceId: '',
    disabilityTypeId: '',
    specialNeedId: '',
    religionId: '',
    childOrder: '',
    siblingCount: '',
  })

  const { listOf } = useFormOptions()
  const parents = ref<ParentForm[]>([])

  const address = ref<AddressForm>({
    street: '',
    rt: '',
    rw: '',
    postalCode: '',
    provinceCode: '',
    regencyCode: '',
    districtCode: '',
    villageCode: '',
    studentResidenceId: '',
    travelDistanceId: '',
    travelTimeId: '',
    transportationId: '',
  })

  const school = ref<SchoolForm>({
    previousSchoolName: '',
    previousSchoolNpsn: '',
    previousSchoolAddress: '',
    graduationYear: '',
  })

  const achievements = ref<AchievementForm[]>([])
  const scholarships = ref<ScholarshipForm[]>([])

  const payment = ref<PaymentForm>({
    bankAccountId: '',
    bankName: '',
    senderAccountName: '',
    transferDate: '',
  })

  function hydrate(app: AdmissionApplication) {
    personal.value = {
      fullName: app.fullName ?? '',
      nickname: app.nickname ?? '',
      gender: app.gender ?? '',
      birthPlace: app.birthPlace ?? '',
      birthDate: app.birthDate ? app.birthDate.slice(0, 10) : '',
      nik: app.nik ?? '',
      nisn: app.nisn ?? '',
      phone: app.phone ?? '',
      hobby: app.hobby ?? '',
      aspiration: app.aspiration ?? '',
      financingSourceId: app.financingSourceId ?? '',
      disabilityTypeId: app.disabilityTypeId ?? '',
      specialNeedId: app.specialNeedId ?? '',
      religionId: app.religionId ?? '',
      childOrder: app.childOrder == null ? '' : String(app.childOrder),
      siblingCount: app.siblingCount == null ? '' : String(app.siblingCount),
    }

    const saved = (app.parents ?? []).map(parentFromSaved)
    const fresh = saved.length === 0
    const withDefaults = [
      saved.find((p) => p.relation === 'FATHER') ??
        blankParent('FATHER', fresh),
      saved.find((p) => p.relation === 'MOTHER') ?? blankParent('MOTHER'),
      ...saved.filter((p) => p.relation === 'GUARDIAN'),
    ]
    parents.value = withDefaults.sort(
      (a, b) =>
        RELATION_ORDER.indexOf(a.relation) - RELATION_ORDER.indexOf(b.relation),
    )
    if (!parents.value.some((p) => p.isPrimary)) {
      setGuardian(
        parents.value.some((p) => p.relation === 'GUARDIAN')
          ? 'GUARDIAN'
          : 'FATHER',
      )
    }

    address.value = {
      street: app.street ?? '',
      rt: app.rt ?? '',
      rw: app.rw ?? '',
      postalCode: app.postalCode ?? '',
      provinceCode: app.provinceCode ?? '',
      regencyCode: app.regencyCode ?? '',
      districtCode: app.districtCode ?? '',
      villageCode: app.villageCode ?? '',
      studentResidenceId: app.studentResidenceId ?? '',
      travelDistanceId: app.travelDistanceId ?? '',
      travelTimeId: app.travelTimeId ?? '',
      transportationId: app.transportationId ?? '',
    }
    school.value = {
      previousSchoolName: app.previousSchoolName ?? '',
      previousSchoolNpsn: app.previousSchoolNpsn ?? '',
      previousSchoolAddress: app.previousSchoolAddress ?? '',
      graduationYear: app.graduationYear ? String(app.graduationYear) : '',
    }
    achievements.value = (app.achievements ?? []).map((a) => ({
      year: String(a.year),
      competitionName: a.competitionName,
      competitionFieldId: a.competitionFieldId ?? '',
      organizer: a.organizer ?? '',
      competitionLevelId: a.competitionLevelId ?? '',
      rank: a.rank ?? '',
      fileId: a.fileId ?? '',
      fileName: a.file?.originalName ?? '',
    }))
    scholarships.value = (app.scholarships ?? []).map((s) => ({
      year: String(s.year),
      categoryId: s.categoryId ?? '',
      scholarshipName: s.scholarshipName,
      providerName: s.providerName ?? '',
      providerTypeId: s.providerTypeId ?? '',
      duration: s.duration ?? '',
      kipNumber: s.kipNumber ?? '',
      amount: s.amount == null ? '' : String(s.amount),
      fileId: s.fileId ?? '',
      fileName: s.file?.originalName ?? '',
    }))
    if (app.payment) {
      payment.value = {
        bankAccountId: app.payment.bankAccountId ?? '',
        bankName: app.payment.bankName ?? '',
        senderAccountName: app.payment.senderAccountName ?? '',
        transferDate: app.payment.transferDate
          ? app.payment.transferDate.slice(0, 10)
          : '',
      }
    }
  }

  const guardianRelation = computed<ParentRelation>(
    () => parents.value.find((p) => p.isPrimary)?.relation ?? 'FATHER',
  )

  function setGuardian(relation: ParentRelation) {
    const kept = parents.value.filter(
      (p) => p.relation !== 'GUARDIAN' || relation === 'GUARDIAN',
    )
    if (
      relation === 'GUARDIAN' &&
      !kept.some((p) => p.relation === 'GUARDIAN')
    ) {
      kept.push(blankParent('GUARDIAN'))
    }
    parents.value = kept.map((p) => ({
      ...p,
      isPrimary: p.relation === relation,
    }))
  }

  function parentsPayload() {
    const statuses = listOf('parentLifeStatuses')
    const owner = addressOwnerOf(parents.value, statuses)
    return parents.value
      .filter(
        (p) => p.name.trim() || (p.relation !== 'GUARDIAN' && p.lifeStatusId),
      )
      .map((p) => {
        const living = !isGone(statuses, p.lifeStatusId)
        const sameAddressAsStudent =
          p.relation === owner || p.sameAddressAsStudent
        return {
          relation: p.relation,
          name: p.name.trim(),
          nik: p.nik || undefined,
          birthPlace: p.birthPlace || undefined,
          birthDate: p.birthDate || undefined,
          phone: living && p.phone ? normalizePhone(p.phone) : undefined,
          occupationId: p.occupationId || undefined,
          educationId: p.educationId || undefined,
          incomeRangeId: (living && p.incomeRangeId) || undefined,
          lifeStatusId: p.lifeStatusId || undefined,
          domicileId: (living && p.domicileId) || undefined,
          residenceId: (living && p.residenceId) || undefined,
          sameAddressAsStudent,
          ...(!sameAddressAsStudent && {
            street: p.street || undefined,
            rt: p.rt || undefined,
            rw: p.rw || undefined,
            postalCode: p.postalCode || undefined,
            provinceCode: p.provinceCode,
            regencyCode: p.regencyCode,
            districtCode: p.districtCode,
            villageCode: p.villageCode,
          }),
          isPrimary: p.isPrimary,
        }
      })
  }

  function addAchievement() {
    achievements.value.push(blankAchievement())
  }

  function removeAchievement(index: number) {
    achievements.value.splice(index, 1)
  }

  function addScholarship() {
    scholarships.value.push(blankScholarship())
  }

  function removeScholarship(index: number) {
    scholarships.value.splice(index, 1)
  }

  function buildStepPayload(step: number): UpdateMyApplicationDto | null {
    if (step === 0) {
      const p = personal.value
      return {
        fullName: p.fullName || undefined,
        nickname: p.nickname || undefined,
        gender: (p.gender || undefined) as UpdateMyApplicationDto['gender'],
        birthPlace: p.birthPlace || undefined,
        birthDate: p.birthDate || undefined,
        nik: p.nik || undefined,
        nisn: p.nisn || undefined,
        phone: p.phone ? normalizePhone(p.phone) : undefined,
        hobby: p.hobby || undefined,
        aspiration: p.aspiration || undefined,
        financingSourceId: p.financingSourceId || undefined,
        disabilityTypeId: p.disabilityTypeId || undefined,
        specialNeedId: p.specialNeedId || undefined,
        religionId: p.religionId || undefined,
        childOrder: p.childOrder ? Number(p.childOrder) : undefined,
        siblingCount: p.siblingCount ? Number(p.siblingCount) : undefined,
      }
    }
    if (step === 1) {
      return { parents: parentsPayload() }
    }
    if (step === 2) {
      const a = address.value
      const named = parentsPayload()
      return {
        ...(named.length > 0 && { parents: named }),
        street: a.street || undefined,
        rt: a.rt || undefined,
        rw: a.rw || undefined,
        postalCode: a.postalCode || undefined,
        provinceCode: a.provinceCode,
        regencyCode: a.regencyCode,
        districtCode: a.districtCode,
        villageCode: a.villageCode,
        studentResidenceId: a.studentResidenceId || undefined,
        travelDistanceId: a.travelDistanceId || undefined,
        travelTimeId: a.travelTimeId || undefined,
        transportationId: a.transportationId || undefined,
      }
    }
    if (step === 3) {
      return {
        previousSchoolName: school.value.previousSchoolName || undefined,
        previousSchoolNpsn: school.value.previousSchoolNpsn || undefined,
        previousSchoolAddress: school.value.previousSchoolAddress || undefined,
        graduationYear: school.value.graduationYear
          ? Number(school.value.graduationYear)
          : undefined,
      }
    }
    if (step === 4) {
      return {
        achievements: achievements.value
          .filter((a) => a.competitionName.trim())
          .map((a) => ({
            year: Number(a.year),
            competitionName: a.competitionName.trim(),
            competitionFieldId: a.competitionFieldId,
            organizer: a.organizer || undefined,
            competitionLevelId: a.competitionLevelId,
            rank: a.rank,
            fileId: a.fileId || undefined,
          })),
        scholarships: scholarships.value
          .filter((s) => s.scholarshipName.trim())
          .map((s) => ({
            year: Number(s.year),
            categoryId: s.categoryId,
            scholarshipName: s.scholarshipName.trim(),
            providerName: s.providerName,
            providerTypeId: s.providerTypeId,
            duration: s.duration || undefined,
            kipNumber:
              isKipScholarship(listOf('scholarshipCategories'), s.categoryId) &&
              s.kipNumber
                ? s.kipNumber
                : undefined,
            amount: s.amount ? Number(s.amount) : undefined,
            fileId: s.fileId || undefined,
          })),
      }
    }
    return null
  }

  return {
    personal,
    parents,
    address,
    school,
    achievements,
    scholarships,
    payment,
    hydrate,
    guardianRelation,
    setGuardian,
    addAchievement,
    removeAchievement,
    addScholarship,
    removeScholarship,
    buildStepPayload,
  }
}
