# Artifact-driven gateway

`generate.mjs` reads only JSON artifacts from `manifests/`, the routing schema,
the service upstream registry, and the deployment lock. It does not
import web source or `api-routes.config.ts` files.

```bash
node gateway/generate.mjs
node gateway/generate.mjs --check
node gateway/generate.self-check.mjs
```

The checked-in Nginx files are generated output. Generation refuses
`REPLACE_BEFORE_DEPLOYMENT` image identities: every image in the lock must be
pinned by digest.
