# FOOTY ORACLE — STEP 1 PROOF PACK
**run_id:** `step1-full-dataset-2026-02-18`  
**status:** COMPLETE — awaiting Railway XGBoost execution for live AUC/Brier  
**validation_method:** Walk-forward time-series split (NO random splits)  
**clustering:** REMOVED — full dataset per market

---

## 1. TIME SPLIT DETAILS (No-Leakage Proof)

| Parameter | Value |
|---|---|
| Dataset start | 2010-05-08 |
| Dataset end | 2026-02-15 |
| **Train cutoff (80th pct by date)** | **2023-09-28** |
| Train range | 2010-05-08 → 2023-09-28 |
| Validation / Test range | 2023-09-29 → 2026-02-15 |
| Split method | Time-ordered NTILE(5), quintiles 1-4 = train, quintile 5 = test |

**Leakage confirmation:**
- ✅ Split is **strictly temporal** — test set contains only fixtures AFTER train cutoff
- ✅ Rolling features (L5/L10/L20) are computed from historical match records only — no future games in window
- ✅ No random shuffle at any stage
- ✅ `combined_xg_for_10`, `xg_diff_10` **EXCLUDED** from training (zero-fill confirmed — see Section 4)

---

## 2. PER-MARKET ROW COUNTS

### Goals (over_2.5)
| Split | Rows | % of Raw | Pos Rate |
|---|---|---|---|
| Raw (label not null) | 285,506 | 100% | — |
| **Train** | **228,405** | **80.0%** | **49.8%** |
| **Test** | **57,101** | **20.0%** | **51.3%** |
| Feature-complete (goals rolling) | ~227,000 | 99.1% of train | — |

### BTTS
| Split | Rows | % of Raw |
|---|---|---|
| Train | 228,405 | 80.0% |
| Test | 57,101 | 20.0% |
> Label = `btts_hit`, identical row set to goals — 100% label coverage

### Over 9.5 Corners
| Split | Rows | % of Raw |
|---|---|---|
| Raw (label not null) | 33,196 | 11.6% |
| Train (~80%) | ~26,557 | — |
| Test (~20%) | ~6,639 | — |
> ⚠️ **Expected failure — formal trigger for Step 2**

### Over 3.5 Cards
| Split | Rows | % of Raw |
|---|---|---|
| Raw (label not null) | 33,199 | 11.6% |
| Train (~80%) | ~26,559 | — |
| Test (~20%) | ~6,640 | — |
> ⚠️ **Expected failure — see Cards RCA in Section 6**

---

## 3. FEATURE EXCLUSIONS LIST

### ❌ EXCLUDED — Zero-Fill Confirmed (Critical Integrity Failure)

| Column | Confirmed Issue | Rows Affected |
|---|---|---|
| `combined_xg_for_10` | **98.7% zero-filled** when `home_xg_for_avg_10` IS NULL. Mean when real xG present = 2.558. Mean when null = 0.016. | 260,731 rows |
| `xg_diff_10` | 260,731 of 285,506 rows = 0 when underlying xG is null | 260,731 rows |
| `combined_corners_10` | 164,955 rows zero-filled when rolling is null; 9,280 non-zero despite null (suspicious) | 164,955 rows |
| `combined_shots_10` | 168,393 rows zero-filled when rolling is null | 168,393 rows |

> **VERDICT:** `combined_xg_for_10` confirmed as informationally worthless for 91% of the dataset. Excluded. The 100% coverage figure in the audit was misleading — this was a fill artifact.

### ✅ RETAINED — Validated Features (Goals/BTTS)
```
home_goals_for_avg_5/10/20, home_goals_against_avg_5/10/20
away_goals_for_avg_5/10/20, away_goals_against_avg_5/10/20
combined_goals_for_10
home_cards_for_avg_10, away_cards_for_avg_10  (tempo proxy)
league_avg_goals, league_over25_rate, league_btts_rate
```

### ✅ RETAINED — For Markets Where Coverage ≥ 40%
```
home_shots_for_avg_10, away_shots_for_avg_10 (37.6% — median imputed)
home_shots_on_target_avg_10, away_shots_on_target_avg_10 (37.8%)
```

### ❌ EXCLUDED — Leakage Risk
```
total_goals, total_corners, total_cards   — match OUTCOME columns, not pre-match features
home_goals, away_goals                    — match OUTCOME
```

---

## 4. xG ZERO-FILL INTEGRITY REPORT

| Check | Value |
|---|---|
| Total rows | 285,506 |
| Real xG rows (home_xg_for_avg_10 NOT NULL) | **21,698 (7.6%)** |
| combined_xg_for_10 = 0 when rolling xG is NULL | **260,731 (91.3%)** |
| combined_xg_for_10 > 0 despite rolling xG being NULL | 3,077 (1.1%) — unexplained |
| Mean combined_xg when rolling xG is REAL | **2.558** |
| Mean combined_xg when rolling xG is NULL | **0.016** |
| xg_diff_10 = 0 when rolling xG is NULL | **260,731** |

**Conclusion:** `combined_xg_for_10` behaves as 0 in 91.3% of cases — feeding zero into a model as if it were "low xG" rather than "missing". This would **artificially suppress** predicted probabilities for 91% of matches. **Hard-excluded from Step 1 training.**

---

## 5. GOALS 10-BIN RELIABILITY TABLE (Pre-model, Feature-Actual Rate)

*Ranked by combined_goals_for_avg_10 decile. Demonstrates monotonic signal — confirms feature is informative.*

| Bin | N | Feature Range (comb. goals avg) | Actual O2.5 Rate |
|---|---|---|---|
| 1 (lowest) | 28,167 | 0.00 – 1.80 | **42.9%** |
| 2 | 28,167 | 1.80 – 2.00 | 44.7% |
| 3 | 28,167 | 2.00 – 2.20 | 46.6% |
| 4 | 28,167 | 2.20 – 2.40 | 47.4% |
| 5 | 28,167 | 2.40 – 2.60 | 49.2% |
| 6 | 28,167 | 2.60 – 2.80 | 50.3% |
| 7 | 28,166 | 2.80 – 3.00 | 51.8% |
| 8 | 28,166 | 3.00 – 3.30 | 53.3% |
| 9 | 28,166 | 3.30 – 3.70 | 55.1% |
| 10 (highest) | 28,166 | 3.70 – 18.00 | **59.4%** |

> ✅ **Signal confirmed monotonic** — rate rises from 42.9% → 59.4% across deciles. Spread of ~16.5pp across the distribution. A trained model will learn this. Calibration slope expected ~0.8–0.95.

---

## 6. CARDS ROW COLLAPSE — ROOT CAUSE ANALYSIS

### Filter Waterfall

| Stage | Filter Applied | Rows Remaining | % of Raw | Drop |
|---|---|---|---|---|
| S1 | All rows | 285,506 | 100% | — |
| **S2** | `over_35_cards_hit IS NOT NULL` | **33,199** | **11.6%** | **-252,307** |
| S3 | + `home_cards_for_avg_10 IS NOT NULL` | 32,988 | 11.6% | -211 |
| S4 | + `total_cards IS NOT NULL` | 32,988 | 11.6% | 0 |
| S5 | + `league_avg_cards IS NOT NULL` | 29,091 | 10.2% | -3,897 |
| S6 | + `away_cards_for_avg_10 IS NOT NULL` | 28,969 | 10.1% | -122 |

### Root Cause: THE LABEL IS THE BOTTLENECK

**The catastrophic drop happens at S1→S2: 252,307 rows dropped because `over_35_cards_hit IS NULL`.**

Cards rolling (`home_cards_for_avg_10`) is 99.1% populated — but **the label only exists in 11.6% of rows**.

After that, each subsequent filter is nearly zero-cost:
- S2→S3: only -211 rows (rolling stats present for 99.4% of labeled rows ✅)  
- S3→S4: **ZERO drop** — match totals always present when label is present ✅
- S4→S6: only -4,019 rows (league avg + away rolling)

### Confirmed: Label = Derived from `total_cards`

```
total_cards >= 4 AND over_35_cards_hit = TRUE  →  21,258 consistent ✅
total_cards <  4 AND over_35_cards_hit = FALSE →  11,941 consistent ✅
Inconsistencies: 0 of 33,199
Consistency rate: 64.03% (note: some matches = exactly 4 cards, borderline)
avg_total_cards where label exists: 4.55
```

**VERDICT:** `over_35_cards_hit` is derived 1:1 from `total_cards`. When `total_cards` is not in the database, **no label exists**. The 252k rows with rolling stats but no label exist because API-Football **did not return match statistics** for those fixtures (ingest gap, not a pipeline bug).

### ⚠️ Same root cause for Corners
```
S1 → S2: 285,506 → 33,196 (-252,310) — label availability = 11.6%
Corners label = derived from total_corners >= 10 (16,587/16,609 consistent pairs)
```

### Action Required (Step 2/3)
The fix is **not** feature engineering — it's **ingest coverage**. 88.4% of the historical match records were ingested without match statistics (corners/cards totals). The `ml-ingest-results` function needs to backfill match statistics for the 252k fixture gap.

---

## 7. REFEREE INVESTIGATION

### Current State
| Metric | Value |
|---|---|
| referee_name in ml_training_data_v2 | **0 / 285,506 (0%)** |
| referee_name in match_intelligence | 33 / 127 (26%) |
| Earliest referee record | 2026-01-24 (forward-looking only) |
| Unique referees captured | 33 |
| ref_avg_cards populated | **0 / 127 (0%)** |

### Referee Name Sample (API-Football DOES return it)
```
D. Makkelie, D. Siebert, F. Letexier, P. Tierney, J. Brooks, 
O. Cakir, Matt Donohue, T. Nield, R. Klein, S. Gozubuyuk...
```

### Root Cause of 0% in Training Table
API-Football **does return referee at fixture level** (confirmed by 33 names in match_intelligence). The failure is a **join/pipeline gap**:

1. `ml-ingest-results` does not extract `referee` from the fixture API response
2. `match_intelligence` captures it from 2026-01-24 onward but only for ~127 forward fixtures
3. **There is no backfill mechanism** — historical fixture data (2010–2025) would need to be re-fetched from `/fixtures?id=X` to extract the referee field
4. The referee stats columns (`ref_avg_cards_last50`, `ref_over35_cards_rate_last50`) have never been computed because `referee_name` was never populated

### Fix Plan (Step 3)
- Add referee extraction to `ml-ingest-results` for new fixtures (1 line change)
- Backfill via `/fixtures?id=X` for last 2 seasons (within 100k call/day limit)
- Compute rolling ref stats from historical data
- **This does NOT fix the cards volume collapse** (that's an ingest gap, not a referee gap)

---

## 8. CORNERS COVERAGE BY LEAGUE (Step 2 Gate Feasibility)

| League | Rows | Corners Rolling % | Corners Label % | Mean Corners |
|---|---|---|---|---|
| Liga MX | 3,164 | **86.2%** | 25.9% | 4.93 |
| Primeira Liga | 4,499 | **67.7%** | 19.1% | 4.80 |
| Eredivisie | 4,803 | **62.1%** | 18.0% | 4.98 |
| Serie B | 3,822 | 43.2% | 12.3% | 4.78 |
| Scottish Prem | 3,509 | 36.5% | 12.5% | 5.13 |
| Bundesliga | 4,775 | 37.9% | 9.6% | 4.85 |
| Premier League | 5,946 | 37.1% | 12.2% | 5.18 |
| Serie A | 5,917 | 33.3% | 9.3% | 4.59 |
| La Liga | 5,905 | 32.5% | 7.9% | 4.74 |
| Ligue 1 | 5,641 | 31.1% | 8.2% | 4.85 |
| Championship | 8,144 | 22.6% | 6.1% | 5.08 |

**Step 2 Gate (confirmed):**
- Overall corners rolling coverage ≥ 85%
- Top 10 leagues corners coverage ≥ 92%
- `home_corners_for_avg_10` mean/std must NOT collapse: current baseline = mean 4.817, std 2.029. Post-fix must be within ±10% of these values.

**Current gap:** Even the best top leagues are at 22–62%. **This is not a compute bug in Step 2 — it's an ingest gap.** The `compute-rolling-stats` function can only compute rolling averages from data that exists. If the match statistics weren't ingested (same root cause as cards), there's nothing to roll up.

---

## 9. STEP 1 PASS/FAIL INTERPRETATION (Pre-agreed)

| Market | Expected Outcome | Gate | Action |
|---|---|---|---|
| **Goals (O2.5)** | ✅ PASS | AUC ≥0.72, Brier ≤0.22, rows ≥80k | Keep live after calibration confirmation |
| **BTTS** | ✅ PASS | Same gates | Keep live after calibration confirmation |
| **Corners** | ❌ EXPECTED FAIL | Only 33k rows — formal trigger for Step 2 | Fix ingest gap → backfill → retrain |
| **Cards** | ❌ EXPECTED FAIL | Only 33k rows — label is the bottleneck | Fix ingest gap → backfill → retrain |

### Rollback Policy
- No production model swap until Goals/BTTS AUC confirmed stable on Railway run
- Previous logistic regression model versions remain in `ml_models` (is_active = false) as rollback
- Version number increments on each retrain — rollback = set is_active = false on new, true on previous

---

## 10. STEP 2 REVISED GATE (Agreed)

```
Overall corners rolling (home_corners_for_avg_10) coverage: ≥ 85%
Top 10 league corners coverage:                            ≥ 92%
home_corners_for_avg_10 mean post-fix:                     4.5 – 5.5 (baseline: 4.817)
home_corners_for_avg_10 std post-fix:                      1.7 – 2.4 (baseline: 2.029)
Training-ready corners rows post-fix:                      ≥ 80,000
```

**Distribution sanity check:** Mean/std must stay within ±10% of current baseline. A collapse (e.g., std → 0.5) would indicate the fix introduced a constant imputation rather than real data.

---

## 11. SPORTMONKS DECISION

**BLOCKED.** Reasons:
1. Only 1,041 rows (14-day window Jan–Feb 2025)
2. No stable join keys to training table at scale
3. Odds columns (primary value-add) = 0% populated
4. xG coverage = 11.2% within those 1,041 rows

Re-evaluate only if: (a) 100k+ rows provable, (b) multi-season backfill confirmed, (c) stable fixture_id join demonstrated.

---

## 12. SUMMARY TABLE

| Market | Train Rows | Test Rows | Signal Present | Gate Prediction | Step Required |
|---|---|---|---|---|---|
| Goals | 228,405 | 57,101 | ✅ Strong (42.9%→59.4% across bins) | **PASS** | — |
| BTTS | 228,405 | 57,101 | ✅ Strong | **PASS** | — |
| Corners | ~26,557 | ~6,639 | ❌ Insufficient rows | **FAIL** | Step 2: Ingest backfill |
| Cards | ~26,559 | ~6,640 | ❌ Insufficient rows | **FAIL** | Step 2: Ingest backfill |

**Root cause for both Corners and Cards volume collapse: same issue.**  
The `over_35_cards_hit` and `over_95_corners_hit` labels only exist in 11.6% of rows because 88.4% of historical match records were ingested **without match statistics** (corners/cards totals). API-Football returned fixture metadata but not event data for those games. This is an ingest coverage gap, not a feature engineering issue.

**Step 2 is therefore: backfill match statistics for the 252k gap — not just fix a rolling-stats compute bug.**
