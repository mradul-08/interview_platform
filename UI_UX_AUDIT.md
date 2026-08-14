# CODEVERSE UI/UX AUDIT

**Date:** 2026-08-14
**Scope:** Full frontend + backend inspection of the CodeVerse Interview Platform (MERN)
**Status:** Read-only audit — no code was modified

---

## 1. Overall Product Assessment

CodeVerse is an ambitious, feature-rich interview preparation platform with a **real, working backend** (Express + MongoDB + Socket.io + LiveKit + Judge0/Docker execution) and a **substantial React frontend**. The backend is genuinely impressive: real streak computation from accepted submissions, real study-group chat with channels/threads/reactions, real group tests with live participant state, real video conferencing, and a real problem bank with execution.

However, the **frontend does not match the quality of the backend**. The product suffers from:

- **Three distinct visual identities** that do not belong to the same product (public/auth pages use indigo/cyan on near-black; the student dashboard uses orange/amber on charcoal; the admin dashboard uses indigo/violet on a different near-black).
- **Two competing Study Group implementations** with different navigation, styling, and feature sets.
- **Multiple broken or misleading interactions** (fake "Auto Save", dead "More filters" button, hardcoded badge counts, "Practice Together" that doesn't actually practice together).
- **Inconsistent typography** — the study-groups module uses 9–11px fonts extensively, while the dashboard uses 13–16px.
- **Marketing copy that does not match the shipped product** (Home page promises "Genesis 75" / "Ascend Sheet" but the app ships "Blind75" / "TOP 150" / "PLACEMENT 100" / "Striver").
- **A dashboard that hides real features** — the backend reports `aptitude: { isReady: false }` even though a full aptitude module is built and routed.

**Bottom line:** The backend is production-grade; the frontend is a collection of well-intentioned but inconsistent, partially-finished experiences. The highest-value work is consolidating the Study Group experience, unifying the design system, and fixing the broken interactions.

---

## 2. Current Design System

### Design Tokens (`frontend/src/styles/tokens.css`)
A solid token system exists with CSS variables for colors, radii, fonts, and shadows. It is **LeetCode-inspired** (orange `#ffa116` accent on charcoal `#1a1a1a`). Both dark and light themes are defined.

**Strengths:**
- Centralized color/radius/font/shadow tokens.
- `prefers-reduced-motion` support.
- `:focus-visible` outline defined globally.
- Custom scrollbar styling.

**Weaknesses:**
- The tokens are **not consistently used**. Many components hardcode colors (e.g., `#0D1020`, `#3D4466`, `#F0F2FF` in `NotBuiltYet.jsx`; `#020617`, `#E2E8F0`, `#94A3B8` in `AdminDashboard.jsx`; `#05070D`, `#22D3EE`, `#6366F1` in `Home.jsx`/`AuthPage.jsx`).
- The `--font-display` (Space Grotesk) is used for headings in the dashboard but the public pages use a different font stack.
- Radius tokens exist (`--radius-sm/md/lg/xl`) but components use arbitrary values (8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32px).

### Global CSS (`frontend/src/index.css`)
- Uses Tailwind v4 (`@import "tailwindcss"`).
- Defines `.cv-card`, `.cv-button`, `.cv-button-primary`, `.cv-button-secondary`, `.cv-chip`, `.cv-surface-title`.
- The `.cv-card` has a hover transform (`translateY(-2px)`) and a gradient top border — applied to **every** card, which is visually noisy when many cards are stacked.
- Light-theme overrides for Tailwind utility classes are hacky (`!important` overrides for `.text-slate-*`).

### Component Styling Approach
The codebase mixes **four** styling approaches inconsistently:
1. Inline `style={{}}` objects (dominant in dashboard pages).
2. Tailwind utility classes (Home, AuthPage, some Overview rows).
3. Dedicated CSS files (`study-groups.css`, `groups-hub.css`, `messages.css`, `group-members.css`, `aptitude.css`, `aptitude-module.css`, `auth.css`).
4. A few `@layer components` classes (`.cv-card`, `.cv-button`).

This makes it very hard to maintain consistent spacing, radius, and hover states.

---

## 3. Global UX Problems

| # | Problem | Evidence | Why it hurts UX | Recommended solution | Files | Priority |
|---|---------|----------|-----------------|----------------------|-------|----------|
| 1 | **Three visual identities** | Home/Auth use indigo/cyan on `#05070D`; student dashboard uses orange/amber on `#1a1a1a`; admin uses indigo/violet on `#020617` | The product feels like 3 different apps; no brand cohesion; users lose trust | Unify all surfaces on the token system; make the public pages use the same accent as the app | `Home.jsx`, `AuthPage.jsx`, `AdminDashboard.jsx`, `tokens.css` | **P1** |
| 2 | **Tiny fonts in study-groups module** | `study-groups.css` uses `font-size: 9px`, `10px`, `11px` extensively (e.g., `.study-group-footer`, `.study-chat-messages p`, `.study-activity small`) | Unreadable on most screens; fails WCAG AA (minimum 12px/16px for body); looks unprofessional | Raise minimum body text to 13px; use the token system for type scale | `study-groups.css` | **P1** |
| 3 | **Emoji-heavy UI** | `DashboardStreakCard.jsx` uses 🔥⚠️○🔒; `Overview.jsx` uses 👋; `MessagesPage.jsx` uses 👋; `StudyGroupsPage.jsx` uses 🚀 | Emojis render inconsistently across platforms; cheapen the premium feel; not accessible | Replace with SVG icons from the existing Lucide set | `DashboardStreakCard.jsx`, `Overview.jsx`, `MessagesPage.jsx`, `StudyGroupsPage.jsx` | **P2** |
| 4 | **Excessive gradients & glassmorphism** | `Home.jsx` (AuroraWash, gradient CTAs), `AuthPage.jsx` (radial gradients, backdrop-blur), `study-groups.css` (`.study-hero-card` radial gradient, `.study-chat-panel` linear gradient) | Visual noise; distracts from content; inconsistent with the "premium developer platform" goal | Reduce to subtle, single-purpose accents; prefer flat surfaces with strong borders | `Home.jsx`, `AuthPage.jsx`, `study-groups.css` | **P2** |
| 5 | **Mixed styling approaches** | Inline styles + Tailwind + CSS files all used for the same kinds of components | Hard to maintain; inconsistent spacing/radius/hover | Consolidate on a component library + token-driven CSS | All pages | **P2** |
| 6 | **Inconsistent card styles** | `.cv-card` (gradient top border + hover lift), `.study-group-card` (gradient bg + top accent bar), `.gh-overview-card`, `.study-side-card`, `.study-test-card` all differ | No visual hierarchy; cards compete for attention | Define one `Card` primitive with variants (default, elevated, interactive) | `index.css`, `study-groups.css`, `groups-hub.css` | **P2** |
| 7 | **Inconsistent border radius** | 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32px all used | Feels unpolished; no consistent shape language | Enforce the 4-token radius scale | All files | **P2** |
| 8 | **Dead / misleading UI elements** | "Auto Save" label in `ProblemDetailPage.jsx` (no autosave logic); "More filters" button in `StudyGroupsPage.jsx` (no handler); "View all" buttons in `SideCard` (no handler) | Users click and nothing happens; erodes trust | Remove or wire up every visible control | `ProblemDetailPage.jsx`, `StudyGroupsPage.jsx` | **P1** |
| 9 | **Hardcoded fake data** | `StudyGroupsPage.jsx` line 249: `{item === "invites" ? 3 : 2}` hardcoded badge counts | Users see fake notification counts; breaks trust | Compute from real API data or remove badges | `StudyGroupsPage.jsx` | **P1** |
| 10 | **Marketing copy mismatch** | `Home.jsx` promises "Genesis 75" / "Ascend Sheet"; `SheetsPage.jsx` ships "Blind75" / "TOP 150" / "PLACEMENT 100" / "Striver" | Users land on a different product than promised | Align marketing copy with shipped sheets or rename sheets | `Home.jsx`, `SheetsPage.jsx`, `dashboardController.js` | **P1** |
| 11 | **Outdated roadmap** | `Home.jsx` Roadmap says "Networking & hiring" is "planned" but Study Groups, Messages, Leaderboard are built | Misleads users about what exists | Update roadmap to reflect shipped features | `Home.jsx` | **P2** |
| 12 | **Dashboard hides real features** | `dashboardController.js` returns `aptitude: { isReady: false }`, `interviews: { isReady: false }`, `contests: { isReady: false }` — but aptitude is fully built | Overview shows "Coming soon" for features that exist | Wire the dashboard payload to real feature readiness | `dashboardController.js`, `Overview.jsx` | **P1** |

---

## 4. Navigation Problems

| # | Problem | Evidence | Why it hurts UX | Recommended solution | Files | Priority |
|---|---------|----------|-----------------|----------------------|-------|----------|
| 1 | **Sidebar "Settings" vs "Security" mismatch** | Sidebar links to `/dashboard/settings` labeled "Settings"; the component is `SecuritySettings` titled "Security Settings"; `PAGE_TITLES` maps it to "Settings" | Users looking for "Security" can't find it; users clicking "Settings" get only security, not general settings | Rename nav item to "Security" or build a real Settings hub with a Security tab | `Sidebar.jsx`, `StudentDashboard.jsx`, `SecuritySettings.jsx` | **P1** |
| 2 | **No `/dashboard/security` route** | `App.jsx` catch-all `*` redirects unknown routes to `/login`; only `/dashboard/settings` renders SecuritySettings | Direct URL `/dashboard/security` or a "Security" link redirects to login — appears broken | Add `/dashboard/security` as an alias route or fix the nav label | `App.jsx`, `StudentDashboard.jsx` | **P1** |
| 3 | **Two Study Group entry points** | Sidebar "Study Groups" → `/dashboard/groups` (GroupsHub); `StudyGroupsPage` (manage) is at `/dashboard/groups/manage`; `GroupMembersPage` at `/dashboard/groups/:id/members` | Users get different experiences depending on which link they click; confusing | Consolidate into one Study Group hub with clear sub-navigation | `Sidebar.jsx`, `StudentDashboard.jsx`, `GroupsHub.jsx`, `StudyGroupsPage.jsx` | **P0** |
| 4 | **`openGroup` navigates to members page** | `StudyGroupsPage.jsx` line 230: `navigate(\`/dashboard/groups/${group.id}/members\`)` — clicking a group card opens members, not the group workspace | Users expect to land on the group overview/chat, not a member list | Navigate to the group workspace overview | `StudyGroupsPage.jsx` | **P1** |
| 5 | **Full page reloads for navigation** | `GroupsHub.jsx` lines 296, 303: `window.location.assign(...)` for "Solve" buttons | Full reload flashes the app; loses SPA state; slow | Use `useNavigate` | `GroupsHub.jsx` | **P1** |
| 6 | **"Continue" on SheetsPage broken** | `SheetsPage.jsx` line 249: navigates to `/dashboard/problems?sheet=X` but `ProblemsPage.jsx` only reads `search` param | Clicking "Continue" shows unfiltered problems | Wire the `sheet` param into ProblemsPage or navigate to the sheet's first problem | `SheetsPage.jsx`, `ProblemsPage.jsx` | **P1** |
| 7 | **Mock Interview CTA leads to dead end** | `Overview.jsx` line 107: "Mock Interview" button → `/dashboard/mock` which is a `ComingSoonPage` | Primary CTA on the dashboard leads to a dead end | Either build the feature or remove/relabel the CTA | `Overview.jsx`, `StudentDashboard.jsx` | **P1** |

---

## 5. Study Groups Problems

### Architecture: Two Competing Implementations

| Aspect | GroupsHub (`/dashboard/groups`) | StudyGroupsPage (`/dashboard/groups/manage`) |
|--------|-------------------------------|---------------------------------------------|
| **Purpose** | Primary WhatsApp-style hub (chat, members, practice, video) | "Manage" page (create, schedule, tests, plans, notifications) |
| **Styling** | `groups-hub.css` (clean, 11–13px) | `study-groups.css` (tiny 9–11px fonts, heavy gradients) |
| **Navigation** | Sidebar list + workspace tabs | Tabs (My Groups / Discover / Invites / Requests) + hero card |
| **Chat** | Full `GroupChatPanel` with channels/threads/reactions | Sidebar `GroupChatPanel` widget |
| **Tests** | Not present | Full test creation/lobby/review flow |
| **Plans** | Read-only list + join | Full plan creation |
| **Video** | GroupConferenceModal + DirectCallModal | StudyGroupMeeting (sessions) |
| **Members** | Inline members view + DM | GroupMembersPage (separate route) |

**Impact:** The two pages expose overlapping but different features with different visual languages. A user who discovers groups via the sidebar gets the WhatsApp-style hub; a user who clicks "Manage groups" (via the `Settings` icon in the hub header) gets a completely different page. This is the single biggest UX inconsistency in the product.

### Specific Study Group Issues

| # | Problem | Evidence | Why it hurts UX | Recommended solution | Files | Priority |
|---|---------|----------|-----------------|----------------------|-------|----------|
| 1 | **"Practice Together" is a loop, not a feature** | `GroupsHub.jsx` `joinPracticePlan` just joins a plan and sets `view="practice"`; `PracticeView` renders the same list of questions with "Solve" / "Practice together" buttons again | Users click "Practice together" expecting a collaborative session but get the same list; the feature is fake | Build a real collaborative practice room (shared editor / session) or remove the button | `GroupsHub.jsx` | **P0** |
| 2 | **"Solve" uses full page reload** | `GroupsHub.jsx` lines 296, 303: `window.location.assign(\`/dashboard/problems/${slug}?...\`)` | Full reload; loses SPA state; slow | Use `useNavigate` | `GroupsHub.jsx` | **P1** |
| 3 | **Hardcoded invite/request counts** | `StudyGroupsPage.jsx` line 249: `{item === "invites" ? 3 : 2}` | Fake notification badges | Compute from API or remove | `StudyGroupsPage.jsx` | **P1** |
| 4 | **Dead "More filters" button** | `StudyGroupsPage.jsx` line 267: `<button title="More filters"><Filter size={15} /></button>` with no handler | Clicking does nothing | Remove or implement | `StudyGroupsPage.jsx` | **P1** |
| 5 | **Dead "View all" buttons** | `StudyGroupsPage.jsx` line 274: `SideCard` renders `<button>{action}</button>` with no handler | Clicking does nothing | Wire to real destinations or remove | `StudyGroupsPage.jsx` | **P1** |
| 6 | **Tiny fonts** | `study-groups.css` uses 9–11px for most text | Unreadable; fails accessibility | Raise to 13px+ | `study-groups.css` | **P1** |
| 7 | **Duplicate CSS import** | `GroupsHub.jsx` imports `groups-hub.css` twice (lines 13 & 16) | Redundant; maintenance smell | Remove duplicate | `GroupsHub.jsx` | **P3** |
| 8 | **Group card opens members, not workspace** | `StudyGroupsPage.jsx` `openGroup` → `/dashboard/groups/:id/members` | Wrong destination | Open the group workspace | `StudyGroupsPage.jsx` | **P1** |
| 9 | **"Schedule focus" only targets first joined group** | `StudyGroupsPage.jsx` line 262: `groups.find((group) => group.joined)` | Can't schedule for a specific group | Add a group selector | `StudyGroupsPage.jsx` | **P2** |
| 10 | **No "Resources" tab in workspace** | `GroupsHub.jsx` workspace tabs: Overview / Chat / Practice together / Members / Tests & sessions | The task spec asks for Overview, Practice, Chat, Members, Tests, Sessions, Resources, Progress — Resources is missing | Add a Resources tab (shared links/files) | `GroupsHub.jsx` | **P2** |

---

## 6. Solve vs Practice Together Problems

The task requires **two clear actions** for coding practice: **[Solve]** (individual) and **[Practice Together]** (collaborative).

### Current State

**Solve:**
- Exists in `GroupsHub.jsx` (Overview + PracticeView) and `StudyGroupsPage.jsx` (plan cards).
- Navigates to `/dashboard/problems/:slug?groupId=X&planId=Y`.
- **Works** but uses `window.location.assign` (full reload) in GroupsHub.
- In `StudyGroupsPage.jsx` plan cards it uses `navigate()` (SPA) — inconsistent.

**Practice Together:**
- Exists as a button in `GroupsHub.jsx` (Overview + PracticeView).
- **Does NOT work as a collaborative feature.** It calls `joinPracticePlan` which:
  1. POSTs to `/api/study-groups/:id/plans/:planId/join` (just adds the user as a participant).
  2. Sets `view="practice"`.
  3. `PracticeView` renders the same list of questions with "Solve" / "Practice together" buttons.
- There is **no shared editor, no live session, no collaborative coding** behind "Practice Together".

### Verdict

| Action | Exists? | Works? | Notes |
|--------|---------|--------|-------|
| Solve | ✅ | ⚠️ | Works but uses full page reload in GroupsHub |
| Practice Together | ✅ (button) | ❌ | Button exists but leads to the same list — no collaborative session |

**Recommended solution:** Either (a) build a real collaborative practice room (shared editor via the existing Socket.io infra, or a LiveKit screen-share session scoped to a problem), or (b) remove the "Practice Together" button and keep only "Solve" until the collaborative feature is real. A fake button is worse than no button.

---

## 7. Streak/Gamification Problems

### Current State (Verified — it is REAL)

The streak system is **genuinely implemented and connected to real activity**:

- `backend/services/streakService.js` computes streaks from **accepted submissions** (`Submission.find({ verdict: "Accepted" })`).
- `backend/controllers/streakController.js` exposes `/api/streak`, `/api/streak/calendar`, `/api/streak/achievements`.
- `backend/config/badges.js` defines badge milestones.
- `backend/services/gamificationService.js` handles points (10/20/30 for Easy/Medium/Hard).
- Frontend surfaces: `DashboardStreakCard.jsx`, `Topbar.jsx` (streak pill), `Overview.jsx` (stat card), `GroupsHub.jsx` (overview orb), `CodingHeatmap.jsx` (streak stats).

### Problems

| # | Problem | Evidence | Why it hurts UX | Recommended solution | Files | Priority |
|---|---------|----------|-----------------|----------------------|-------|----------|
| 1 | **Streak shown in 4+ places simultaneously** | Topbar pill + Overview stat card + DashboardStreakCard + CodingHeatmap stats + GroupsHub orb | Redundant; dilutes the signal; visual clutter | Consolidate: keep the Topbar pill + one dedicated streak card; remove duplicates | `Topbar.jsx`, `Overview.jsx`, `DashboardStreakCard.jsx`, `CodingHeatmap.jsx` | **P2** |
| 2 | **Emoji-heavy streak UI** | `DashboardStreakCard.jsx` uses 🔥⚠️○🔒 | Cheapens the premium feel; inconsistent rendering | Replace with SVG icons | `DashboardStreakCard.jsx` | **P2** |
| 3 | **Streak not surfaced in a compelling way** | The streak card is a plain card with small stats; no visual "momentum" story | Doesn't motivate; feels like a spreadsheet | Design a premium streak card with a clear "today" call-to-action and milestone progress | `DashboardStreakCard.jsx` | **P2** |
| 4 | **No shared/partner streak** | `Home.jsx` promises "shared streaks you can run with a practice partner" but no such feature exists | Marketing promise not delivered | Either build partner streaks or remove the claim | `Home.jsx` | **P2** |
| 5 | **Streak data fetched redundantly** | `useDashboard` fetches `/api/dashboard` (which includes streak via `getStreakStats`), `DashboardStreakCard` fetches `/api/streak` separately, `Topbar` uses `stats.currentStreak` from dashboard | Multiple API calls for the same data | Consolidate streak into the dashboard payload | `useDashboard.js`, `DashboardStreakCard.jsx` | **P2** |

---

## 8. Security Navigation Problems

### Investigation

**Route:** The Security page is only reachable at `/dashboard/settings`.
**Component:** `SecuritySettings.jsx` (title: "Security Settings").
**Navigation:** The sidebar has a "Settings" item → `/dashboard/settings`.
**Direct URL:** `/dashboard/security` → hits `App.jsx` catch-all `*` → redirects to `/login`.
**Refresh/back/forward:** `/dashboard/settings` works on refresh (it's a real route). `/dashboard/security` does not exist.
**Auth/role guards:** `PrivateRoute` in `App.jsx` requires `student` role for `/dashboard/*`. The SecuritySettings API (`/api/auth/sessions`) requires `protect` middleware — works for any authenticated user.

### Root Cause

There is **no "Security" navigation item or route**. The feature exists but is:
1. **Mislabeled** — the sidebar calls it "Settings", the page calls it "Security Settings".
2. **Hidden** — a user looking for "Security" in the nav won't find it.
3. **Unreachable by its natural name** — `/dashboard/security` redirects to `/login` (appears broken).

### Verdict

| Check | Result |
|-------|--------|
| Route exists | ✅ `/dashboard/settings` |
| Component exists | ✅ `SecuritySettings.jsx` |
| Sidebar navigation | ⚠️ Labeled "Settings", not "Security" |
| Direct URL `/dashboard/security` | ❌ Redirects to `/login` |
| Refresh | ✅ Works on `/dashboard/settings` |
| Back/forward | ✅ Works on `/dashboard/settings` |
| Auth guard | ✅ Requires student role |

**Recommended solution:** Add a proper "Security" nav item (or a Settings hub with a Security tab) and register `/dashboard/security` as an alias route so the natural URL works.

---

## 9. Responsive/Mobile Problems

| # | Problem | Evidence | Why it hurts UX | Recommended solution | Files | Priority |
|---|---------|----------|-----------------|----------------------|-------|----------|
| 1 | **Problem editor not mobile-friendly** | `ProblemDetailPage.jsx` uses a fixed split-panel with drag handle; on mobile the Monaco editor + problem panel are cramped | Coding on mobile is nearly impossible | Add a mobile tabbed layout (Problem / Editor / Result) | `ProblemDetailPage.jsx` | **P1** |
| 2 | **Study group hub collapses awkwardly** | `groups-hub.css` `@media (max-width: 860px)` stacks sidebar above workspace with `max-height: 40vh` | Group list takes half the screen; workspace cramped | Use a proper mobile drawer pattern | `groups-hub.css` | **P2** |
| 3 | **Topbar hides streak/points on mobile** | `index.css` `@media (max-width: 700px)` hides `.cv-topbar-status` and `.cv-topbar-points` | Users lose gamification context on mobile | Move streak/points into a mobile-accessible location | `index.css`, `Topbar.jsx` | **P2** |
| 4 | **Tables not responsive** | `ProblemsPage.jsx` uses fixed `gridTemplateColumns` (40px 1fr 110px 190px 130px 100px 40px) | Overflows on small screens | Use horizontal scroll or responsive column hiding | `ProblemsPage.jsx` | **P2** |
| 5 | **Leaderboard table not responsive** | `study-groups.css` `.study-ranking-row` fixed 5-column grid | Overflows on mobile | Make responsive | `study-groups.css` | **P2** |
| 6 | **Auth page heavy on mobile** | `AuthPage.jsx` has 3D constellation + feature grid + long form | Very long scroll; heavy render | Simplify mobile layout | `AuthPage.jsx` | **P2** |

---

## 10. Accessibility Problems

| # | Problem | Evidence | Why it hurts UX | Recommended solution | Files | Priority |
|---|---------|----------|-----------------|----------------------|-------|----------|
| 1 | **Tiny fonts (9–11px)** | `study-groups.css` throughout | Fails WCAG AA (body text must be ≥16px ideally, ≥12px minimum); unreadable | Raise type scale | `study-groups.css` | **P1** |
| 2 | **Low contrast text** | `--text-tertiary: #8a8a8a` on `#1a1a1a` (dark) and `#526174` on `#f7f7f8` (light) used for body copy | Fails WCAG AA contrast (4.5:1) for small text | Increase contrast of tertiary text or use it only for non-essential labels | `tokens.css` | **P1** |
| 3 | **Emoji as UI indicators** | 🔥⚠️○🔒👋🚀 | Screen readers read emoji inconsistently; not accessible | Use SVG icons with `aria-label` | `DashboardStreakCard.jsx`, `Overview.jsx`, `MessagesPage.jsx` | **P2** |
| 4 | **Missing aria labels on icon-only buttons** | Many icon buttons in `GroupsHub.jsx`, `StudyGroupsPage.jsx` lack `aria-label` | Screen reader users can't identify actions | Add `aria-label` to all icon-only buttons | `GroupsHub.jsx`, `StudyGroupsPage.jsx` | **P2** |
| 5 | **`window.alert` for errors** | `GroupChatPanel.jsx` uses `window.alert` for upload/channel errors | Blocking, jarring, not styled | Replace with toast system | `GroupChatPanel.jsx` | **P2** |
| 6 | **Focus states inconsistent** | Some components rely on `:focus-visible` global; others define custom focus; many inline-styled buttons have no focus style | Keyboard users can't tell where they are | Ensure all interactive elements have visible focus | All | **P2** |
| 7 | **Color-only status indicators** | Difficulty badges, verdict colors rely on color alone | Color-blind users can't distinguish | Add icons/text alongside color | `ProblemsPage.jsx`, `ProblemDetailPage.jsx` | **P2** |

---

## 11. Duplicate/Conflicting UI

| # | Duplicate | Files | Impact | Priority |
|---|-----------|-------|--------|----------|
| 1 | **Two Study Group implementations** | `GroupsHub.jsx` vs `StudyGroupsPage.jsx` | Conflicting navigation, styling, features | **P0** |
| 2 | **Two Testcase panels** | `ProblemDetailPage.jsx` defines `TestcasePanel` (exported, unused) and `DebugTestcasePanel` (used) | Dead code; maintenance burden | **P2** |
| 3 | **Multiple DiffBadge components** | `Overview.jsx`, `ProblemsPage.jsx`, `SheetsPage.jsx`, `ProblemDetailPage.jsx` each define their own `DiffBadge` | Inconsistent styling; duplicated logic | **P2** |
| 4 | **Multiple StatCard components** | `Overview.jsx`, `AdminDashboard.jsx`, `CodingHeatmap.jsx` each define their own | Inconsistent | **P2** |
| 5 | **Multiple Avatar/initials helpers** | `GroupsHub.jsx`, `GroupMembersPage.jsx`, `GroupChatPanel.jsx`, `MessagesPage.jsx`, `StudyGroupsPage.jsx` each define `initials()` | Duplicated | **P2** |
| 6 | **Multiple Card wrappers** | `Overview.jsx` `Card`, `.cv-card`, `study-side-card`, `gh-overview-card` | Inconsistent | **P2** |
| 7 | **Duplicate CSS import** | `GroupsHub.jsx` imports `groups-hub.css` twice | Redundant | **P3** |
| 8 | **Streak shown in 4+ places** | Topbar, Overview, DashboardStreakCard, CodingHeatmap, GroupsHub | Redundant | **P2** |
| 9 | **Two "Coming Soon" components** | `StudentDashboard.jsx` `ComingSoonPage` and `components/dashboard/NotBuiltYet.jsx` | Duplicated | **P3** |

---

## 12. Recommended Design System

### Principles
- **One identity:** A single accent (keep the LeetCode-inspired orange `#ffa116` — it's distinctive and developer-appropriate), one surface palette, one type scale.
- **Flat, confident surfaces:** Prefer solid surfaces + strong borders over gradients/glassmorphism. Reserve gradients for the primary CTA and brand mark only.
- **Information hierarchy:** Typography scale (display / h1 / h2 / h3 / body / caption / mono-label) with clear weight and size steps.
- **Accessibility-first:** Minimum 13px body text, 4.5:1 contrast, visible focus, SVG icons with aria-labels.

### Token Additions
- **Type scale:** `--text-xs: 12px`, `--text-sm: 13px`, `--text-base: 14px`, `--text-md: 16px`, `--text-lg: 20px`, `--text-xl: 28px`, `--text-display: 34px`.
- **Spacing scale:** `--space-1: 4px` … `--space-8: 32px` (4px increments).
- **Radius:** enforce the existing `--radius-sm/md/lg/xl` (8/12/16/20) — remove arbitrary values.
- **Semantic colors:** `--success`, `--warning`, `--danger`, `--info` mapped to existing green/amber/red/cyan.

### Reusable Primitives (to build in Phase 10)
| Primitive | Current state | Notes |
|-----------|---------------|-------|
| `Button` | `.cv-button-primary/secondary` + `study-primary/secondary` + inline styles | Consolidate into one `Button` with variants: primary, secondary, ghost, danger, icon |
| `Card` | `.cv-card` + many inline variants | One `Card` with `elevated` / `interactive` / `plain` variants |
| `StatCard` | 3+ implementations | One `StatCard` with label/value/icon/trend |
| `Badge` | `DiffBadge` (4 copies) + `study-tags` + `gh-practice-badge` | One `Badge` with tone variants |
| `Avatar` | 5+ `initials()` helpers | One `Avatar` with size + tone |
| `Tabs` | Inline tab bars everywhere | One `Tabs` component |
| `Modal` | `study-modal-backdrop` + `study-modal` + inline | One `Modal` with focus trap + ESC |
| `Dropdown` | `FilterPill` (ProblemsPage) + inline | One `Dropdown` |
| `Tooltip` | `title` attributes only | One `Tooltip` |
| `Toast` | `AuthPage` ToastStack + `gh-toast` + `study-notice` | One `Toast` system |
| `Skeleton` | `.cv-aptitude-skeleton` | One `Skeleton` |
| `EmptyState` | `study-empty`, `gh-empty`, `gh-empty-panel`, inline | One `EmptyState` |
| `ErrorState` | `ErrorBoundary` + inline | One `ErrorState` |
| `PageHeader` | Inline in every page | One `PageHeader` |
| `SectionHeader` | `Overview.jsx` + `gh-section-title` + `study-section-heading` | One `SectionHeader` |
| `ProgressBar` | Inline in many places | One `ProgressBar` |

---

## 13. Recommended Component Architecture

```
src/
  components/
    ui/                    # Design-system primitives
      Button.jsx
      Card.jsx
      StatCard.jsx
      Badge.jsx
      Avatar.jsx
      Tabs.jsx
      Modal.jsx
      Dropdown.jsx
      Tooltip.jsx
      Toast.jsx
      Skeleton.jsx
      EmptyState.jsx
      ErrorState.jsx
      PageHeader.jsx
      SectionHeader.jsx
      ProgressBar.jsx
    dashboard/             # Dashboard-specific widgets
      StreakCard.jsx
      CodingHeatmap.jsx
      CodingAnalyticsChart.jsx
      ResumeLearning.jsx
      TodaysRoadmap.jsx
      DailyChallenge.jsx
      DSAProgress.jsx
      CompanySheets.jsx
      Leaderboard.jsx
    study-groups/          # Consolidated Study Group experience
      GroupsHub.jsx        # single entry point
      GroupWorkspace.jsx
      GroupChatPanel.jsx
      GroupMembersView.jsx
      GroupTests.jsx
      GroupPlans.jsx
      GroupSessions.jsx
      GroupResources.jsx
      GroupConferenceModal.jsx
      DirectCallModal.jsx
      TestLobby.jsx
      TestRoom.jsx
      TestReview.jsx
  features/
    aptitude/              # already well-structured — keep
  layout/
    Sidebar.jsx
    Topbar.jsx
  hooks/
    useDashboard.js
    useStreak.js
    useStudyGroups.js
  api/
    api.js
    studyGroups.js
    problems.js
    aptitude.js
```

**Key architectural decisions:**
1. **Consolidate Study Groups** into a single hub with sub-routes (`/dashboard/groups`, `/dashboard/groups/:id`, `/dashboard/groups/:id/tests`, etc.) — remove the split between GroupsHub and StudyGroupsPage.
2. **Move all styling to the token system** — eliminate hardcoded hex colors and arbitrary radii.
3. **Extract shared primitives** — DiffBadge, StatCard, Avatar, Card, Tabs, Modal, Toast.
4. **Single source of truth for dashboard data** — consolidate streak/points into the dashboard payload to avoid redundant fetches.

---

## 14. Implementation Roadmap

### Phase 1 — Study Groups (Highest Priority)
- [ ] Consolidate GroupsHub + StudyGroupsPage into one hub with clear sub-navigation (Overview / Chat / Members / Practice / Tests / Sessions / Resources / Progress).
- [ ] Fix "Practice Together" — either build a real collaborative session or remove the button.
- [ ] Replace `window.location.assign` with `useNavigate` for Solve buttons.
- [ ] Remove hardcoded invite/request badge counts.
- [ ] Wire up or remove dead buttons ("More filters", "View all").
- [ ] Raise study-groups font sizes to ≥13px.
- [ ] Add a Resources tab.
- [ ] Fix group card navigation to open the workspace, not members.

### Phase 2 — Student Dashboard
- [ ] Wire dashboard payload to real feature readiness (aptitude is built but reported as not ready).
- [ ] Fix "Mock Interview" CTA (build or remove).
- [ ] Consolidate streak display (remove duplicates).
- [ ] Replace emoji with SVG icons.
- [ ] Fix "Coming soon" placeholders that hide real features.

### Phase 3 — Problem Detail + Code Editor
- [ ] Remove the fake "Auto Save" indicator (or implement autosave).
- [ ] Remove duplicate `TestcasePanel` / `DebugTestcasePanel`.
- [ ] Make the editor responsive (mobile tabbed layout).
- [ ] Fix the misleading "no Monaco dependency" comment.
- [ ] Standardize Run/Submit button labels.

### Phase 4 — DSA/Aptitude
- [ ] Align marketing copy ("Genesis 75" / "Ascend") with shipped sheets (Blind75 / TOP 150 / PLACEMENT 100 / Striver) or rename sheets.
- [ ] Fix SheetsPage "Continue" button (wire `sheet` param into ProblemsPage).
- [ ] Audit aptitude module for consistency with the new design system.

### Phase 5 — Contest
- [ ] Build the Contests feature (currently ComingSoon) or remove the nav item.

### Phase 6 — Mock Interview
- [ ] Build the Mock Interviews feature (currently ComingSoon) or remove the CTA.

### Phase 7 — Leaderboard/Networking
- [ ] Make leaderboard table responsive.
- [ ] Build the Network feature (currently ComingSoon) or remove the nav item.
- [ ] Fix "shared streak" marketing promise (build or remove).

### Phase 8 — Company Dashboard
- [ ] Build the real Company Dashboard (currently a placeholder card with logout).
- [ ] Implement candidate discovery, assessments, interview rooms, pipeline.

### Phase 9 — Admin Dashboard
- [ ] Re-skin the admin console to match the design system (currently a developer tool with raw JSON textareas).
- [ ] Replace raw JSON editors with structured forms.

### Phase 10 — Global UI Polish
- [ ] Build the design-system primitives (Button, Card, StatCard, Badge, Avatar, Tabs, Modal, Dropdown, Tooltip, Toast, Skeleton, EmptyState, ErrorState, PageHeader, SectionHeader, ProgressBar).
- [ ] Unify all three visual identities onto the token system.
- [ ] Enforce the radius/type/spacing scales.
- [ ] Fix accessibility (contrast, focus, aria-labels, remove `window.alert`).
- [ ] Remove all hardcoded hex colors and arbitrary radii.
- [ ] Remove duplicate components (DiffBadge, StatCard, Avatar, initials helpers, ComingSoon/NotBuiltYet).

---

## Appendix: Key Files Referenced

| File | Role |
|------|------|
| `frontend/src/App.jsx` | Root routing + role guards |
| `frontend/src/pages/StudentDashboard.jsx` | Student shell + nested routes |
| `frontend/src/layout/Sidebar.jsx` | Navigation |
| `frontend/src/layout/Topbar.jsx` | Search, streak, points |
| `frontend/src/pages/dashboard/GroupsHub.jsx` | Primary Study Group hub |
| `frontend/src/pages/dashboard/StudyGroupsPage.jsx` | Study Group manage page |
| `frontend/src/pages/dashboard/GroupMembersPage.jsx` | Members page |
| `frontend/src/pages/dashboard/GroupChatPanel.jsx` | Chat widget |
| `frontend/src/pages/dashboard/ProblemDetailPage.jsx` | Code editor + problem |
| `frontend/src/pages/dashboard/ProblemsPage.jsx` | Problem bank |
| `frontend/src/pages/dashboard/SheetsPage.jsx` | DSA sheets |
| `frontend/src/pages/dashboard/Overview.jsx` | Dashboard home |
| `frontend/src/pages/dashboard/SecuritySettings.jsx` | Security page |
| `frontend/src/pages/Home.jsx` | Marketing homepage |
| `frontend/src/pages/AuthPage.jsx` | Login/register |
| `frontend/src/pages/CompanyDashboard.jsx` | Company placeholder |
| `frontend/src/pages/AdminDashboard.jsx` | Admin console |
| `frontend/src/styles/tokens.css` | Design tokens |
| `frontend/src/styles/study-groups.css` | Study group styles |
| `frontend/src/styles/groups-hub.css` | Hub styles |
| `backend/controllers/studyGroupController.js` | Study group API |
| `backend/controllers/dashboardController.js` | Dashboard API |
| `backend/controllers/streakController.js` | Streak API |
| `backend/services/streakService.js` | Streak computation |
| `backend/routes/authRoutes.js` | Auth + sessions API |