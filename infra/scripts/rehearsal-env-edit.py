import json
import os
import re
import sys

target = sys.argv[1]
hosts = json.loads(os.environ["REHEARSAL_HOSTS"])
port = os.environ["REHEARSAL_PORT"]


def origin(app):
    return f"https://{hosts[app]}:{port}"


all_origins = ",".join(origin(app) for app in sorted(hosts))
sso_apps = ",".join(f"{app}={origin(app)}/oauth/callback" for app in sorted(hosts))
values = {
    "FRONTEND_URL": all_origins,
    "SSO_ACCOUNTS_ORIGIN": origin("account"),
    "SSO_APPS": sso_apps,
    "S3_PUBLIC_ENDPOINT": f"https://storage.mts241alikhlash.sch.id:{port}",
    "GOOGLE_OAUTH_REDIRECT_ALLOWLIST": all_origins,
    "PORTAL_BASE_URL": origin("portal"),
    "GOOGLE_CALLBACK_URL": f"{origin('account')}/auth/google/callback",
}
lines = []
for line in open(target):
    match = re.match(r"([A-Z][A-Z0-9_]*)=", line)
    key = match.group(1) if match else None
    lines.append(f"{key}={values[key]}\n" if key in values else line)
with open(target, "w") as handle:
    handle.writelines(lines)
