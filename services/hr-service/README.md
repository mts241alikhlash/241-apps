# hr-service

## Purpose

Owns employees, positions and categories, employment types, and payroll (salary components and assignments, payroll runs, payslips).

Port 3800 locally; database `hr` (10 models: `Employee`, `EmploymentType`, `SalaryComponent`, `SalaryAssignment`, `PayrollRun`, `Payslip`, `PayslipLine`, `PositionCategory`, `Position`, `EmployeePosition`). The terms are in the [glossary](../../GLOSSARY.md).

## Depends on

- Packages: `@mts241alikhlash/nest-core` (shared infrastructure).
- Other services (HTTP, through ports and adapters in `src/platform/` or `integration/`): `academic-service`, `presence-service`; and always identity, for token introspection and permissions.
- PostgreSQL (its own database) and, where uploads exist, the S3 bucket.

## Rules specific to this package

- Payroll reads monthly attendance from presence-service; it never re-implements the summary arithmetic.
- Employee records are the source for teachers; academic and assessment ask this service for employees by id.

## Gotchas

- `test/payroll-authorization.e2e-spec.ts` is the end-to-end spec for who may see payroll.

## Open work

- None recorded.
