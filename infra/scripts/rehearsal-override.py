import json
import os
import subprocess
import sys

compose_file = sys.argv[1]
tag = os.environ.get("REHEARSAL_TAG", "rehearsal")
raw = subprocess.run(
    ["docker", "compose", "-f", compose_file, "--profile", "migrate", "--profile", "storage", "config", "--format", "json"],
    check=True,
    capture_output=True,
    text=True,
).stdout
config = json.loads(raw)
lines = ["services:"]
for name, service in sorted(config["services"].items()):
    image = service.get("image", "")
    prefix = "ghcr.io/mts241alikhlash/"
    if image.startswith(prefix):
        local = image[len(prefix) :].split("@")[0]
        lines.append(f"  {name}:")
        lines.append(f"    image: localhost/241-apps/{local}:{tag}")
        lines.append("    pull_policy: never")
        if name == "gateway":
            lines.append("    ports: !override")
            lines.append("      - '127.0.0.1:8082:80'")
    elif name in ("postgres", "s3"):
        lines.append(f"  {name}:")
        lines.append("    networks: !override")
        lines.append("      - platform-net")
print("\n".join(lines))
