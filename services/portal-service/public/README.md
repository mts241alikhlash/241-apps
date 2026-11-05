# public/

Default location of the portal single-page app's build output. `PORTAL_DIST_PATH` overrides it; when unset, the service reads `public/` under its working directory.

`index.html` here is a stand-in: the source template with the `<!-- speckit:meta:start -->` and `<!-- speckit:meta:end -->` markers that `PortalHtmlController` replaces per request, without the bundled JavaScript and CSS of a real build. It is enough to exercise metadata injection, not to render the site.

For the real site build `portal-web` (`pnpm --filter portal-web run build`) and point `PORTAL_DIST_PATH` at `apps/portal-web/dist`.

- Keep the markers: everything between them is replaced with values from `GetPageMetaUseCase`, because social crawlers do not run JavaScript.
- Keep sensible default tags between them: a path that resolves to nothing public falls back to them instead of returning a 404 with no HTML.
