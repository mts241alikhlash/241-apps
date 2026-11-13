# 0011: Web exams run in Safe Exam Browser

## Context

Istiqra, the Android app, is the only client that locks a student phone during an exam. Laptops and iOS devices cannot install Istiqra, so students who take an exam in the browser could open other tabs, search, or chat. Before this change `exam-service` accepted any web client when the exam allowed it (`requireAndroidApp` and `allowWebClient` on the exam event, the room seat and the session).

## Decision

Web exams run only inside Safe Exam Browser (SEB) with a school configuration. The admin uploads the `.seb` file at `/settings/seb` in `exam-web`; the file holds the school Config Key and the Quit URL. The student opens the exam list in SEB; the page reads the Config Key through the SEB JavaScript API (`readSebKeys`) and sends `seb: { configKeyHash, pageUrl }` with the start and resume calls. `exam-service` checks the hash against the active configurations (`SebVerifier`) and rejects a web client that is not verified with `SEB_REQUIRED`.

Native Istiqra is unchanged: it is not verified by SEB and keeps its token flow. The token flow is the same for both clients: the student still enters the activity token to start or resume a session.

## Consequences

- The Config Key is a weak barrier, not proof. It is derivable from the `.seb` file that the student holds, so a request can be forged from a normal browser. Room supervisors and the monitor (`client` on each session) remain the second line.
- The browser's fetch metadata decides web or native: `Origin` or `Sec-Fetch-Site`, or `X-Client-Platform: web`. A `curl` call without these headers can skip the SEB check, but it still needs a valid exam token.
- `requireAndroidApp` and `allowWebClient` are removed, with their columns, DTOs, the room endpoint and the UI. The column drop is one-way: rolling back the release does not bring the values back.
- Minimum SEB versions: Windows 3.4 (the JavaScript API is absent in older builds), macOS 3.7, iOS 3.7. An older SEB opens the page without a Config Key and the page asks the student to update SEB.
- Config changes are staged: more than one configuration may be active, so students who still hold the old `.seb` file keep working until the old one is deactivated after the exam.
- Real SEB on Windows, macOS and iOS must be tested by the owner before the first exam.
