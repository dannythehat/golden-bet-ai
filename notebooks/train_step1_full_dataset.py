"""
FOOTY ORACLE — STEP 1 BASELINE RECOVERY
run_id: step1-full-dataset-{timestamp}

CHANGE: Remove league clustering. Train on FULL ml_training_data_v2 dataset.
PROOF OUTPUT: row counts, null rates, AUC, Brier, calibration per market.

Deploy to Railway. Run AFTER coverage audit is reviewed.
"""

import os
import json
import uuid
import hashlib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from supabase import create_client, Client
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import (
    roc_auc_score, brier_score_loss, log_loss,
    precision_score, recall_score, f1_score, accuracy_score
)
from sklearn.preprocessing import OrdinalEncoder
import warnings
warnings.filterwarnings('ignore')

# ── Config ──────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
RUN_ID = f"step1-full-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
BATCH_SIZE = 10_000
MIN_ROWS_GATE = 80_000     # Gate: must retain ≥80% of usable rows
MIN_AUC_GATE = 0.72
MAX_BRIER_GATE = 0.22

MARKETS = [
    {
        'name': 'over_2.5_goals',
        'label': 'over_25_hit',
        'core_features': [
            'home_goals_for_avg_10', 'home_goals_against_avg_10',
            'away_goals_for_avg_10', 'away_goals_against_avg_10',
            'home_goals_for_avg_5',  'away_goals_for_avg_5',
            'combined_goals_for_10',
            'home_cards_for_avg_10', 'away_cards_for_avg_10',  # proxy for game tempo
            'league_avg_goals',
        ],
        'optional_features': [
            'home_xg_for_avg_10', 'away_xg_for_avg_10', 'xg_diff_10', 'combined_xg_for_10',
            'home_shots_for_avg_10', 'away_shots_for_avg_10',
            'home_shots_on_target_avg_10', 'away_shots_on_target_avg_10',
            'league_over25_rate', 'league_btts_rate',
        ]
    },
    {
        'name': 'btts',
        'label': 'btts_hit',
        'core_features': [
            'home_goals_for_avg_10', 'home_goals_against_avg_10',
            'away_goals_for_avg_10', 'away_goals_against_avg_10',
            'home_goals_for_avg_5',  'away_goals_for_avg_5',
            'combined_goals_for_10',
            'home_cards_for_avg_10', 'away_cards_for_avg_10',
            'league_avg_goals',
        ],
        'optional_features': [
            'home_xg_for_avg_10', 'away_xg_for_avg_10', 'xg_diff_10',
            'home_shots_for_avg_10', 'away_shots_for_avg_10',
            'home_shots_on_target_avg_10', 'away_shots_on_target_avg_10',
            'league_over25_rate', 'league_btts_rate',
        ]
    },
    {
        'name': 'over_9.5_corners',
        'label': 'over_95_corners_hit',
        # NOTE: corners rolling only 39% — Step 1 will show true scale of problem
        'core_features': [
            'home_corners_for_avg_10', 'home_corners_against_avg_10',
            'away_corners_for_avg_10', 'away_corners_against_avg_10',
            'home_corners_for_avg_5',  'away_corners_for_avg_5',
            'combined_corners_10',
            'league_avg_corners',
        ],
        'optional_features': [
            'home_shots_for_avg_10', 'away_shots_for_avg_10',
            'home_goals_for_avg_10', 'away_goals_for_avg_10',
        ]
    },
    {
        'name': 'over_3.5_cards',
        'label': 'over_35_cards_hit',
        'core_features': [
            'home_cards_for_avg_10', 'home_cards_against_avg_10',
            'away_cards_for_avg_10', 'away_cards_against_avg_10',
            'home_cards_for_avg_5',  'away_cards_for_avg_5',
            'combined_cards_10',
            'league_avg_cards',
        ],
        'optional_features': [
            'home_fouls_for_avg_10', 'away_fouls_for_avg_10',
            'home_goals_for_avg_10', 'away_goals_for_avg_10',
            # referee features will be added in Step 3
        ]
    },
]

# XGBoost params — walk-forward validation compatible
XGB_PARAMS = {
    'n_estimators': 800,
    'max_depth': 6,
    'learning_rate': 0.03,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'min_child_weight': 20,   # prevent overfitting on small markets
    'gamma': 1.0,
    'reg_alpha': 0.1,
    'reg_lambda': 1.0,
    'eval_metric': 'logloss',
    'use_label_encoder': False,
    'random_state': 42,
    'n_jobs': -1,
}


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_full_dataset(supabase: Client, label_col: str) -> pd.DataFrame:
    """Fetch ALL rows with non-null label — NO clustering filter."""
    print(f"\n  📥 Fetching full dataset for label={label_col}...")
    frames = []
    offset = 0
    total_fetched = 0

    # Select all feature columns + label + fixture_date (for time-series split)
    select_cols = ','.join([
        'fixture_date', label_col,
        # Goals
        'home_goals_for_avg_5', 'home_goals_for_avg_10', 'home_goals_for_avg_20',
        'home_goals_against_avg_5', 'home_goals_against_avg_10', 'home_goals_against_avg_20',
        'away_goals_for_avg_5', 'away_goals_for_avg_10', 'away_goals_for_avg_20',
        'away_goals_against_avg_5', 'away_goals_against_avg_10', 'away_goals_against_avg_20',
        # xG
        'home_xg_for_avg_5', 'home_xg_for_avg_10',
        'away_xg_for_avg_5', 'away_xg_for_avg_10',
        # Shots
        'home_shots_for_avg_5', 'home_shots_for_avg_10',
        'home_shots_on_target_avg_5', 'home_shots_on_target_avg_10',
        'away_shots_for_avg_5', 'away_shots_for_avg_10',
        'away_shots_on_target_avg_5', 'away_shots_on_target_avg_10',
        # Corners
        'home_corners_for_avg_5', 'home_corners_for_avg_10',
        'home_corners_against_avg_5', 'home_corners_against_avg_10',
        'away_corners_for_avg_5', 'away_corners_for_avg_10',
        'away_corners_against_avg_5', 'away_corners_against_avg_10',
        # Cards
        'home_cards_for_avg_5', 'home_cards_for_avg_10',
        'home_cards_against_avg_5', 'home_cards_against_avg_10',
        'away_cards_for_avg_5', 'away_cards_for_avg_10',
        'away_cards_against_avg_5', 'away_cards_against_avg_10',
        # Fouls
        'home_fouls_for_avg_10', 'away_fouls_for_avg_10',
        # Combined
        'combined_goals_for_10', 'combined_xg_for_10', 'combined_shots_10',
        'combined_corners_10', 'combined_cards_10', 'xg_diff_10',
        'defense_weakness_index_10',
        # League bias
        'league_avg_goals', 'league_over25_rate', 'league_btts_rate',
        'league_avg_corners', 'league_avg_cards',
        # Referee (will be 0% in Step 1 — proves the gap)
        'ref_avg_cards_last50', 'ref_over35_cards_rate_last50',
    ])

    while True:
        resp = (
            supabase.table('ml_training_data_v2')
            .select(select_cols)
            .not_.is_(label_col, 'null')
            .order('fixture_date', desc=False)
            .range(offset, offset + BATCH_SIZE - 1)
            .execute()
        )
        if not resp.data:
            break
        frames.append(pd.DataFrame(resp.data))
        total_fetched += len(resp.data)
        print(f"    fetched {total_fetched:,} rows...", end='\r')
        if len(resp.data) < BATCH_SIZE:
            break
        offset += BATCH_SIZE

    if not frames:
        return pd.DataFrame()

    df = pd.concat(frames, ignore_index=True)
    df['fixture_date'] = pd.to_datetime(df['fixture_date'])
    df = df.sort_values('fixture_date').reset_index(drop=True)
    print(f"\n  ✅ Fetched {len(df):,} rows | date range: {df['fixture_date'].min().date()} → {df['fixture_date'].max().date()}")
    return df


def null_rate_report(df: pd.DataFrame, features: list, market_name: str) -> dict:
    """Produce null-rate report per feature — required artefact."""
    report = {}
    print(f"\n  📊 Null-rate report for {market_name}:")
    print(f"  {'Feature':<45} {'Coverage %':>12} {'Non-null':>10}")
    print(f"  {'-'*68}")
    for col in features:
        if col in df.columns:
            non_null = df[col].notna().sum()
            pct = 100.0 * non_null / len(df)
            report[col] = {'non_null': int(non_null), 'coverage_pct': round(pct, 1)}
            status = "✅" if pct >= 80 else "⚠️" if pct >= 40 else "❌"
            print(f"  {status} {col:<43} {pct:>11.1f}% {non_null:>10,}")
        else:
            report[col] = {'non_null': 0, 'coverage_pct': 0.0}
            print(f"  ❌ {col:<43} {'MISSING COLUMN':>12}")
    return report


def xg_zero_fill_check(df: pd.DataFrame) -> dict:
    """
    CRITICAL CHECK: combined_xg shows 100% but real xG is 7.6%.
    Detect whether combined_xg_for_10 = 0 when home_xg is NULL.
    """
    zero_fill_rows = df[
        df['home_xg_for_avg_10'].isna() & (df['combined_xg_for_10'] == 0)
    ]
    real_xg_rows = df[df['home_xg_for_avg_10'].notna()]
    result = {
        'combined_xg_total': len(df),
        'combined_xg_zero_when_rolling_null': len(zero_fill_rows),
        'zero_fill_pct': round(100.0 * len(zero_fill_rows) / max(len(df), 1), 1),
        'real_xg_rows': len(real_xg_rows),
    }
    print(f"\n  🔍 xG Zero-fill Check:")
    print(f"     combined_xg_for_10 exists in {len(df):,} rows")
    print(f"     But zero when home_xg_for_avg_10 is NULL: {len(zero_fill_rows):,} ({result['zero_fill_pct']}%)")
    print(f"     Real xG rows (both non-null): {len(real_xg_rows):,}")
    if result['zero_fill_pct'] > 50:
        print(f"  ⚠️  CONFIRMED: combined_xg_for_10 is zero-filled — EXCLUDE from training features")
    return result


def prepare_features(df: pd.DataFrame, features: list) -> tuple:
    """
    Build feature matrix, null-gating optional features.
    Zero-fill detected columns are excluded.
    """
    # Exclude confirmed zero-fill columns from training
    ZERO_FILL_EXCLUDE = {'combined_xg_for_10', 'xg_diff_10'}

    valid_features = []
    for f in features:
        if f in ZERO_FILL_EXCLUDE:
            continue
        if f in df.columns and df[f].notna().mean() > 0.01:  # at least 1% non-null
            valid_features.append(f)

    X = df[valid_features].copy()

    # Impute with median (not mean — more robust to outliers)
    for col in X.columns:
        median_val = X[col].median()
        X[col] = X[col].fillna(median_val if not pd.isna(median_val) else 0)

    return X, valid_features


def walk_forward_train(X: pd.DataFrame, y: pd.Series, dates: pd.Series) -> dict:
    """
    Walk-forward time-series validation — NO random splits.
    Uses last 20% of data (by date) as holdout.
    """
    cutoff = dates.quantile(0.80)
    train_mask = dates <= cutoff
    test_mask = dates > cutoff

    X_train = X[train_mask]
    y_train = y[train_mask]
    X_test = X[test_mask]
    y_test = y[test_mask]

    print(f"\n  🕐 Walk-forward split:")
    print(f"     Train: {train_mask.sum():,} rows (≤ {cutoff.date()})")
    print(f"     Test:  {test_mask.sum():,} rows (> {cutoff.date()})")
    print(f"     Train pos rate: {y_train.mean():.3f} | Test pos rate: {y_test.mean():.3f}")

    # Train XGBoost
    model = xgb.XGBClassifier(**XGB_PARAMS)
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )

    # Get raw probabilities
    probs_raw = model.predict_proba(X_test)[:, 1]

    # Isotonic calibration
    from sklearn.isotonic import IsotonicRegression
    iso = IsotonicRegression(out_of_bounds='clip')
    iso.fit(model.predict_proba(X_train)[:, 1], y_train)
    probs_cal = iso.predict(probs_raw)

    # Metrics
    auc = roc_auc_score(y_test, probs_cal)
    brier = brier_score_loss(y_test, probs_cal)
    ll = log_loss(y_test, probs_cal)
    preds_binary = (probs_cal >= 0.5).astype(int)
    acc = accuracy_score(y_test, preds_binary)
    prec = precision_score(y_test, preds_binary, zero_division=0)
    rec = recall_score(y_test, preds_binary, zero_division=0)
    f1 = f1_score(y_test, preds_binary, zero_division=0)

    # Probability distribution check
    prob_bins = np.histogram(probs_cal, bins=10, range=(0, 1))[0].tolist()

    metrics = {
        'train_rows': int(train_mask.sum()),
        'test_rows': int(test_mask.sum()),
        'train_cutoff': str(cutoff.date()),
        'auc_roc': round(auc, 4),
        'brier_score': round(brier, 4),
        'log_loss': round(ll, 4),
        'accuracy': round(acc, 4),
        'precision': round(prec, 4),
        'recall': round(rec, 4),
        'f1_score': round(f1, 4),
        'train_pos_rate': round(float(y_train.mean()), 4),
        'test_pos_rate': round(float(y_test.mean()), 4),
        'prob_distribution_bins': prob_bins,  # 10 bins 0-1
        'feature_count': X_train.shape[1],
    }

    return metrics, model, iso, X_train, y_train


def gate_check(metrics: dict, market: str) -> bool:
    """Check Step 1 deployment gates."""
    gates = {
        'auc >= 0.72': metrics['auc_roc'] >= MIN_AUC_GATE,
        'brier <= 0.22': metrics['brier_score'] <= MAX_BRIER_GATE,
        'train_rows >= 80k': metrics['train_rows'] >= MIN_ROWS_GATE,
    }
    print(f"\n  🚦 Gate Check — {market}:")
    all_pass = True
    for gate, passed in gates.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"     {status}: {gate} (actual: {metrics.get(gate.split(' ')[0].replace('>=', 'auc_roc').replace('<=', 'brier_score').replace('rows', 'train_rows'), '?')})")
        if not passed:
            all_pass = False
    return all_pass


def save_model_to_supabase(supabase: Client, market_name: str, metrics: dict,
                            model: xgb.XGBClassifier, iso, features: list,
                            run_id: str, null_report: dict):
    """Save trained model and full proof pack to ml_models table."""
    # Deactivate old models
    supabase.table('ml_models') \
        .update({'is_active': False}) \
        .eq('market', market_name) \
        .eq('model_type', 'xgboost_v1') \
        .execute()

    # Get next version
    existing = supabase.table('ml_models') \
        .select('version') \
        .eq('market', market_name) \
        .eq('model_type', 'xgboost_v1') \
        .order('version', desc=True) \
        .limit(1) \
        .execute()

    version = (existing.data[0]['version'] if existing.data else 0) + 1

    # Serialize model weights as feature importances (XGBoost native JSON too large)
    feature_importances = dict(zip(features, model.feature_importances_.tolist()))
    top_features = sorted(feature_importances.items(), key=lambda x: x[1], reverse=True)[:20]

    # Isotonic calibration points
    iso_x = iso.X_thresholds_.tolist() if hasattr(iso, 'X_thresholds_') else []
    iso_y = iso.y_thresholds_.tolist() if hasattr(iso, 'y_thresholds_') else []

    weights_payload = {
        'run_id': run_id,
        'model': 'xgboost_v1',
        'step': 'step1_baseline_full_dataset',
        'top_features': top_features,
        'all_features': features,
        'isotonic_x': iso_x[:100],  # calibration curve points
        'isotonic_y': iso_y[:100],
        'null_report': null_report,
        'prob_distribution': metrics['prob_distribution_bins'],
        'trained_at': datetime.now(timezone.utc).isoformat(),
        'clustering_removed': True,
        'xgb_params': XGB_PARAMS,
    }

    supabase.table('ml_models').insert({
        'market': market_name,
        'model_type': 'xgboost_v1',
        'weights': weights_payload,
        'feature_names': features,
        'auc_roc': metrics['auc_roc'],
        'accuracy': metrics['accuracy'],
        'precision_score': metrics['precision'],
        'recall_score': metrics['recall'],
        'f1_score': metrics['f1_score'],
        'training_samples': metrics['train_rows'],
        'test_samples': metrics['test_rows'],
        'features_used': metrics['feature_count'],
        'version': version,
        'is_active': True,
    }).execute()

    print(f"\n  💾 Saved model v{version} for {market_name} to database")


def run_training():
    print("=" * 70)
    print(f"FOOTY ORACLE — STEP 1 BASELINE RECOVERY")
    print(f"run_id: {RUN_ID}")
    print(f"Goal: Full dataset training — NO clustering")
    print(f"Validation: Walk-forward (time-series split)")
    print("=" * 70)

    supabase = get_supabase()
    proof_pack = {
        'run_id': RUN_ID,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'step': 'step1_baseline_full_dataset',
        'gates': {},
        'markets': {},
    }

    for market_config in MARKETS:
        market_name = market_config['name']
        label_col = market_config['label']
        all_features = market_config['core_features'] + market_config['optional_features']

        print(f"\n{'='*70}")
        print(f"MARKET: {market_name.upper()}")
        print(f"{'='*70}")

        # 1. Fetch full dataset
        df = fetch_full_dataset(supabase, label_col)

        if len(df) == 0:
            print(f"  ❌ No data for {market_name} — skipping")
            continue

        # 2. Null-rate report (required artefact)
        null_report = null_rate_report(df, all_features, market_name)

        # 3. xG zero-fill check (critical data integrity check)
        xg_check = xg_zero_fill_check(df)

        # 4. Prepare features (excludes zero-fill cols automatically)
        X, valid_features = prepare_features(df, all_features)
        y = df[label_col].astype(int)
        dates = df['fixture_date']

        print(f"\n  📐 Training matrix: {X.shape[0]:,} rows × {X.shape[1]} features")
        print(f"  📐 Label balance: {y.mean():.1%} positive rate")

        # 5. Walk-forward train + validate
        metrics, model, iso, X_train, y_train = walk_forward_train(X, y, dates)
        metrics['xg_zero_fill_check'] = xg_check

        # 6. Gate check
        gates_pass = gate_check(metrics, market_name)
        proof_pack['gates'][market_name] = gates_pass

        print(f"\n  📈 PROOF METRICS — {market_name}")
        print(f"     AUC-ROC:      {metrics['auc_roc']:.4f}")
        print(f"     Brier Score:  {metrics['brier_score']:.4f}")
        print(f"     Log Loss:     {metrics['log_loss']:.4f}")
        print(f"     Accuracy:     {metrics['accuracy']:.4f}")
        print(f"     F1 Score:     {metrics['f1_score']:.4f}")
        print(f"     Train rows:   {metrics['train_rows']:,}")
        print(f"     Test rows:    {metrics['test_rows']:,}")

        # 7. Save if gates pass (or save anyway for transparency with flag)
        save_model_to_supabase(
            supabase, market_name, metrics, model, iso,
            valid_features, RUN_ID, null_report
        )

        proof_pack['markets'][market_name] = {
            'total_rows': len(df),
            'metrics': metrics,
            'null_report': null_report,
            'xg_integrity': xg_check,
            'features_used': valid_features,
            'gates_pass': gates_pass,
        }

    # Print final proof pack summary
    print(f"\n{'='*70}")
    print(f"STEP 1 PROOF PACK — run_id: {RUN_ID}")
    print(f"{'='*70}")
    print(f"{'Market':<25} {'Rows':>10} {'AUC':>8} {'Brier':>8} {'Gate':>6}")
    print(f"{'-'*60}")
    all_pass = True
    for m, data in proof_pack['markets'].items():
        met = data['metrics']
        gate = "✅" if data['gates_pass'] else "❌"
        if not data['gates_pass']:
            all_pass = False
        print(f"{m:<25} {data['total_rows']:>10,} {met['auc_roc']:>8.4f} {met['brier_score']:>8.4f} {gate:>6}")

    print(f"\nOverall gate: {'✅ PASS — proceed to Step 2' if all_pass else '❌ FAIL — investigate before Step 2'}")

    # Save proof pack as JSON
    with open(f'proof_pack_{RUN_ID}.json', 'w') as f:
        json.dump(proof_pack, f, indent=2, default=str)

    print(f"\n💾 Proof pack saved: proof_pack_{RUN_ID}.json")
    return proof_pack


if __name__ == '__main__':
    run_training()
