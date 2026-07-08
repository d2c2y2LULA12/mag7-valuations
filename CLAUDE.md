# Mag 7 Valuations — Claude Code Instructions

## Stack

- Next.js 14 (App Router) + Tailwind + Framer Motion
- No backend — all data via `yahoo-finance2` npm package inside Next.js API routes
- Deployed on Vercel (free tier), live at mag7valuations.vercel.app
- `pack-opening` is the production/deployed branch — `main` is an older baseline

## Key files

- `app/page.tsx` — root state machine, phases: `pack` → `rolodex` → `detail` → `compare`
  - `PackScene` — foil pack tear-open animation
  - `RolodexScene` — the 7-card grid ("Click a card to dive in")
  - `HomePage` (root `Home` component) — owns `phase`, `selectedCompany`, `compareTarget` state
- `components/TradingCard.tsx` — card rendering, `CompanyLogo`, `HoloCardWrapper` (shared holographic effect used by home cards + detail view)
- `components/StockDetail.tsx` — Overview / Financials / Valuation tabs, plus the Compare flow's local state machine (`idle` → `picking` → `confirm`)
- `components/ComparePage.tsx` — side-by-side 1v1 comparison view with per-stat winner highlighting
- `app/api/stock/[ticker]/route.ts` — main stock data (quoteSummary + fundamentalsTimeSeries)
- `app/api/stock/[ticker]/history/route.ts` — chart history via `yf.chart()`

## Known gotchas

- **Debt/Equity**: Yahoo's `financialData.debtToEquity` field is on the wrong scale (long-term-debt-only, not comparable to a real ratio). Compute D/E from the balance sheet instead: `totalLiabilities / totalEquity`. Lower should score as "good," not higher.
- **AnimatePresence transitions**: exiting elements can stay mounted and interactive (default `pointer-events: auto`) while animating out, blocking clicks/hover on the incoming view until the exit finishes. Watch for `mode="wait"` causing double-fade overlap. When adding new transitions, default to giving exiting elements `pointer-events-none`.
- **Logos** (`CompanyLogo` in `TradingCard.tsx`): MSFT and GOOGL are inline SVG (fast, no network). AMZN is intentionally a local static file — leave it as-is, inlining it as SVG was attempted before and had issues, and it isn't slow anyway. META, AAPL, NVDA, TSLA fetch from `cdn.simpleicons.org` at render time — this is the source of any "logo pops in late" complaints, especially on mobile.
- **RolodexScene** locks to one screen via `h-screen overflow-hidden`. This can be flaky on cold page loads (page briefly scrollable) — if this recurs, check `html`/`body` overflow constraints and consider `h-dvh` instead of `h-screen`.
- **`InfoTip.tsx` popups** (the `?` tooltips used everywhere): position themselves via `getBoundingClientRect()` + `position: fixed`, clamped to viewport width and flipping above/below based on available space. Fixed 2026-07-07 — previously centered with `left: 50%; transform: translateX(-50%)` and a hardcoded 220px width, which ran off-screen for any trigger near the left edge (e.g. the PRICE metric card) on mobile. If adding a new tooltip-style popup anywhere else in the app, reuse this component rather than re-centering with CSS — the viewport-clamping logic doesn't come for free with plain CSS centering.
- **`.fin-table`** (financial statement tables): wrapper uses `overflow-x-auto` (not `overflow-hidden`) with `white-space: nowrap` cells, so extra year columns scroll into view instead of being silently clipped. Fixed 2026-07-07 — `overflow-hidden` + `width: 100%` was cutting off the most recent year (2025) on narrow viewports with no way to reach it. If more columns get added later (e.g. quarterly data), this pattern should keep working, but verify on a 375px viewport since that's the tightest case.

## Product notes

- Footer disclaimer ("research and learning tool," "not investment advice," "data delayed up to 15 min") must stay on all pages — don't remove.
- Compare feature is 1-vs-1 only by design, no persistent/shareable URL (in-session state only).

## Deploy workflow — always do it this way

This repo does NOT auto-deploy from `git push`. To ship a change:
1. Commit on `pack-opening` (the dev/production branch).
2. `git push origin pack-opening`
3. Fast-forward main: `git checkout main && git merge pack-opening --ff-only && git push origin main`
4. `vercel --prod` from the repo root — this is the only thing that actually triggers a real deploy.
5. Verify: check the JSON output for `"readyState": "READY"`, or run `vercel ls` and confirm the top entry is seconds/minutes old. Don't consider work "shipped" just because it was pushed to GitHub.

## Scrapped ideas — don't re-pitch

- **"AI analyst take" / "AI verdict" feature** (LLM-generated prose on the stock detail page and Compare page): planned in detail on 2026-07-07 then scrapped the same day after discussing free-tier tradeoffs. Don't resurrect or re-propose this unless Donovan brings it up again.
