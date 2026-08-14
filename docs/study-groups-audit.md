# CodeVerse Study Groups Audit

Date: 2026-08-14

## Executive summary

The repository already has substantial Study Groups functionality: group discovery and creation, membership, invites, sessions, LiveKit calls, channels, realtime chat, threads, reactions, pins, attachments, group tests, daily plans, and accepted-submission completion checks. The primary risk is not missing infrastructure; it is split product ownership and inconsistent UI/API state management.

The current primary experience is `GroupsHub` at `/dashboard/groups`. `StudyGroupsPage` remains a second, feature-heavy implementation at `/dashboard/groups/manage`. The two surfaces duplicate groups, sessions, tests, plans, invites, and membership actions but do not share state or navigation. The next implementation phase should consolidate these capabilities behind one canonical group workspace while preserving the existing backend contracts.

## Current architecture

- `StudentDashboard.jsx` owns nested dashboard routes and renders `GroupsHub` for `groups` and `StudyGroupsPage` only for `groups/manage`.
- `GroupsHub.jsx` provides a WhatsApp-style group list, chat workspace, inline member view, inline direct messages, invite, and group conference.
- `StudyGroupsPage.jsx` provides the older dashboard with discovery, sessions, group tests, test lobby, test execution, test review, plans, and session meetings.
- `GroupChatPanel.jsx` is the shared realtime chat implementation used by both group surfaces.
- `GroupMembersPage.jsx` exists as a separate page but is not registered in `StudentDashboard`.
- `GroupConferenceModal.jsx` handles ad-hoc group calls; `StudyGroupMeeting.jsx` handles scheduled session rooms. Both duplicate LiveKit room/track management.
- Backend study-group routes are protected for students and mounted at `/api/study-groups`.
- `StudyGroup` embeds members, sessions, and recent activity. `StudyTest` and `StudyPlan` are separate collections. Chat uses `GroupChannel` and `GroupMessage`.
- `streakService` derives streaks exclusively from accepted `Submission` dates in UTC.

## Route and navigation findings

1. The preferred canonical routes do not exist. Only `/dashboard/groups` and `/dashboard/groups/manage` are registered.
2. `GroupsHub` sends its settings/manage action to `/dashboard/groups/manage`, which opens the legacy product rather than a group-specific workspace.
3. `StudyGroupsPage.openGroup()` navigates to `/dashboard/groups/:groupId/members`, but that route is not registered. `GroupMembersPage.jsx` is therefore unreachable through the app router.
4. Group sub-routes for overview, chat, practice, tests, sessions, resources, members, and progress are absent.
5. Direct navigation to a future group sub-route will fall through to the dashboard shell without a useful page-level not-found state.
6. Security settings routing is currently correctly declared as the nested `settings` route, but the route is surrounded by a global dashboard-data loading/error gate. A failed dashboard request can visually obscure independent settings content.
7. `StudentDashboard` renders `null` for the overview when dashboard data fails, producing the previously observed blank content area instead of a retryable page.

## API and contract findings

1. Frontend sends `category` to `GET /api/study-groups`; backend supports the query, but category filtering is exact tag equality, which may exclude groups whose focus is not duplicated in `tags`.
2. `leaveGroup` returns only `{ groupId }`, while both frontend implementations update local state only when `response.data.group` exists. The UI can remain joined until a later reload.
3. The leave notification is emitted after the departing member is removed, so the departing user is not included in `study-groups:updated`.
4. `publicGroup.online` is hard-coded to `0`. Realtime presence exists in Socket.IO but is not reflected in list/workspace group summaries.
5. `publicGroup` exposes `ownerId` without normalizing it to a string, creating avoidable frontend comparison inconsistencies.
6. Plan completion requires a previously created accepted `Submission`, which is correct for integrity, but completion does not invoke streak or points activity directly. It only emits a group update.
7. Group tests persist answers and participant status, but there is no dedicated score/rank/accuracy summary endpoint. Review returns answers only.
8. Test status is not automatically transitioned from `active` to `ended` when the duration expires; the creator must end it.
9. Session status supports scheduled/completed/cancelled in the model, but the API has no completion/cancellation management path and the frontend mainly handles scheduled sessions.
10. Resources are not represented by a model or route.
11. Group progress/analytics are not represented by a model or route.
12. Group-level streak endpoints do not exist.
13. Streak APIs are user-only: `/api/streak`, `/calendar`, and `/achievements`.

## Functionality findings

### Working or substantially implemented

- Group create, discover, join, leave, invite creation, invite preview, and invite join.
- Protected membership checks for chat, channels, sessions, tests, and plans.
- Chat channels, unread counts, pagination cursor support, threads, edit/delete, reactions, pins, attachments, typing, and realtime updates.
- LiveKit token creation for ad-hoc conferences and scheduled sessions.
- Test lobby polling, presence, code execution/submission, and post-test review.
- Daily plan creation, joining, daily queue calculation, and accepted-submission completion.

### Missing or incomplete

- Canonical group workspace navigation.
- Explicit `Solve` versus `Practice Together` flow. Current plan/test cards mostly navigate to the normal problem page or test room; there is no collaborative coding room with shared timer/problem state.
- Group streak, activity contribution, and group completion calculations.
- Practice participant state and collaborative submission status.
- Test leaderboard, score, accuracy, elapsed time, and weak-topic actions.
- Session reminders, details, live/completed/cancelled state transitions.
- Resources area.
- Group progress analytics.
- Member contribution, streak, solved count, group points, and invite-to-practice actions.
- Consistent unread/channel UI between group implementations.

## Loading, error, and empty-state findings

- `GroupsHub` has loading and error text but no retry action for groups or members.
- `GroupChatPanel` silently converts channel/message failures into empty arrays, which can look like a new empty group rather than a failed request.
- Direct-message initialization catches errors and renders an empty chat without an actionable error.
- `StudyGroupsPage` catches test/plan loading failures and silently clears the data.
- `StudentDashboard` shows an error message and separately renders a null overview, leaving a blank main route after the request fails.
- Conference and meeting errors are visible, but camera/microphone permission denial has no recovery guidance beyond the generic error.
- Several modal forms have no submitting/disabled state, allowing duplicate requests.
- `window.alert` is used for channel creation errors instead of the app notification pattern.

## Realtime and data-consistency findings

- Socket authentication is JWT-protected and group room joins verify membership, which is a strong baseline.
- Presence is broadcast only to the current group room and is not persisted, which is appropriate for online state but must be treated as ephemeral.
- Group update events are broad invalidation events; each page reloads multiple endpoints independently, increasing request volume.
- Message reactions preserve the local `reacted` value by matching the previous message, which can become stale if another device changes the same reaction.
- Plan completion is idempotent for the participant/problem pair, but there is no reward ledger idempotency because no reward is issued in this path.
- Embedded group members and sessions can grow without explicit limits or archival strategy.
- `StudyGroup` activity is trimmed to 20 entries, which is acceptable for a recent feed but not for durable analytics.

## Streak findings

- The current streak calculation is deterministic and prevents same-day duplicate submissions from increasing the day count.
- It uses UTC date keys, while the requested product behavior calls for explicit timezone-boundary handling. There is no user timezone field or timezone-aware activity key.
- Only accepted submissions count. Practice completion, plan completion, test participation, session attendance, and meaningful chat/group activity do not count.
- There are no group streak calculations, milestone records, recovery behavior, or tests for the requested activity types.
- `refreshStreakAndAchievements` updates user streak fields but is not visibly integrated with every learning completion path.

## Accessibility and responsive findings

- Many controls have accessible labels, especially icon-only chat and call controls.
- Some clickable elements are `div`/`span` elements with role handlers instead of native buttons, increasing keyboard and screen-reader risk.
- `GroupMembersPage` nests interactive-like call controls inside a button row, creating invalid interaction semantics.
- Desktop and mobile CSS exists for the group hub, but the experience is a stacked sidebar/workspace rather than the requested mobile bottom/compact navigation and sticky action model.
- The legacy and hub styles use separate naming systems, increasing visual drift.
- Some modal dialogs lack focus trapping and initial focus management.
- Reduced-motion handling is not consistently implemented.

## Visual/design findings

- The existing styles are already a strong dark SaaS baseline with gradients, group tones, cards, and responsive behavior.
- `GroupsHub` is visually closer to the requested collaborative workspace than `StudyGroupsPage`.
- `StudyGroupsPage` is denser and mixes dashboard cards, test tools, plans, and modal flows in one component, making hierarchy and maintenance difficult.
- There are duplicate CSS imports in `GroupsHub.jsx`.
- There are duplicated LiveKit components and duplicated member experiences.
- Several text strings contain mojibake characters in source/output, indicating an encoding hygiene issue.
- Inline styles remain widespread in `SecuritySettings.jsx` and parts of the group experience, contrary to the requested tokenized reusable component system.

## Security findings

- REST group routes are protected by JWT and student role checks.
- Per-group access checks are present for members, channels, messages, sessions, tests, plans, and conference tokens.
- Channel creation is restricted to owners/moderators.
- Test and plan creation are restricted to group owners.
- Invite tokens are hashed server-side and expire after seven days.
- Cloudinary attachment upload is delegated to the existing upload middleware/service, but frontend upload size/type feedback is not visible in the audited UI.
- Group message edit/delete and pin/reaction authorization must remain server-authoritative; the frontend currently exposes controls broadly and relies on API rejection.
- LiveKit room names are group-scoped, but scheduled-session lifecycle checks are limited to `scheduled` status.
- The active Firebase service-account JSON visible in the IDE should remain outside the repository and must never be committed or exposed to the frontend.

## Recommended implementation order

1. Add a canonical route tree and migrate `GroupsHub` workspace behavior into route-addressable group pages.
2. Fix leave responses/local state, dashboard error fallback, retry states, and silent API failures.
3. Extract shared group primitives and unify chat/member/meeting implementations.
4. Add group workspace overview, practice, sessions, tests, members, resources, and progress routes incrementally using existing APIs.
5. Add server-authoritative activity events and personal/group streak services with timezone-aware tests.
6. Add test score/rank summaries, session lifecycle actions, resources, and group analytics.
7. Apply responsive/accessibility/animation polish and run full regression checks.

