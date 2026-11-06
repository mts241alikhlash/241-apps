# Provision the server

`infra/scripts/provision.sh` does the one-time, root-only setup of the server. It is idempotent: running it again changes nothing that is already in place and never overwrites an existing service env file.

## Before you start

- A server with Docker (with Compose), native PostgreSQL 16 and MinIO, plus `git`, `curl`, `openssl` and `python3` on the PATH of root.
- A MinIO access key limited to the bucket `241-apps` (next section).
- PostgreSQL accepts connections from the Docker network on the address you will give the script, and MinIO answers on the URL you will give it.
- The public key of the deploy workflow's SSH key pair (the private key goes into the `production` Environment, see [cutover](cutover.md)).

## 1. Create the MinIO access key

The script needs no MinIO client: you create the key once in the MinIO Console.

1. Policies, Create Policy, name `241-apps-bucket`, JSON allowing `s3:*` only on the bucket and its objects:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::241-apps", "arn:aws:s3:::241-apps/*"]
    }
  ]
}
```

2. Identity, Users: create a user (for example `app-241`) and assign the policy; under that user create an access key, and copy the access key id and the secret key.

Result: with that key, listing the bucket works (`curl --aws-sigv4 "aws:amz:us-east-1:s3" --user <id>:<secret> <MinIO URL>/241-apps`, run on a trusted machine, answers `200`) and listing another bucket answers `403`.

## 2. Dry run

```
sudo infra/scripts/provision.sh --dry-run
```

It prints every action and every prompt without changing anything or asking for secrets.

Result: the output lists the user, the Docker network, the PostgreSQL role, the MinIO access key prompt, the checkout, the override, ten env files and the authorized key, plus the server step (network subnet and bridge name, `listen_addresses`, `pg_hba.conf` and the firewall rules).

## 3. Run it

```
sudo infra/scripts/provision.sh
```

It prompts for the PostgreSQL password of the role `mts241`, the MinIO URL, the access key id and the secret key (from step 1), the PostgreSQL host the containers use, the first admin password (12 characters or more), the Google OAuth client id and secret (identity refuses to start with placeholder values), and the deploy public key. Secrets are read without echo and written only to files with mode 600; none is ever passed as a command-line argument (PostgreSQL gets its SQL on stdin, MinIO prints the generated access key, the env files are written by `infra/scripts/provision-env.py` from environment variables).

Before the env files it configures the server itself (`infra/scripts/provision-server.sh`, which holds the network values): it creates the Docker network `241-apps` with that fixed subnet, gateway and bridge name (`br-241-apps`), refusing to continue when another network already uses the subnet; extends PostgreSQL's `listen_addresses` with the gateway address; appends one `pg_hba.conf` line (next to a timestamped copy) that lets the role reach the databases from the subnet; restarts PostgreSQL when either of the two changed; adds the two `ufw` rules that let the containers reach the gateway on 5432 and 9000; and fails when PostgreSQL does not listen on the gateway's 5432 afterwards. A second run changes nothing.

## 4. Check each result

| Step              | Check                                                                                  | Expected                                               |
| ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| deploy user       | `id deploy`                                                                            | belongs to group `docker`                              |
| network           | `docker network inspect 241-apps`                                                      | exists                                                 |
| network subnet    | `docker network inspect 241-apps --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'`  | the fixed subnet from `provision-server.sh`            |
| PostgreSQL listen | `sudo -u postgres psql -tAc 'show listen_addresses'`                                   | `localhost` plus the stack gateway (after the restart) |
| pg_hba            | `sudo grep mts241 /etc/postgresql/16/main/pg_hba.conf`                                 | one `host` line for the stack subnet                   |
| firewall          | `ufw status`                                                                           | two `241-apps` rules on `br-241-apps`                  |
| PostgreSQL role   | `sudo -u postgres psql -Atc "select rolcreatedb from pg_roles where rolname='mts241'"` | `t`                                                    |
| MinIO             | the key from step 1 lists `241-apps`                                                   | `200`; the env files carry that key                    |
| checkout          | `git -C /srv/241-apps sparse-checkout list`                                            | `/infra/` and `/services/*/.env.example`               |
| override          | `grep 8082 /srv/241-apps/infra/compose/compose.override.yaml`                          | the gateway port line                                  |
| env files         | `ls -l /srv/241-apps/infra/compose/env`                                                | ten `*-service.env` files, mode 600, owned by `deploy` |
| forced command    | `sudo grep deploy-entry /home/deploy/.ssh/authorized_keys`                             | one line starting with `restrict,command=`             |

The env files get the production host names from `infra/deployment/lock.json` (`FRONTEND_URL`, `SSO_APPS`, `SSO_ACCOUNTS_ORIGIN`, `S3_PUBLIC_ENDPOINT`, OAuth redirects), random secrets, and the access key. The script lists any env file that still holds example values; edit those by hand before the first deploy.

## What provisioning does not do

It does not create the databases or the bucket: `deploy.sh` runs `infra/scripts/bootstrap.sh` on every deploy, which creates each missing database as `mts241` and the bucket `241-apps`. That script connects to PostgreSQL over the loopback of the deploy host, so `pg_hba.conf` needs an entry only for the containers' subnet. It does write the host nginx site (`infra/scripts/provision-nginx.sh`): one file `/etc/nginx/sites-available/241-apps` with every app host name from `infra/deployment/lock.json` (including `exam`), proxying to the gateway on `127.0.0.1:8082`, with the Cloudflare origin certificate paths and the `cloudflare-only.conf` include read from the current `241apps-production` site. It links the site, runs `nginx -t`, then moves `241apps-production`, `241apps-exam` and the `241apps-production.bak-*` files out of `sites-enabled` into `/var/backups/241-apps/nginx-previous/`, runs `nginx -t` again and reloads nginx; if either test fails it removes the new site (and puts the moved files back), so the old configuration keeps serving. Other sites (`9router`, `pemuda-cirengit`, `000-default`, `storage`, `storage-console`, `default`, `241apps-media`) are not touched. It does not touch the certificates.
