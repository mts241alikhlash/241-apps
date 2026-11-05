import json
import sys

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        document = json.loads(line)
    except json.JSONDecodeError:
        continue
    if document.get("status") == "success" and document.get("accessKey") and document.get("secretKey"):
        print(document["accessKey"], document["secretKey"])
        sys.exit(0)
sys.exit(1)
