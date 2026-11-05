# Roll back

Rolling back runs older images against the current database.

## When it is safe

Only back to a release whose code still works with every migration applied since. After a release whose migrations drop or rename a column or table, roll forward with a fix instead. Check the migrations between the target tag and `main`: `git log --oneline <tag>..main -- 'services/*/prisma/migrations'`.

Result: the range lists no migration that drops or renames something the older code reads, or you decide to roll forward.

## Steps

1. Find the tag to return to: `git tag --list 'deploy-*' --sort=-creatordate | head`.
   Result: the newest tags print with their dates.
2. In the Actions tab run `Deploy`, `ref` set to that tag, and let the owner approve it.
   Result: the run goes through the same checks as a deploy and ends with `==> deployed <sha>`.
3. The rollback pulls the pinned digests from the registry again, so nothing needs to be kept on the server. A failed deploy prunes nothing.
   Result: `/health/<service>` answers for every service.
4. Open a follow-up change that fixes the problem on `main`; the lock still points at the bad release until it is updated.
   Result: the next `Update the lock` pull request carries the fix.
