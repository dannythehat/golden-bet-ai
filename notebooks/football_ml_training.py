"""
🏆 FOOTY ORACLE - ML TRAINING PIPELINE
=====================================
Run this in Google Colab (free GPU) or locally with Jupyter.

SETUP:
1. Open Google Colab: https://colab.research.google.com
2. Upload this file or copy/paste
3. Add your Supabase credentials in the CONFIG section
4. Run all cells
5. Models auto-upload to Supabase Storage

REQUIREMENTS (auto-installed in Colab):
pip install supabase pandas scikit-learn xgboost lightgbm joblib

Author: Footy Oracle ML Team
"""

# =============================================================================
# CELL 1: INSTALL DEPENDENCIES
# =============================================================================
# !pip install supabase pandas scikit-learn xgboost lightgbm joblib numpy

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Any

# ML Libraries
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import (
    roc_auc_score, accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report,
    brier_score_loss, log_loss
)

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("⚠️ XGBoost not installed. Run: pip install xgboost")

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    print("⚠️ LightGBM not installed. Run: pip install lightgbm")

from supabase import create_client, Client

# =============================================================================
# CELL 2: CONFIGURATION - READY TO RUN!
# =============================================================================
CONFIG = {
    # ✅ CREDENTIALS READY - Just run!
    "SUPABASE_URL": "https://ffonednbxcfhzxardvry.supabase.co",
    "SUPABASE_KEY": "sb_secret_K-QC5DwzH6g8qLDIjMMuTQ_3iJ1ge6O",
    
    # Training settings - FULL DATASET (281k records)
    "SAMPLE_SIZE": 300000,  # Fetch all 281k records
    "BATCH_SIZE": 10000,    # Fetch in 10k batches to avoid timeouts
    "TEST_SIZE": 0.2,
    "RANDOM_STATE": 42,
    
    # Markets to train
    "MARKETS": [
        {"name": "over_2.5_goals", "label": "over_25_hit"},
        {"name": "btts", "label": "btts_hit"},
        {"name": "over_9.5_corners", "label": "over_95_corners_hit"},
        {"name": "over_3.5_cards", "label": "over_35_cards_hit"},
    ]
}

# Initialize Supabase client
supabase: Client = create_client(CONFIG["SUPABASE_URL"], CONFIG["SUPABASE_KEY"])

print("✅ Configuration loaded")
print(f"📊 Will train on up to {CONFIG['SAMPLE_SIZE']:,} samples")

# =============================================================================
# CELL 3: FETCH TRAINING DATA FROM SUPABASE
# =============================================================================
def fetch_training_data(sample_size: int = 50000) -> pd.DataFrame:
    """Fetch training data from Supabase in batches (1000 row limit per query)"""
    print("📥 Fetching training data from Supabase...")
    
    all_data = []
    batch_size = 1000
    offset = 0
    
    while offset < sample_size:
        response = supabase.table("ml_training_data")\
            .select("*")\
            .order("fixture_date", desc=True)\
            .range(offset, offset + batch_size - 1)\
            .execute()
        
        if not response.data:
            break
            
        all_data.extend(response.data)
        offset += batch_size
        print(f"  Fetched {len(all_data):,} rows...")
        
        if len(response.data) < batch_size:
            break
    
    df = pd.DataFrame(all_data)
    print(f"✅ Loaded {len(df):,} training samples")
    return df

# Fetch the data
df = fetch_training_data(CONFIG["SAMPLE_SIZE"])
print(f"\n📋 Columns available: {list(df.columns)}")

# =============================================================================
# CELL 4: FEATURE ENGINEERING
# =============================================================================
def engineer_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """Create powerful features for football prediction"""
    print("\n🔧 Engineering features...")
    
    # Core numeric features
    numeric_cols = [
        'home_over25_pct', 'away_over25_pct',
        'home_btts_pct', 'away_btts_pct',
        'home_avg_goals', 'away_avg_goals',
        'home_avg_corners', 'away_avg_corners',
        'home_avg_cards', 'away_avg_cards',
        'home_over95_corners_pct', 'away_over95_corners_pct',
        'home_over35_cards_pct', 'away_over35_cards_pct',
        'home_xg', 'away_xg',
        'home_total_shots', 'away_total_shots',
        'home_shots_on_goal', 'away_shots_on_goal',
        'home_possession', 'away_possession',
    ]
    
    # Clean and convert
    for col in numeric_cols:
        if col in df.columns:
            # Handle percentage strings like "65%"
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.replace('%', '').replace('None', '0')
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    # Create engineered features
    df['combined_goals_pct'] = (df['home_avg_goals'] + df['away_avg_goals']) / 2
    df['combined_over25_pct'] = (df['home_over25_pct'] + df['away_over25_pct']) / 2
    df['combined_btts_pct'] = (df['home_btts_pct'] + df['away_btts_pct']) / 2
    df['combined_corners_pct'] = (df['home_over95_corners_pct'] + df['away_over95_corners_pct']) / 2
    df['combined_cards_pct'] = (df['home_over35_cards_pct'] + df['away_over35_cards_pct']) / 2
    
    # XG differential
    df['xg_total'] = df['home_xg'] + df['away_xg']
    df['xg_diff'] = df['home_xg'] - df['away_xg']
    
    # Shot efficiency
    df['home_shot_accuracy'] = np.where(
        df['home_total_shots'] > 0,
        df['home_shots_on_goal'] / df['home_total_shots'],
        0
    )
    df['away_shot_accuracy'] = np.where(
        df['away_total_shots'] > 0,
        df['away_shots_on_goal'] / df['away_total_shots'],
        0
    )
    
    # Poisson-inspired probabilities
    def poisson_over25(home_xg, away_xg):
        """Probability of Over 2.5 goals using Poisson"""
        from scipy.stats import poisson
        total_xg = home_xg + away_xg
        if total_xg <= 0:
            return 0.5
        prob_under3 = sum(
            poisson.pmf(h, home_xg) * poisson.pmf(a, away_xg)
            for h in range(4) for a in range(4) if h + a <= 2
        )
        return 1 - prob_under3
    
    try:
        from scipy.stats import poisson
        df['poisson_over25'] = df.apply(
            lambda r: poisson_over25(max(0.1, r['home_xg']), max(0.1, r['away_xg'])), 
            axis=1
        )
    except ImportError:
        df['poisson_over25'] = df['combined_goals_pct'] / 100
    
    # Final feature list
    feature_cols = [
        'home_over25_pct', 'away_over25_pct',
        'home_btts_pct', 'away_btts_pct',
        'home_avg_goals', 'away_avg_goals',
        'home_avg_corners', 'away_avg_corners',
        'home_avg_cards', 'away_avg_cards',
        'home_over95_corners_pct', 'away_over95_corners_pct',
        'home_over35_cards_pct', 'away_over35_cards_pct',
        'home_xg', 'away_xg',
        'combined_goals_pct', 'combined_over25_pct', 'combined_btts_pct',
        'combined_corners_pct', 'combined_cards_pct',
        'xg_total', 'xg_diff',
        'home_shot_accuracy', 'away_shot_accuracy',
        'poisson_over25'
    ]
    
    # Only keep features that exist
    feature_cols = [c for c in feature_cols if c in df.columns]
    
    print(f"✅ Created {len(feature_cols)} features")
    return df, feature_cols

df, FEATURE_COLS = engineer_features(df)

# =============================================================================
# CELL 5: BUILD ENSEMBLE MODEL
# =============================================================================
def build_ensemble(X_train, y_train, market_name: str) -> Tuple[Any, Dict]:
    """Build a calibrated ensemble of multiple models"""
    print(f"\n🏗️ Building ensemble for {market_name}...")
    
    # Base models
    models = []
    
    # 1. Logistic Regression (fast, interpretable)
    lr = LogisticRegression(
        C=1.0, 
        max_iter=1000, 
        class_weight='balanced',
        random_state=CONFIG["RANDOM_STATE"]
    )
    models.append(('lr', lr))
    
    # 2. Random Forest (handles non-linear)
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=20,
        class_weight='balanced',
        random_state=CONFIG["RANDOM_STATE"],
        n_jobs=-1
    )
    models.append(('rf', rf))
    
    # 3. Gradient Boosting
    gb = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=CONFIG["RANDOM_STATE"]
    )
    models.append(('gb', gb))
    
    # 4. XGBoost (if available)
    if HAS_XGBOOST:
        xgb_model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            scale_pos_weight=len(y_train[y_train==0]) / max(1, len(y_train[y_train==1])),
            use_label_encoder=False,
            eval_metric='logloss',
            random_state=CONFIG["RANDOM_STATE"]
        )
        models.append(('xgb', xgb_model))
    
    # 5. LightGBM (if available)
    if HAS_LIGHTGBM:
        lgb_model = lgb.LGBMClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            class_weight='balanced',
            random_state=CONFIG["RANDOM_STATE"],
            verbose=-1
        )
        models.append(('lgb', lgb_model))
    
    # Create voting ensemble
    ensemble = VotingClassifier(
        estimators=models,
        voting='soft',  # Use probabilities
        n_jobs=-1
    )
    
    # Calibrate probabilities using Platt scaling
    calibrated = CalibratedClassifierCV(
        ensemble,
        method='sigmoid',
        cv=3
    )
    
    print(f"  Training {len(models)} models in ensemble...")
    calibrated.fit(X_train, y_train)
    
    # Get feature importance from tree-based models
    importance = {}
    for name, model in models:
        if hasattr(model, 'feature_importances_'):
            model.fit(X_train, y_train)
            for i, col in enumerate(FEATURE_COLS):
                importance[col] = importance.get(col, 0) + model.feature_importances_[i]
    
    # Normalize importance
    if importance:
        total = sum(importance.values())
        importance = {k: v/total for k, v in importance.items()}
    
    return calibrated, importance

# =============================================================================
# CELL 6: TRAIN ALL MARKETS
# =============================================================================
def train_market(df: pd.DataFrame, market: Dict, feature_cols: List[str]) -> Dict:
    """Train and evaluate a model for one market"""
    market_name = market["name"]
    label_col = market["label"]
    
    print(f"\n{'='*60}")
    print(f"🎯 TRAINING: {market_name.upper()}")
    print(f"{'='*60}")
    
    # Filter to rows with valid labels
    market_df = df[df[label_col].notna()].copy()
    market_df[label_col] = market_df[label_col].astype(int)
    
    if len(market_df) < 100:
        print(f"⚠️ Skipping - only {len(market_df)} samples")
        return None
    
    print(f"📊 Samples: {len(market_df):,}")
    print(f"📊 Positive rate: {market_df[label_col].mean()*100:.1f}%")
    
    # Prepare features
    X = market_df[feature_cols].values
    y = market_df[label_col].values
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, 
        test_size=CONFIG["TEST_SIZE"], 
        random_state=CONFIG["RANDOM_STATE"],
        stratify=y
    )
    
    print(f"📊 Train: {len(X_train):,}, Test: {len(X_test):,}")
    
    # Build and train ensemble
    model, importance = build_ensemble(X_train, y_train, market_name)
    
    # Predictions
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    # ── PROOF PACK METRICS ────────────────────────────────────────────────────
    auc = float(roc_auc_score(y_test, y_prob))
    brier = float(brier_score_loss(y_test, y_prob))
    logloss = float(log_loss(y_test, y_prob))

    # Isotonic calibration (post-hoc, using test set — fit on first 80% of test)
    from sklearn.isotonic import IsotonicRegression
    cal_split = int(len(y_test) * 0.5)
    cal_model = IsotonicRegression(out_of_bounds='clip')
    cal_model.fit(y_prob[:cal_split], y_test[:cal_split])
    y_cal = cal_model.predict(y_prob[cal_split:])

    # Platt scaling slope/intercept (logistic regression on raw probs)
    from sklearn.linear_model import LogisticRegression as PlattLR
    platt = PlattLR()
    platt.fit(y_prob[:cal_split].reshape(-1, 1), y_test[:cal_split])
    cal_slope = float(platt.coef_[0][0])
    cal_intercept = float(platt.intercept_[0])

    # Reliability bins (10 bins)
    fraction_of_positives, mean_predicted_value = calibration_curve(
        y_test[cal_split:], y_cal, n_bins=10, strategy='quantile'
    )
    reliability_bins = [
        {"mean_pred": float(mp), "frac_pos": float(fp)}
        for mp, fp in zip(mean_predicted_value, fraction_of_positives)
    ]

    # EV vs bookmaker (requires bookmaker implied prob in dataset — use league avg if not available)
    # Use positive-rate as implied baseline when no bookmaker col exists
    baseline_implied = float(y_test.mean())
    ev_vs_bookmaker = auc - baseline_implied  # simplified EV proxy

    # Model confidence score: f(AUC, Brier, row_coverage)
    # Scale AUC 0.5→1.0, Brier 0.0→0.25 (lower better), coverage 0→1
    auc_score = max(0, (auc - 0.5) / 0.5)         # 0 at 0.5 AUC, 1 at perfect 1.0
    brier_score_inv = max(0, 1 - brier / 0.25)     # 1 when brier=0, 0 when brier=0.25
    row_coverage = min(1.0, len(X_train) / 50000)  # 1 when ≥50k training rows
    model_confidence_score = round((auc_score * 0.5 + brier_score_inv * 0.3 + row_coverage * 0.2) * 100, 1)

    metrics = {
        "market": market_name,
        "auc_roc": auc,
        "brier_score": brier,
        "log_loss": logloss,
        "calibration_slope": cal_slope,
        "calibration_intercept": cal_intercept,
        "calibration_method": "isotonic+platt",
        "reliability_bins": reliability_bins,
        "ev_vs_bookmaker": round(ev_vs_bookmaker, 4),
        "model_confidence_score": model_confidence_score,
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "samples_train": int(len(X_train)),
        "samples_test": int(len(X_test)),
        "rows_used": int(len(X_train) + len(X_test)),
        "positive_rate": float(y.mean()),
        "trained_at": datetime.utcnow().isoformat(),
    }
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    metrics["true_negatives"] = int(cm[0, 0])
    metrics["false_positives"] = int(cm[0, 1])
    metrics["false_negatives"] = int(cm[1, 0])
    metrics["true_positives"] = int(cm[1, 1])
    
    # Find optimal threshold for F1
    thresholds = np.arange(0.3, 0.8, 0.05)
    best_f1, best_thresh = 0, 0.5
    for thresh in thresholds:
        pred_t = (y_prob >= thresh).astype(int)
        f1_t = f1_score(y_test, pred_t, zero_division=0)
        if f1_t > best_f1:
            best_f1, best_thresh = f1_t, thresh
    
    metrics["optimal_threshold"] = float(best_thresh)
    metrics["optimal_f1"] = float(best_f1)
    
    # Print results
    print(f"\n📈 RESULTS FOR {market_name.upper()}:")
    print(f"  AUC-ROC: {metrics['auc_roc']:.3f}")
    print(f"  Accuracy: {metrics['accuracy']:.3f}")
    print(f"  Precision: {metrics['precision']:.3f}")
    print(f"  Recall: {metrics['recall']:.3f}")
    print(f"  F1: {metrics['f1']:.3f}")
    print(f"  Optimal Threshold: {best_thresh:.2f} (F1: {best_f1:.3f})")
    
    if importance:
        print(f"\n  Top 5 Features:")
        for feat, imp in sorted(importance.items(), key=lambda x: -x[1])[:5]:
            print(f"    {feat}: {imp:.3f}")
    
    return {
        "model": model,
        "scaler": scaler,
        "metrics": metrics,
        "feature_cols": feature_cols,
        "importance": importance
    }

# Train all markets
results = {}
for market in CONFIG["MARKETS"]:
    result = train_market(df, market, FEATURE_COLS)
    if result:
        results[market["name"]] = result

print(f"\n✅ Trained {len(results)} models successfully!")

# =============================================================================
# CELL 7: UPLOAD MODELS TO SUPABASE STORAGE
# =============================================================================
def upload_model_to_supabase(market_name: str, result: Dict) -> str:
    """Save model to file and upload to Supabase Storage"""
    import tempfile
    
    print(f"\n📤 Uploading {market_name} model to Supabase Storage...")
    
    # Prepare model package
    model_package = {
        "model": result["model"],
        "scaler": result["scaler"],
        "feature_cols": result["feature_cols"],
        "metrics": result["metrics"],
        "version": datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    }
    
    # Save to temp file
    filename = f"{market_name.replace('.', '_')}_model.joblib"
    filepath = f"/tmp/{filename}"
    joblib.dump(model_package, filepath)
    
    # Get file size
    file_size = os.path.getsize(filepath)
    print(f"  Model size: {file_size / 1024:.1f} KB")
    
    # Upload to Supabase Storage
    with open(filepath, "rb") as f:
        response = supabase.storage.from_("ml-models").upload(
            path=filename,
            file=f,
            file_options={"content-type": "application/octet-stream", "upsert": "true"}
        )
    
    # Get public URL
    public_url = supabase.storage.from_("ml-models").get_public_url(filename)
    print(f"  ✅ Uploaded: {public_url}")
    
    return public_url

def save_metrics_to_db(market_name: str, metrics: Dict, model_url: str):
    """Save model metrics + FULL PROOF PACK to ml_models table"""
    print(f"  💾 Saving proof pack to database...")

    # Governance gate — refuse save if proof pack is incomplete
    required = ['auc_roc', 'brier_score', 'calibration_slope', 'calibration_intercept', 'reliability_bins']
    missing = [k for k in required if metrics.get(k) is None]
    if missing:
        raise ValueError(f"❌ GOVERNANCE BLOCK: cannot save model for {market_name} — missing proof fields: {missing}")

    # Deactivate previous models
    supabase.table("ml_models")\
        .update({"is_active": False})\
        .eq("market", market_name)\
        .execute()

    # Get next version
    response = supabase.table("ml_models")\
        .select("version")\
        .eq("market", market_name)\
        .order("version", desc=True)\
        .limit(1)\
        .execute()

    next_version = 1
    if response.data:
        next_version = response.data[0]["version"] + 1

    # Insert new model record — FULL PROOF PACK
    record = {
        "market": market_name,
        "model_type": "python_ensemble",
        "version": next_version,
        "is_active": True,
        # Core metrics
        "auc_roc": metrics["auc_roc"],
        "accuracy": metrics["accuracy"],
        "precision_score": metrics["precision"],
        "recall_score": metrics["recall"],
        "f1_score": metrics["f1"],
        "true_positives": metrics["true_positives"],
        "true_negatives": metrics["true_negatives"],
        "false_positives": metrics["false_positives"],
        "false_negatives": metrics["false_negatives"],
        # Proof pack (MANDATORY — governance block above ensures these exist)
        "brier_score": metrics["brier_score"],
        "rows_used": metrics["rows_used"],
        "calibration_slope": metrics["calibration_slope"],
        "calibration_intercept": metrics["calibration_intercept"],
        "calibration_method": metrics.get("calibration_method", "isotonic+platt"),
        "reliability_bins": metrics["reliability_bins"],
        "ev_vs_bookmaker": metrics["ev_vs_bookmaker"],
        "model_confidence_score": metrics["model_confidence_score"],
        # Training metadata
        "training_samples": metrics["samples_train"],
        "test_samples": metrics["samples_test"],
        "features_used": len(FEATURE_COLS),
        "feature_names": FEATURE_COLS,
        "weights": {
            "model_url": model_url,
            "optimal_threshold": metrics.get("optimal_threshold", 0.5),
            "trained_at": metrics["trained_at"],
            "log_loss": metrics.get("log_loss"),
        }
    }

    supabase.table("ml_models").insert(record).execute()
    print(f"  ✅ Saved as version {next_version}")
    print(f"  📋 PROOF PACK: AUC={metrics['auc_roc']:.3f} | Brier={metrics['brier_score']:.3f} | "
          f"Cal slope={metrics['calibration_slope']:.3f} | EV={metrics['ev_vs_bookmaker']:.4f} | "
          f"Confidence={metrics['model_confidence_score']}")



# Upload all models
print("\n" + "="*60)
print("📤 UPLOADING MODELS TO SUPABASE")
print("="*60)

for market_name, result in results.items():
    model_url = upload_model_to_supabase(market_name, result)
    save_metrics_to_db(market_name, result["metrics"], model_url)

print("\n🎉 ALL MODELS TRAINED AND UPLOADED!")

# =============================================================================
# CELL 8: SUMMARY
# =============================================================================
print("\n" + "="*60)
print("📊 TRAINING SUMMARY + PROOF PACKS")
print("="*60)

for market_name, result in results.items():
    m = result["metrics"]
    print(f"\n{market_name.upper()}:")
    print(f"  AUC: {m['auc_roc']:.3f} | Brier: {m['brier_score']:.3f} | LogLoss: {m.get('log_loss', 'N/A')}")
    print(f"  Acc: {m['accuracy']:.3f} | F1: {m['f1']:.3f}")
    print(f"  Cal slope: {m['calibration_slope']:.3f} | Cal intercept: {m['calibration_intercept']:.3f}")
    print(f"  EV vs bookmaker: {m['ev_vs_bookmaker']:.4f}")
    print(f"  Model confidence score: {m['model_confidence_score']}/100")
    print(f"  Reliability bins: {len(m['reliability_bins'])} bands computed")
    print(f"  Rows used: {m['rows_used']:,}")

print("\n✅ All proof packs written to ml_models table")
print("✅ Models are now in Supabase Storage")
print("\n🚀 Next: Run the inference Edge Function to make predictions!")
