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

fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "w") as handle:
    handle.writelines(lines)
