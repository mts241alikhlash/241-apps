# infra

## 0.2.0

### Minor Changes

- 8a2f799: Configure the Docker network subnet, the PostgreSQL listener and the firewall from provision.sh, so provisioning no longer needs hand-written pg_hba and ufw rules.

### Patch Changes

- e1d623a: Let the backup shell create each dump file, since pg_dump runs as postgres and the backup tree is root-only.

## 0.1.2

### Patch Changes

- 6f4b325: Connect bootstrap.sh to PostgreSQL over the loopback of the deploy host, since DATABASE_URL carries the address the containers use.

## 0.1.1

### Patch Changes

- 9f616e3: Install a daily database backup timer with provision.sh.
- e0202eb: Write the host nginx site for every app host from provision.sh.
- 08004d2: Add a rehearsal teardown that removes its own images.
- b09cfa9: Create the rehearsal network when it is missing before rendering the gateway config.
- a1c2adc: Add the script that removes the old polyrepo stack from the server.
- e8f3c44: Add a restore script for the old inventory data.
- 63ffb1e: Serve build files under /_app so app routes under /assets work.
