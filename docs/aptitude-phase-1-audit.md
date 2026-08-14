# Aptitude System — Phase 1 Product & Engineering Audit

Date: 2026-08-05
Scope: current aptitude frontend, aptitude API surface, session/attempt models, adaptive services, and the provided dashboard reference direction.

## Executive decision

The aptitude module should be redesigned as a separate product area with a new information architecture. The existing backend contains a useful foundation and should be retained selectively, but the current frontend should not be extended as one large page.

Recommended product structure:

1. Overview — what to do today
2. Practice — topic and adaptive practice
3. Mock Tests — timed assessment flows
4. Review — mistakes, revision and bookmarks
5. Progress — mastery, trends and readiness
6. Company Prep — company/pattern-specific tests

The immediate goal is to reduce decision overload, make the next action obvious, and expose the capabilities that already exist in the backend.

## 1. Current user journey audit

### Existing journey

`Sidebar → Aptitude → load eight endpoints → very long dashboard → start a 10-question session → answer + confidence → immediate explanation → summary`

### Current journey problems

| Area | Finding | Impact | Severity |
|---|---|---|---|
| Entry point | The page presents hero CTA, difficulty cards, revision, mistake fixing, recommendations and analytics together | User does not know which action is the intended next step | P0 |
| First-time user | Many analytics panels show minimum-attempt messages | New users see unavailable features instead of a guided first session | P1 |
| Session state | Session is stored only in React state after creation | Refresh/navigation loses the active quiz even though the backend has a session lookup endpoint | P0 |
| Practice vs test | One flow gives instant feedback and confidence capture for every session | There is no distinct learning mode versus exam simulation mental model | P0 |
| Navigation | Quiz has no question palette, skip, mark-for-review or bookmark UI | Users cannot manage a real assessment confidently | P0 |
| Results | Result screen only exposes aggregate counters | It does not clearly tell the user what to do next | P1 |
| Empty states | Analytics are gated by several thresholds independently | The page becomes a collection of locked/empty cards | P1 |
| Content discovery | Recommendations render as non-actionable cards | A user cannot start a specific recommended question from the card | P1 |
| Trust | Readiness is shown as a number without a visible explanation | User cannot understand or trust the score | P1 |
| Copy quality | Several strings contain mojibake such as `Ã¢â€˜` and `Ã¢â†’` | Product looks unfinished and harms comprehension | P0 |

## 2. Frontend architecture audit

### Current implementation

`frontend/src/pages/dashboard/AptitudePage.jsx` owns:

- eight dashboard API requests
- session creation
- answer submission
- timer state
- question rendering
- feedback rendering
- result rendering
- all dashboard cards
- all inline style tokens

This is a high-coupling component. A change to session behavior can easily break the dashboard, and a visual change requires navigating a large conditional render tree.

### Required target architecture

```text
frontend/src/features/aptitude/
├── AptitudeRoutes.jsx
├── AptitudeOverviewPage.jsx
├── PracticePage.jsx
├── MockTestsPage.jsx
├── ReviewPage.jsx
├── ProgressPage.jsx
├── CompanyPrepPage.jsx
├── session/
│   ├── AptitudeSessionPage.jsx
│   ├── QuestionNavigator.jsx
│   ├── SessionHeader.jsx
│   ├── AnswerOptions.jsx
│   └── SessionExitDialog.jsx
├── results/
│   ├── SessionResultPage.jsx
│   ├── CategoryBreakdown.jsx
│   └── NextActionCard.jsx
└── components/
    ├── ReadinessCard.jsx
    ├── TopicMasteryCard.jsx
    ├── WeakAreaCard.jsx
    ├── RecommendedPracticeCard.jsx
    └── AptitudeEmptyState.jsx
```

The current dashboard should become a route shell, not the quiz engine.

## 3. Backend capability map

### Already available and worth reusing

- dashboard summary
- topic/category discovery
- recommendations
- adaptive difficulty selection
- mistake breakdown
- skill DNA
- speed/accuracy profile
- confidence calibration
- revision queue
- daily mission
- badges
- paginated question browsing
- similar-question endpoint
- attempts and session creation
- session retrieval
- session submission
- mark-for-review endpoint
- bookmarks
- question reports
- company tags and company-pattern session mode in the data model
- exam-simulation mode and negative-marking fields in the session model

### Existing capability not exposed by the current frontend

| Backend capability | Current UI status | Product decision |
|---|---|---|
| `GET /sessions/:id` | Not used | Required for resume after refresh/login |
| `POST /sessions/mark-review` | Not used | Required in mock and practice sessions |
| bookmark endpoints | Not used in aptitude page | Add to question header and review area |
| similar question endpoint | Not used | Add after explanation |
| report endpoint | Not used | Add to overflow menu |
| question pagination | Not used | Required for Practice browse page |
| `EXAM_SIMULATION` mode | Not exposed | Build Mock Tests setup flow |
| `timeLimitSeconds` | Stored but not enforced in UI | Must become server-authoritative |
| negative marking | Stored but not used in session creation UI | Add explicit test configuration |
| `COMPANY_PATTERN` mode | Enum exists, no complete UI flow | Build Company Prep later |

## 4. Production-blocking engineering findings

### P0 — missing imports

`backend/services/aptitudeService.js` calls `mongoose.Types.ObjectId` in `getTimingSample`, but the file does not import `mongoose`. The skill-DNA and speed/accuracy endpoints can fail at runtime.

`backend/controllers/aptitudeController.js` uses `AptitudeQuestion` in topic and question handlers, but the controller header does not import it. Those endpoints can fail at runtime.

These must be fixed before frontend redesign verification.

### P0 — duplicate submission risk

`submitAttempt` creates a new attempt every time it receives a valid request. There is no idempotency key or server-side protection against double-clicks, retries, or network replay.

Required solution:

- add a client-generated `submissionId`
- enforce uniqueness per user/session/question/submissionId
- return the original result for duplicate requests
- disable the submit action while pending

### P0 — session integrity gap

The client calculates elapsed time from `startedAt`, and the server accepts that client timestamp. The server caps the value but does not enforce a session-level deadline or verify the current question state before creating an attempt.

Required solution:

- store session deadline/server start data
- verify session belongs to the user and is active
- verify the question is in the session
- reject repeated answers for the same session question unless explicitly retrying
- auto-complete or expire timed sessions on the server

### P0 — revision/fix flow can conflict with solved-question exclusion

Adaptive selection excludes `solvedQuestionIds` globally. That is good for fresh practice, but revision and mistake repair need a deliberate policy: fresh same-topic questions, original wrong questions, or both. The current behavior is implicit and can produce weak revision quality or no available questions.

### P1 — session recovery is not connected

The backend has `GET /sessions/:id`, `currentQuestionIndex`, question statuses and `ABANDONED` state, but the frontend does not persist the active session ID or restore it.

### P1 — mutation consistency

Attempt processing performs several independent writes: attempt, profile counters, average time, topic mastery, revision, streak, mission, badges and readiness. A partial failure can leave the profile and attempt data inconsistent.

The longer-term fix is an idempotent transaction/event approach. At minimum, add reconciliation tests and a safe retry strategy.

## 5. Data model audit

### Good foundation

The models already capture the important learning signals:

- difficulty, category, topic
- expected time and actual time
- confidence
- mistake type
- attempt number
- session state
- revision stage and due date
- readiness inputs

### Data model gaps for the redesigned experience

1. No explicit `lastViewedAt` or `lastSavedAt` for session recovery.
2. No stable `submissionId` for idempotent writes.
3. No session-level event history for timer expiry, navigation and abandonment.
4. No result snapshot version or scoring version.
5. No explicit distinction between practice feedback and exam feedback.
6. No question-level review status independent of a particular session.
7. No reliable company/test template model for reusable mock tests.
8. No confidence calibration sample metadata explaining minimum sample size to the client.

## 6. Current analytics quality risks

### Readiness score

The service computes readiness from accuracy, difficulty balance, consistency, speed and recent performance. That is directionally useful, but the UI needs to show:

- score
- confidence/quality label
- sample size
- last updated timestamp
- component breakdown
- one recommended action

Do not show a precise-looking score for insufficient data. For new users, show a diagnostic CTA instead.

### Mastery

Topic mastery becomes meaningful only after a minimum attempt count. The dashboard should not show a large grid of unavailable metrics. Use a compact “Build your baseline” card until enough data exists.

### Mistake classification

The classification is inferred from time and confidence. That is useful coaching metadata, not ground truth. Copy should say “Likely cause” rather than “You made a calculation error.”

## 7. Recommended information architecture

### Overview

Primary question: “What should I do now?”

Show:

- continue active session
- recommended next practice
- readiness/baseline
- today’s goal
- weakest topic
- due revision
- compact category mastery

### Practice

Primary question: “What do I want to improve?”

Filters:

- category
- topic
- difficulty
- timed/untimed
- question count
- weak areas only

### Mock Tests

Primary question: “Can I perform under placement conditions?”

Support:

- full-length test
- category test
- company-pattern test
- question count
- time limit
- negative marking
- instructions/preflight

### Review

Primary question: “Why did I lose marks and what should I repeat?”

Show:

- wrong answers
- likely mistake type
- saved questions
- due revision
- similar practice

### Progress

Primary question: “Am I improving?”

Show:

- trend over time
- category comparison
- topic mastery
- speed vs accuracy
- confidence calibration
- session history

## 8. Success metrics for the redesign

Track these after implementation:

- aptitude page → first session start rate
- first session completion rate
- answer submission error rate
- session resume rate
- practice → second session conversion
- percentage of users who act on a weak-area recommendation
- mock-test completion rate
- result page → next practice click rate
- mobile quiz completion rate
- percentage of sessions abandoned due to UI/navigation issues

Initial targets:

- first-session start: >60% of aptitude visitors
- first-session completion: >70% of starters
- duplicate/missing attempt rate: <0.1%
- result-to-next-action click: >35%
- zero critical errors in refresh/resume flow

## 9. Phase 1 exit criteria

Phase 1 is complete when:

- current flows and risks are documented
- P0 bugs are listed and prioritized
- API capability map is agreed
- target navigation is agreed
- practice and mock-test behavior are explicitly separated
- readiness and empty-state rules are defined
- success metrics are defined
- Phase 2 wireframes can be created without inventing missing behavior

## Recommended next step

Before building the new visual UI, fix the two missing-import runtime bugs and define the session contract: practice mode, mock mode, resume behavior, timer authority, skip/mark-review semantics and duplicate submission handling. Then build the Overview + Practice + Session wireframes against that contract.
