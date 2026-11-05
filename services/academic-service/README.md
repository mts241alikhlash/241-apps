# academic-service

## Purpose

Owns the academic structure: academic years and semesters, curriculum and subjects, grades and classrooms, the timetable, teaching assignments, and the reference lists the admission form uses.

Port 3200 locally; database `academic` (36 models: `AcademicSetting`, `AcademicYear`, `Semester`, `AcademicCalendar`, `AcademicCalendarClassroom`, `Curricula`, `AcademicCalendarType`, `SemesterType`, `Classroom`, `ClassroomSupervisor`, `ClassroomStructure`, `Grade`, `GradeAcademicYear`, `Occupation`, `Education`, `IncomeRange`, `FinancingSource`, `DisabilityType`, `SpecialNeed`, `StudentResidence`, `ParentResidence`, `Transportation`, `TravelDistance`, `TravelTime`, `ParentLifeStatus`, `Domicile`, `ScholarshipCategory`, `ScholarshipProviderType`, `CompetitionField`, `CompetitionLevel`, `Subject`, `CurriculumSubject`, `TimeSlotType`, `TimeSlot`, `TeachingAssignment`, `Schedule`). The terms are in the [glossary](../../GLOSSARY.md).

## Depends on

- Packages: `@mts241alikhlash/nest-core` (shared infrastructure).
- Other services (HTTP, through ports and adapters in `src/platform/` or `integration/`): `hr-service`, `student-service`; and always identity, for token introspection and permissions.
- PostgreSQL (its own database) and, where uploads exist, the S3 bucket.

## Rules specific to this package

- Reference lists live in the generic module `src/reference-data/simple-list/`, defined in `src/reference-data/lists.ts` (`SIMPLE_LISTS`); they are admin-managed data, not enums, and carry no EMIS codes.
- A time slot type carries how long its slots run.
- Reads employees from hr-service and students from student-service over HTTP.

## Gotchas

- `seed:reference-data` and `seed:timetable` need an active academic year first; `seed-timetable` refuses `NODE_ENV=production`.

## Open work

- Check the module list against the glossary when adding a bounded context.
