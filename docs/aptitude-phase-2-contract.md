# Aptitude System — Phase 2 Contract & Hardening Design

Date: 2026-08-05

## Objective

Make the aptitude backend safe enough for the redesigned frontend to depend on. Phase 2 separates practice behavior from assessment behavior and makes session state recoverable, server-owned and retry-safe.

## 1. Session state machine

```text
                 ┌───────────────┐
                 │    ACTIVE     │
                 └───────┬───────┘
             answer/skip│        │user exits
                        │        ▼
                        │   ┌───────────┐
                        │   │ ABANDONED │
                        │   └───────────┘
                        ▼
                 ┌───────────────┐
                 │   COMPLETED   │
                 └───────────────┘
                        ▲
                        │ submit / time expiry result
```

Rules:

- Only `ACTIVE` sessions accept answers.
- A question must belong to the session and must not already have an `attemptId`.
- A session can be resumed through `GET /api/aptitude/sessions/active`.
- `config.timeLimitSeconds` produces a server-side `expiresAt`.
- After expiry, answers are rejected with `SESSION_EXPIRED`; the client can still submit the session and receive a timed-out result.
- Session ownership is always scoped by both session ID and authenticated user ID.

## 2. Practice versus mock-test contract

### Practice mode

- no mandatory session deadline unless explicitly configured
- immediate correctness and explanation feedback
- confidence optional in the UI
- similar question and revision actions available
- skipped questions do not affect accuracy, mastery, readiness or streak

### Mock-test mode

- explicit preflight screen
- fixed question count and time limit
- optional negative marking configuration
- no correctness explanation until final submission
- answer palette with answered/unanswered/marked states
- server rejects answers after expiry
- result includes `timedOut`

The backend stores the mode and configuration. The frontend must use `session.mode` to select the appropriate interaction policy.

## 3. Answer submission contract

### Request

```json
{
  "questionId": "...",
  "sessionId": "...",
  "submissionId": "client-generated-stable-id",
  "selectedAnswer": "A",
  "confidence": "MEDIUM",
  "startedAt": "2026-08-05T12:00:00.000Z"
}
```

`selectedAnswer` can be `null` only for an explicit skip. `submissionId` should be reused when retrying the same network request.

### Guarantees

- Repeating the same `submissionId` returns the original result and does not create a second attempt.
- A question outside the session is rejected.
- An already submitted session question is rejected.
- A non-active session is rejected.
- A timed-out session answer is rejected.
- Server-calculated `serverTimeSpent` is returned to the client.

## 4. Active-session recovery

`GET /api/aptitude/sessions/active` returns the latest active session or `session: null`.

Frontend behavior:

1. On aptitude entry, request the active session.
2. If present, show a “Continue session” card before starting a new session.
3. Restore `currentQuestionIndex` and per-question statuses.
4. If the server says the session expired, show “Review result” rather than silently losing it.
5. Never rely only on React state or localStorage for authoritative progress.

## 5. Result contract

The final result contains:

- answered count
- correct count
- incorrect count
- skipped count
- accuracy based only on answered questions
- average time based only on answered questions
- XP awarded
- `timedOut`
- topic breakdown
- category breakdown
- difficulty breakdown
- readiness score after completion

The result page should turn these into next actions:

- review incorrect answers
- practice weakest category
- review due topics
- start a similar question set
- return to overview

## 6. Data integrity decisions

### Attempts

- `submissionId` is optional for legacy callers but required for the redesigned frontend.
- A partial unique index protects `(userId, submissionId)` when a value is supplied.
- Skipped attempts are retained for audit/history but excluded from learning metrics.

### Profile metrics

Only answered questions update:

- `totalAttempts`
- `totalCorrect`
- topic mastery
- revision schedule
- readiness score
- streak and mission progress

This prevents a user who skips every question from receiving a false accuracy/mastery signal.

### Revision policy

Revision uses fresh questions from the same topic by default. The original wrong question remains available in Review for explanation and reattempt. This avoids accidentally presenting the exact answer memory as mastery evidence.

## 7. Error codes for frontend handling

| Code | Meaning | Frontend action |
|---|---|---|
| `SESSION_NOT_ACTIVE` | Session already completed/abandoned | Navigate to result or overview |
| `QUESTION_ALREADY_SUBMITTED` | Duplicate question submission without same request ID | Restore its submitted state |
| `SESSION_EXPIRED` | Server deadline passed | Stop timer and show submit-result action |
| `NO_SESSION` | Active session does not exist | Show start-practice CTA |
| `INVALID_SESSION_QUESTION` | Question is not part of session | Refresh session safely |

## 8. Migration and rollout plan

### Safe rollout

1. Deploy schema additions: `submissionId`, `expiresAt`, `timedOut`.
2. Existing attempts remain valid because `submissionId` is nullable.
3. Existing sessions without `expiresAt` remain untimed.
4. Ship the new frontend with `submissionId` generation.
5. Add a monitoring query for duplicate-key errors and expired sessions.
6. Backfill only if analytics require a historical scoring version; do not rewrite old attempts silently.

### Important deployment note

The unique partial index should be allowed to build in a controlled deployment. If an earlier environment contains duplicate non-null submission IDs, clean those records before index creation.

## 9. Required automated test matrix

### Session tests

- user cannot read another user’s session
- active session is returned by the active-session endpoint
- completed session is not returned as active
- time-limited session gets `expiresAt`
- expired session rejects answer
- question outside session is rejected
- already answered question is rejected

### Attempt tests

- first submission creates one attempt
- retry with same `submissionId` returns same attempt
- concurrent duplicate is handled by unique index fallback
- skipped attempt does not change mastery/readiness/accuracy counters
- answered attempt updates session question status
- server time is returned

### Result tests

- skipped questions are not included in accuracy denominator
- skipped questions are not included in average-time denominator
- timed-out result sets `timedOut: true`
- repeated session submission returns stored result

## 10. Phase 2 completion criteria

- Syntax checks pass for all changed backend modules.
- Existing streak and gamification tests pass.
- Active-session endpoint is available.
- New frontend can submit idempotently with `submissionId`.
- Timed session behavior is server-enforced.
- Skipped answers do not pollute learning metrics.
- Review, practice and mock-test semantics are explicit.
- Phase 3 can build UI without inventing session behavior.
