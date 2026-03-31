# TODOS

## P2: Scheduled Auto-Reports
**What:** BullMQ cron job — weekly snapshot per vehicle, auto-generates PDF report.
**Why:** History accumulates automatically, battery degradation trend becomes real data.
**Pros:** Zero manual work, trend chart in PDFs becomes meaningful after a few weeks.
**Cons:** Needs healthy Tesla token refresh (tokens expire), worker must run 24/7.
**Context:** BullMQ is already installed. Worker is running. Add a `Queue.add(..., { repeat: { cron: '0 9 * * 1' } })` scheduled job. Tokens refresh via `tesla-connection.ts`. Ensure token refresh happens before generating — if token is expired, skip and log.
**Effort:** M (human) → S with CC.
**Priority:** P2
**Depends on:** PDF redesign should be done first (so auto-reports look good from day 1).
