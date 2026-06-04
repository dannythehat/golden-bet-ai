# Tier 5 — Monetise the Audience

Three connected builds: upgrade Form Tables, launch a World Cup Specials hub, and put daily picks + Telegram alerts behind a £3/mo paywall. Soft, friendly paywall message: *"Due to growing demand and to keep the lights on, we've added a tiny £3/mo charge for premium picks. Free stuff stays free."*

---

## 1. Free vs Paid — the line in the sand

**Free (lead magnets — drive signups & SEO):**
- Form Tables v2 (full read access)
- Blog: Results recaps, form-table articles, league pages
- Verified P&L history (full transparency stays free — it's our trust signal)
- Homepage Gaffer streak banner
- ACCA of the Day result (yesterday's) — *teases today's locked pick*

**Paid — Gaffer's Inner Circle (£3/mo):**
- Today's 3 Golden Bets (currently free → move behind paywall)
- ACCA Delight & Bet Builder daily picks
- "Why this bet?" Gaffer explainer
- Telegram alerts: 09:30 daily picks + in-play value alerts
- Email digest of daily picks
- World Cup Specials hub (outright, group winners, top scorer, golden boot)
- Alert Preferences (league/market filters)

**Soft paywall pattern**: show the fixture + market name, blur the pick & odds, with a "Unlock for £3/mo" CTA + the friendly message above.

---

## 2. Form Tables v2 (free, upgraded)

Goal: make this the best free form table on the web → SEO + signup driver.

- **New columns**: xG for/against, clean sheet %, BTTS %, avg corners for/against, avg cards, home/away splits toggle
- **Sortable** by any column, sticky team column on mobile
- **"Hot/Cold" badges**: auto-flag teams on 5+ scoring streak, 3+ clean sheets, etc.
- **Gaffer Quick Take**: tiny AI blurb per league ("Arsenal are unplayable at home — 8 wins from 9")
- **Per-team drill-down**: click a team → last 10 fixtures + upcoming + Gaffer notes
- Reuses existing `team_rolling_stats` + `LeaguePage` data; no new ingest needed

---

## 3. World Cup Specials Hub (free article landing, paid for picks)

New route `/world-cup-2026` (or current major tournament):
- Outright winner odds tracker (best price across books, movement chart)
- Group-by-group preview pages (free) — SEO honey
- Top scorer / Golden boot / Golden glove markets
- **Gaffer's Tournament Picks** — locked behind paywall (£3/mo unlocks all)
- Daily tournament recap blog posts during the event
- Auto-update from `odds-api` for the tournament-specific markets

---

## 4. Telegram Alerts (paid tier killer feature)

- Connect Telegram via Lovable connector
- New `telegram_subscribers` table: `user_id`, `chat_id`, `verified_at`, `preferences` (markets, leagues)
- Bot flow: user clicks "Connect Telegram" in app → opens bot → bot sends `/start <user_id>` → webhook verifies & links
- **Cron pushes**:
  - 09:30 — today's Golden Bets + ACCA + Bet Builder
  - In-play value alerts (re-use `gaffer-alerts`)
  - Results recap at 23:00
- Gate behind `is_subscriber = true` check before sending

---

## 5. Payments — £3/mo via Stripe

- Enable `enable_stripe_payments` (built-in, no Stripe account needed to start)
- One product, one price: "Gaffer's Inner Circle — £3/mo"
- `subscribers` table: `user_id`, `stripe_customer_id`, `subscription_status`, `current_period_end`
- Webhook handler for `customer.subscription.*` events
- `useSubscription()` hook → drives paywall blur on all gated components
- "My Subscription" page with cancel/manage link

---

## 6. Build order (recommended)

1. **Stripe + paywall plumbing** (foundation — nothing else gates without it)
2. **Form Tables v2** (free upgrade — broaden top of funnel first)
3. **Paywall the existing daily picks** (with friendly message + 7-day free trial?)
4. **Telegram alerts** (the "must-have" feature that converts free → paid)
5. **World Cup Specials hub** (timed to tournament — biggest traffic spike of the year)

---

## Decisions I need from you

1. **7-day free trial on the £3 plan?** (Recommended — boosts conversion ~2-3x)
2. **Annual price?** e.g. £30/year (saves £6) — adds upfront cash & reduces churn
3. **Grandfather existing users?** Anyone who signed up before launch gets 1 month free
4. **Telegram: one shared channel or per-user DMs?** (DMs = more personal & filterable; channel = simpler & viral)
5. **Which tournament for the Specials hub?** World Cup 2026 is 2 years out — start with Euros / current Champions League knockouts as the MVP?

Ping me with answers (or just say "you pick" again) and I'll start with step 1.
