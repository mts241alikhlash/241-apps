# Provision the server

`infra/scripts/provision.sh` does the one-time, root-only setup of the server. It is idempotent: running it again changes nothing that is already in place and never overwrites an existing service env file.

## Before you start

- A server with Docker (with Compose), native PostgreSQL 16 and MinIO, plus `git`, `curl`, `openssl`, `python3` and the MinIO client `mc` on the PATH of root.
- PostgreSQL accepts connections from the Docker network on the address you will give the script, and MinIO answers on the URL you will give it.
- The public key of the deploy workflow's SSH key pair (the private key goes into the `vps` Environment, see [cutover](cutover.md)).

## 1. Dry run

```
sudo infra/scripts/provision.sh --dry-run
```

It prints every action and every prompt without changing anything or asking for secrets.

Result: the output lists the user, the Docker network, the PostgreSQL role, the MinIO access key, the checkout, the override, ten env files and the authorized key.

## 2. Run it

```
sudo infra/scripts/provision.sh
```

It prompts for the PostgreSQL password of the role `mts241`, the MinIO root credentials and URL, the PostgreSQL host the containers use, the first admin password (12 characters or more) and the deploy public key. Secrets are read without echo and written only to files with mode 600; none is ever passed as a command-line argument (PostgreSQL gets its SQL on stdin, MinIO prints the generated access key, the env files are written by `infra/scripts/provision-env.py` from environment variables).

## 3. Check each result

| Step            | Check                                                                                  | Expected                                               |
| --------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| deploy user     | `id deploy`                                                                            | belongs to group `docker`                              |
| network         | `docker network inspect 241-apps`                                                      | exists                                                 |
| PostgreSQL role | `sudo -u postgres psql -Atc "select rolcreatedb from pg_roles where rolname='mts241'"` | `t`                                                    |
| MinIO           | `mc admin accesskey list <alias>`                                                      | an access key whose policy only allows `241-apps`      |
| checkout        | `git -C /srv/241-apps sparse-checkout list`                                            | `/infra/` and `/services/*/.env.example`               |
| override        | `grep 8082 /srv/241-apps/infra/compose/compose.override.yaml`                          | the gateway port line                                  |
| env files       | `ls -l /srv/241-apps/infra/compose/env`                                                | ten `*-service.env` files, mode 600, owned by `deploy` |
| forced command  | `sudo grep deploy-entry /home/deploy/.ssh/authorized_keys`                             | one line starting with `restrict,command=`             |

The script also lists any env file that still holds example values (public host names, `FRONTEND_URL`, `SSO_APPS`, `SSO_ACCOUNTS_ORIGIN` and similar): edit those by hand before the first deploy.

## What provisioning does not do

It does not create the databases or the bucket: `deploy.sh` runs `infra/scripts/bootstrap.sh` on every deploy, which creates each missing database as `mts241` and the bucket `241-apps`. It does not touch the host nginx, the firewall, the certificates or the owner's other sites.
