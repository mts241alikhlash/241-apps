# Back up and restore

What is backed up: each service's PostgreSQL database (`identity`, `academic`, `admission`, `assessment`, `exam`, `hr`, `inventory`, `portal`, `presence`, `student`) and the files in the S3 bucket `241-apps`. Everything else (images, code, lock) is rebuilt from the repository and the registry.

How often, where the dumps go and for how long are server settings kept in `AGENTS.local.md`, not here. A backup that exists only on the machine it protects is not a backup: copy the dumps to another machine regularly.

## Back up one database

```
pg_dump --format=custom --file=<service>.dump "<connection url of the database>"
```

Result: the file exists and `pg_restore --list <service>.dump | head` prints its table of contents.

## Back up files

Copy the bucket with any S3 client (`aws s3 sync s3://241-apps ./files-backup --endpoint-url <storage endpoint>`).

Result: the local folder holds the same number of objects as the bucket.

## Restore a database

1. Stop the service that owns it (so nothing writes during the restore).
   Result: its container is not running.
2. Create an empty database with the same name and owner, then restore:
   `pg_restore --no-owner --role=<db role> --dbname="<connection url>" <service>.dump`.
   Result: the command exits 0 and `\dt` shows the service's tables.
3. Run the service's migration job (`<service>-service-migrate` in `infra/compose/compose.yaml`) to apply any migration newer than the dump, then start the service.
   Result: `/health/<service>` answers and a page that reads the data loads.

## Restore files

`aws s3 sync ./files-backup s3://241-apps --endpoint-url <storage endpoint>`.

Result: a file referenced by a record opens in the app.

## Practice

Restore the latest dump into a scratch database on your machine (`createdb scratch && pg_restore --dbname=scratch <service>.dump`) at least once; a backup you have never restored is unproven.
