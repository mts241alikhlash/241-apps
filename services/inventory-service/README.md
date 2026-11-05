# inventory-service

## Purpose

Owns assets and their units, categories, locations, conditions, statuses, funding sources, loans and circulation history, and approval workflows.

Port 3300 locally; database `inventory` (15 models: `InventoryAsset`, `InventoryAssetUnit`, `InventoryCategory`, `InventoryLocation`, `InventoryCondition`, `InventoryStatus`, `InventoryFundingSource`, `InventoryHistory`, `InventoryTransactionType`, `InventoryLoan`, `InventoryLoanItem`, `ApprovalWorkflow`, `ApprovalStep`, `ApprovalInstance`, `ApprovalLog`). The terms are in the [glossary](../../GLOSSARY.md).

## Depends on

- Packages: `@mts241alikhlash/nest-core` (shared infrastructure).
- Other services (HTTP, through ports and adapters in `src/platform/` or `integration/`): none; and always identity, for token introspection and permissions.
- PostgreSQL (its own database) and, where uploads exist, the S3 bucket.

## Rules specific to this package

- `ProcessApprovalUseCase` must not compare role names (the second `SUPER_ADMIN` check once lived there); `single-role-bypass.spec.ts` guards it.
- Reference lists live under `reference-data/` with their own permission codes.

## Gotchas

- Approvals resolve approvers by role code configured on the workflow step, not by hard-coded names.

## Open work

- None recorded.
