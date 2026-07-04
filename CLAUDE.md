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

## Product notes

- Footer disclaimer ("research and learning tool," "not investment advice," "data delayed up to 15 min") must stay on all pages — don't remove.
- Compare feature is 1-vs-1 only by design, no persistent/shareable URL (in-session state only).
