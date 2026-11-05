# 0007: Single sign-on through account-web

## Context

Each app once had its own login and session. A person using two apps signed in twice, and the first design (a shared refresh cookie on the API host) only worked while every app called the API through one origin; the apps now call it through their own origins.

## Decision

Staff sign in once on account-web. An app with no session starts an authorization flow with PKCE through identity; account-web shows its login page when there is no central session; identity redirects to the app's registered `/oauth/callback` with a single-use code valid for 60 seconds; the app exchanges the code and verifier for its own app session cookie on its host. Sessions are a central session, app sessions whose parent is the central one, and plain applicant sessions, all with a 30-day absolute limit. `GET /auth/me` is the only answer to who is signed in. Applicants keep their own sign-in in admission-web.

## Consequences

- Logout revokes the whole session family, so signing out signs out everywhere.
- Every app must be registered in the identity service's `SSO_APPS` with its callback; a new app (see [add an app](../guides/add-app.md)) is not usable until it is.
- Requests to the login and exchange endpoints must reach identity with the `Host` unchanged, because they refuse a foreign `Origin`.
- Login pages stay per app (branding through `configureAuth`), but all authenticate against the same central session.
