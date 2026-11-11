# 0009: Exam category derives from type on the server

## Context

`exam-service`, `exam-web`, and `exam-android` previously held different exam type lists and each client decided on its own which types counted as formal exams versus daily classwork. Makeup schedules (`kind = MAKEUP`) were also misclassified when clients grouped by schedule kind or hardcoded type subsets instead of the parent exam's type.

## Decision

`ExamType` has four values: `DAILY`, `ASSIGNMENT`, `MIDTERM`, and `FINAL`. `ExamCategory` (`EXAM` or `NON_EXAM`) is derived solely from `ExamType` in one pure function (`categoryOf`) in `exam-service`: `MIDTERM` and `FINAL` map to `EXAM`; `DAILY` and `ASSIGNMENT` map to `NON_EXAM`.

`category` is never stored as a database column. Instead, `exam-service` computes and emits `category` on every DTO that carries `type` (activities, schedules, events, rooms, grading, and `/me/exams`) and accepts `category` as a query filter on list endpoints. Makeup schedules copy `type` from their parent schedule on creation so their derived `category` always matches the parent. Web and Android clients read `category` from the API contract and never recompute it from `kind` or local type lists.

## Consequences

- Adding or reclassifying an `ExamType` happens in `exam-service` and propagates to `exam-web` and `exam-android` through the generated OpenAPI contract.
- Database tables store only `type`, avoiding denormalized `category` columns that could drift.
- Both `exam-web` and `exam-android` split Exam (`EXAM`) and Classwork (`NON_EXAM`) views using the server-provided `category`.
