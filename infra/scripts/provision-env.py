import json
import os
import re
import sys
from urllib.parse import quote

source, target, service, ports_json = sys.argv[1:5]
ports = json.loads(ports_json)
env = os.environ
url = "postgresql://{}:{}@{}:5432/{}?sslmode=disable".format(
    env["PROV_DB_USER"],
    quote(env["PROV_DB_PASSWORD"], safe=""),
    env["PROV_DB_HOST"],
    service,
)
values = {
    "DATABASE_URL": f'"{url}"',
    "DIRECT_URL": f'"{url}"',
    "NODE_ENV": "production",
    "PORT": ports[service],
    "JWT_SECRET": env["PROV_JWT_SECRET"],
    "PROVISIONING_SERVICE_TOKEN": env["PROV_TOKEN"],
    "S3_ACCESS_KEY_ID": env["PROV_S3_KEY"],
    "S3_SECRET_ACCESS_KEY": env["PROV_S3_SECRET"],
    "S3_ENDPOINT": env["PROV_S3_ENDPOINT"],
    "S3_BUCKET": env["PROV_BUCKET"],
}
if service == "identity":
    values["SEED_ADMIN_PASSWORD"] = env["PROV_ADMIN_PASSWORD"]
    values["GOOGLE_CLIENT_ID"] = env["PROV_GOOGLE_ID"]
    values["GOOGLE_CLIENT_SECRET"] = env["PROV_GOOGLE_SECRET"]
if service == "exam":
    values["EXAM_ACCESS_CODE_SECRET"] = env["PROV_EXAM_ACCESS_SECRET"]

lock_path = env.get("PROV_LOCK")
s3_public = env["PROV_S3_ENDPOINT"]
if lock_path:
    hosts = {app: pin["sslHost"] for app, pin in json.load(open(lock_path))["apps"].items()}
    port = env.get("PROV_PUBLIC_PORT", "")
    suffix = f":{port}" if port else ""

    def origin(app):
        return f"https://{hosts[app]}{suffix}"

    all_origins = ",".join(origin(app) for app in sorted(hosts))
    s3_public = f"https://storage.mts241alikhlash.sch.id{suffix}"
    values.update(
        {
            "FRONTEND_URL": all_origins,
            "SSO_ACCOUNTS_ORIGIN": origin("account"),
            "SSO_APPS": ",".join(f"{app}={origin(app)}/oauth/callback" for app in sorted(hosts)),
            "PORTAL_BASE_URL": origin("portal"),
            "GOOGLE_OAUTH_REDIRECT_ALLOWLIST": all_origins,
            "GOOGLE_CALLBACK_URL": origin("account") + "/auth/google/callback",
            "S3_PUBLIC_ENDPOINT": s3_public,
        }
    )

lines = []
for line in open(source):
    match = re.match(r"([A-Z][A-Z0-9_]*)=", line)
    key = match.group(1) if match else None
    if key in values:
        lines.append(f"{key}={values[key]}\n")
    elif key and key.endswith("_SERVICE_URL"):
        name = key[: -len("_SERVICE_URL")].lower()
        lines.append(f"{key}=http://{name}-service:{ports[name]}\n")
    else:
        lines.append(line)

if service == "identity" and not any(line.startswith("S3_ENDPOINT=") for line in lines):
    lines += [
        "S3_ENDPOINT=" + env["PROV_S3_ENDPOINT"] + "\n",
        "S3_PUBLIC_ENDPOINT=" + s3_public + "\n",
        "S3_BUCKET=" + env["PROV_BUCKET"] + "\n",
        "S3_ACCESS_KEY_ID=" + env["PROV_S3_KEY"] + "\n",
        "S3_SECRET_ACCESS_KEY=" + env["PROV_S3_SECRET"] + "\n",
    ]

fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "w") as handle:
    handle.writelines(lines)
