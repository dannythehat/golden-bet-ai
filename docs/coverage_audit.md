# Footy Oracle — Data Coverage Audit
**run_id:** `coverage-audit-2026-02-18`  
**dataset:** `ml_training_data_v2`  
**total_rows:** 285,506  
**audit_date:** 2026-02-18

---

## 1. Feature Group Coverage (Global)

| Feature Group | Sub-feature | Coverage % | Source | Backfill Possible? | Daily Maintainable? |
|---|---|---|---|---|---|
| **Corners** | Team rolling L10 (home_corners_for_avg_10) | 39.0% | API-Football / derived | ⚠️ Partial | ✅ Yes |
| **Corners** | Combined corners (combined_corners_10) | 100.0% | Derived | ✅ Yes | ✅ Yes |
| **Corners** | Match total (total_corners) | 11.6% | API-Football | ⚠️ Partial | ✅ Yes |
| **Cards** | Team rolling L10 (home_cards_for_avg_10) | 99.1% | API-Football / derived | ✅ Yes | ✅ Yes |
| **Cards** | Combined cards (combined_cards_10) | 100.0% | Derived | ✅ Yes | ✅ Yes |
| **Cards** | Match total (total_cards) | 11.6% | API-Football | ⚠️ Partial | ✅ Yes |
| **Referee** | referee_name | 0.0% | API-Football | ❌ Not backfilled | ⚠️ Needs work |
| **Referee** | ref_avg_cards_last50 | 0.0% | Derived from API | ❌ Not backfilled | ⚠️ Needs work |
| **Referee** | ref_over35_cards_rate_last50 | 0.0% | Derived from API | ❌ Not backfilled | ⚠️ Needs work |
| **xG** | Home/Away rolling xG (avg_10) | 7.6% | API-Football | ⚠️ Sparse | ⚠️ API-dependent |
| **xG** | Combined xG (combined_xg_for_10) | 100.0% | Derived (WARNING: see note) | ✅ Yes | ✅ Yes |
| **xG** | xg_diff_10 | 100.0% | Derived (WARNING: see note) | ✅ Yes | ✅ Yes |
| **Shots / SOT** | Team rolling shots L10 | 37.6% | API-Football | ⚠️ Partial | ✅ Yes |
| **Shots / SOT** | Team rolling SOT L10 | 37.8% | API-Football | ⚠️ Partial | ✅ Yes |
| **Shots / SOT** | Combined shots (combined_shots_10) | 100.0% | Derived | ✅ Yes | ✅ Yes |
| **League Bias** | league_avg_goals | 99.7% | league_rolling_stats | ✅ Yes | ✅ Yes |
| **League Bias** | league_avg_corners | 39.5% | league_rolling_stats | ⚠️ Partial | ✅ Yes |
| **League Bias** | league_avg_cards | 39.5% | league_rolling_stats | ⚠️ Partial | ✅ Yes |
| **Weather** | temperature / wind | 0.0% (in v2) | OpenWeather API | ❌ Not linked | ⚠️ match_intelligence only |
| **Lineups / Injuries** | Injury counts | 74.0% (match_intelligence) | API-Football | ⚠️ Forward-only | ⚠️ match_intelligence only |
| **Odds snapshots** | odds_over25, odds_btts | 0.0% (v2), 0.0% (SM) | Not ingested | ❌ Missing | ⚠️ Needs integration |

> ⚠️ **WARNING — combined_xg_for_10 / xg_diff_10 = 100% is a RED FLAG**  
> These derived columns show 100% coverage but underlying rolling xG (home_xg_for_avg_10) is only 7.6%.  
> This almost certainly means derived fields are defaulting to 0 rather than NULL when xG is missing.  
> **These features should be treated as 7.6% real coverage — do NOT use in training without null-gate.**

---

## 2. Coverage by League Tier

| Tier | Rows | Leagues | Corners % | Cards % | Referee % | Ref Stats % | xG % | Shots % | League Bias % | Labels % |
|---|---|---|---|---|---|---|---|---|---|---|
| Top 10 | 52,616 | 10 | 41.6% | 99.7% | 0.0% | 0.0% | 13.5% | 41.4% | 99.9% | 100.0% |
| Rest | 232,890 | 245 | 38.4% | 98.9% | 0.0% | 0.0% | 6.3% | 36.8% | 99.6% | 100.0% |

**Key finding:** Referee coverage is 0% across ALL tiers. xG is 2x better in Top 10 but still critically sparse at 13.5%.

---

## 3. Coverage by Season

| Season | Rows | Corners % | Cards % | Referee % | Ref Stats % | xG % | Shots % | Labels % |
|---|---|---|---|---|---|---|---|---|
| 2026 | 1,989 | 44.0% | 73.4% | 0.0% | 0.0% | 35.1% | 43.0% | 100.0% |
| 2025 | 24,682 | 57.3% | 99.7% | 0.0% | 0.0% | 36.1% | 55.6% | 100.0% |
| 2024 | 24,152 | 59.8% | 99.7% | 0.0% | 0.0% | 30.8% | 58.4% | 100.0% |
| 2023 | 24,776 | 60.3% | 99.7% | 0.0% | 0.0% | 18.7% | 58.1% | 100.0% |
| 2022 | 24,282 | 55.1% | 99.6% | 0.0% | 0.0% | 0.0% | 52.6% | 100.0% |

**Key finding:** xG coverage only exists from 2023 onward. 2022 and earlier = 0% xG — API-Football does not provide historical xG for older seasons.

---

## 4. SportMonks Feature Table Audit

| Feature | Coverage % | Notes |
|---|---|---|
| xG rolling L10 | 11.2% | Only 1,041 rows total — very limited window (Jan–Feb 2025) |
| Corners L10 | 26.4% | Very sparse |
| Cards L10 | 35.5% | Partial |
| Shots L10 | 25.9% | Sparse |
| Odds (over2.5, BTTS) | 0.0% | Not populated |
| League bias | 100.0% | ✅ Good |
| Labeled rows | 1,041 | 14-day window only — NOT a training-ready dataset |

**Verdict:** SportMonks table is a prototype only (1,041 rows, 14-day window). Do NOT use for training.

---

## 5. Match Intelligence Coverage

| Feature | Coverage % | Notes |
|---|---|---|
| referee_name | 26.0% | Forward-looking only (Jan 2026+) |
| ref_avg_cards | 0.0% | Not populated |
| ref_avg_fouls | 0.0% | Not populated |
| Weather (temp/wind) | 0.0% | Not populated |
| Injuries | 74.0% | Has data but not joined to training table |
| Manager info | 96.9% | Has data but not joined to training table |
| Risk scores | 80.3% | Computed but not in training features |

---

## 6. Top 5 Missing Join Keys (Blocking Model Improvement)

| Rank | Missing Key | Impact | Rows Affected | Fix Effort |
|---|---|---|---|---|
| 🔴 1 | **referee_id / referee_name** | Cards/Corners AUC blocked at 0.50 | 285,506 (100%) | Medium — API-Football `/fixtures?id=X` returns referee field |
| 🔴 2 | **Corners rolling L10** (team-level) | 61% of rows missing — corners model has no signal | 174,158 (61%) | Medium — compute_rolling_stats bug must be fixed |
| 🟠 3 | **xG rolling L10** (team-level) | 92.4% missing — xG features are dummy zeros | 263,805 (92.4%) | Hard — API-Football doesn't backfill xG historically |
| 🟠 4 | **match_intelligence → training join** | Injuries, weather, ref data isolated in separate table, not joined to training | 127 MI rows | Low — add join in feature engineering |
| 🟡 5 | **Odds snapshots** | EV calculation requires bookie odds at time of prediction | 285,506 (100%) | Medium — needs OddsAPI / Pinnacle scrape |

---

## 7. Recommended Backfills — Ranked by Impact

| Priority | Backfill | Expected AUC Gain | Effort | Decision |
|---|---|---|---|---|
| ✅ 1 | **Fix corners rolling stats** (compute_rolling_stats bug) | +0.08–0.15 for corners market | Low | **DO NOW** |
| ✅ 2 | **Referee backfill** via API-Football fixture data | +0.05–0.12 for cards/corners | Medium | **DO — Step 3** |
| ⚠️ 3 | **Join match_intelligence** to training features | +0.02–0.05 | Low | DO after Step 2 |
| ⚠️ 4 | **xG proxy via shots** (shots × avg conversion rate) | +0.03–0.08 | Low | DO as stopgap |
| ❌ 5 | **SportMonks xG backfill** | Unknown — dataset too small to prove | Very High | BLOCKED per audit rules |
| ❌ 6 | **Odds snapshots** | Enables EV but no model improvement | High | Defer to Phase 2 |

---

## 8. Training-Ready Row Counts (Post-Filter)

These are the rows that pass all quality gates per market:

| Market | Filter Criteria | Training-Ready Rows | % of Total |
|---|---|---|---|
| Over 2.5 Goals | over_25_hit NOT NULL + cards_for_avg_10 NOT NULL | **283,164** | 99.2% |
| BTTS | btts_hit NOT NULL + cards_rolling | **283,164** | 99.2% |
| Over 9.5 Corners | over_95_corners_hit NOT NULL + corners_for_avg_10 NOT NULL | **26,538** | 9.3% |
| Over 3.5 Cards | over_35_cards_hit NOT NULL + cards_for_avg_10 NOT NULL | **33,062** | 11.6% |

> ⚠️ **Corners and Cards markets are critically data-starved** — corners at only 26k rows, cards at 33k.  
> This is the primary cause of AUC ~0.50 on those markets.  
> Fix #1 (rolling stats bug) is the single highest-ROI action in this entire plan.

---

## 9. Audit Summary

| Issue | Severity | Status |
|---|---|---|
| Referee stats = 0% coverage | 🔴 Critical | Not started |
| Corners rolling = 39% (bug) | 🔴 Critical | Not started |
| xG rolling = 7.6% real coverage | 🟠 High | Partial — proxy needed |
| Combined xG shows 100% but is likely zero-filled | 🔴 Critical | Must null-gate before training |
| Match intelligence not joined to training | 🟠 High | Not started |
| Odds data = 0% | 🟡 Medium | Deferred |
| SportMonks = 1,041 rows only | 🟠 High | Do NOT use |
| Goals/BTTS labels = 100% | ✅ Good | Production-ready |
| Cards rolling = 99.1% | ✅ Good | Production-ready |
| League bias (goals) = 99.7% | ✅ Good | Production-ready |
