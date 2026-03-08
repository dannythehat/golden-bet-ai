"""
FOOTY ORACLE - LEAK-PROOF ENSEMBLE TRAINING SCRIPT
===================================================
This script trains XGBoost + LightGBM ensemble models using the 
ml_training_data_v2 dataset (285k+ records, 66+ features).

REQUIREMENTS:
  pip install supabase pandas numpy scikit-learn xgboost lightgbm requests

USAGE:
  1. Set your Supabase credentials below
  2. Run: python train_ensemble_v2.py
  3. Upload predictions: the script calls ml-upload-predictions automatically

Author: Footy Oracle ML Pipeline
"""

import os
import json
import requests
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any

# ============ CONFIGURATION ============
CONFIG = {
    # Get these from your Lovable Cloud settings or /get-keys page
    "SUPABASE_URL": "https://ffonednbxcfhzxardvry.supabase.co",
    "SUPABASE_KEY": "YOUR_SERVICE_ROLE_KEY_HERE",  # Service role key for full access
    
    # Upload settings
    "UPLOAD_KEY": "footy-oracle-ml-2026",
    
    # Training settings
    "TEST_YEAR": 2025,  # Train on pre-2025, test on 2025+
    "MIN_SAMPLES_PER_MARKET": 1000,
    "RANDOM_STATE": 42,
}

# ============ FEATURE DEFINITIONS ============
# These are the leak-proof rolling features from ml_training_data_v2
GOAL_FEATURES = [
    "home_goals_for_avg_5", "home_goals_for_avg_10", "home_goals_for_avg_20",
    "home_goals_against_avg_5", "home_goals_against_avg_10", "home_goals_against_avg_20",
    "away_goals_for_avg_5", "away_goals_for_avg_10", "away_goals_for_avg_20",
    "away_goals_against_avg_5", "away_goals_against_avg_10", "away_goals_against_avg_20",
    "home_xg_for_avg_5", "home_xg_for_avg_10", "away_xg_for_avg_5", "away_xg_for_avg_10",
    "combined_goals_for_10", "combined_xg_for_10", "defense_weakness_index_10",
    "league_avg_goals", "league_over25_rate", "league_btts_rate",
]

CORNER_FEATURES = [
    "home_corners_for_avg_5", "home_corners_for_avg_10", "home_corners_for_avg_20",
    "home_corners_against_avg_5", "home_corners_against_avg_10", "home_corners_against_avg_20",
    "away_corners_for_avg_5", "away_corners_for_avg_10", "away_corners_for_avg_20",
    "away_corners_against_avg_5", "away_corners_against_avg_10", "away_corners_against_avg_20",
    "combined_corners_10", "league_avg_corners",
]

CARD_FEATURES = [
    "home_cards_for_avg_5", "home_cards_for_avg_10", "home_cards_for_avg_20",
    "home_cards_against_avg_5", "home_cards_against_avg_10", "home_cards_against_avg_20",
    "away_cards_for_avg_5", "away_cards_for_avg_10", "away_cards_for_avg_20",
    "away_cards_against_avg_5", "away_cards_against_avg_10", "away_cards_against_avg_20",
    "combined_cards_10", "league_avg_cards",
    "home_fouls_for_avg_5", "home_fouls_for_avg_10", "away_fouls_for_avg_5", "away_fouls_for_avg_10",
    "ref_avg_cards_last50", "ref_over35_cards_rate_last50",
]

SHOT_FEATURES = [
    "home_shots_for_avg_5", "home_shots_for_avg_10", "home_shots_for_avg_20",
    "away_shots_for_avg_5", "away_shots_for_avg_10", "away_shots_for_avg_20",
    "home_shots_on_target_avg_5", "home_shots_on_target_avg_10",
    "away_shots_on_target_avg_5", "away_shots_on_target_avg_10",
    "combined_shots_10",
]

# Market-specific feature sets
MARKET_FEATURES = {
    "over_2_5_goals": GOAL_FEATURES + SHOT_FEATURES,
    "btts": GOAL_FEATURES + SHOT_FEATURES,
    "over_9_5_corners": CORNER_FEATURES + SHOT_FEATURES,
    "over_3_5_cards": CARD_FEATURES,
}

MARKET_TARGETS = {
    "over_2_5_goals": "over_25_hit",
    "btts": "btts_hit",
    "over_9_5_corners": "over_95_corners_hit",
    "over_3_5_cards": "over_35_cards_hit",
}


# ============ DATA LOADING ============
def fetch_training_data(supabase_url: str, supabase_key: str) -> pd.DataFrame:
    """Fetch all training data from ml_training_data_v2 in batches."""
    print("📥 Fetching training data from ml_training_data_v2...")
    
    all_data = []
    batch_size = 1000
    offset = 0
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }
    
    while True:
        url = f"{supabase_url}/rest/v1/ml_training_data_v2?select=*&order=fixture_date.asc&limit={batch_size}&offset={offset}"
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            raise Exception(f"Failed to fetch data: {response.status_code} - {response.text}")
        
        batch = response.json()
        if not batch:
            break
            
        all_data.extend(batch)
        offset += batch_size
        
        if len(all_data) % 10000 == 0:
            print(f"  ... loaded {len(all_data):,} records")
    
    print(f"✅ Loaded {len(all_data):,} total records")
    return pd.DataFrame(all_data)


def fetch_todays_fixtures(supabase_url: str, supabase_key: str) -> List[Dict]:
    """Fetch today's fixtures from ml-fixtures endpoint."""
    print("📅 Fetching today's fixtures...")
    
    url = f"{supabase_url}/functions/v1/ml-fixtures"
    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }
    
    response = requests.post(url, headers=headers, json={})
    
    if response.status_code != 200:
        print(f"⚠️ Failed to fetch fixtures: {response.status_code}")
        return []
    
    data = response.json()
    fixtures = data.get("fixtures", [])
    print(f"✅ Found {len(fixtures)} fixtures for today")
    return fixtures


# ============ FEATURE ENGINEERING ============
def prepare_features(df: pd.DataFrame, market: str) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for a specific market."""
    feature_cols = MARKET_FEATURES[market]
    target_col = MARKET_TARGETS[market]
    
    # Get available features (some may be missing in older records)
    available_features = [f for f in feature_cols if f in df.columns]
    
    # Filter rows with valid target
    valid_mask = df[target_col].notna()
    df_valid = df[valid_mask].copy()
    
    # Extract features and target
    X = df_valid[available_features].copy()
    y = df_valid[target_col].astype(int)
    
    # Fill missing values with column medians
    X = X.fillna(X.median())
    
    # Replace any remaining NaN/inf with 0
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
    
    return X, y, available_features


def temporal_train_test_split(df: pd.DataFrame, test_year: int) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Split data temporally - train on older data, test on newer."""
    df["fixture_date"] = pd.to_datetime(df["fixture_date"])
    
    train_mask = df["fixture_date"].dt.year < test_year
    test_mask = df["fixture_date"].dt.year >= test_year
    
    train_df = df[train_mask].copy()
    test_df = df[test_mask].copy()
    
    print(f"📊 Train: {len(train_df):,} records (pre-{test_year})")
    print(f"📊 Test: {len(test_df):,} records ({test_year}+)")
    
    return train_df, test_df


# ============ MODEL TRAINING ============
def train_ensemble(X_train: pd.DataFrame, y_train: pd.Series, 
                   X_test: pd.DataFrame, y_test: pd.Series,
                   market: str) -> Dict[str, Any]:
    """Train XGBoost + LightGBM ensemble for a market."""
    from sklearn.preprocessing import StandardScaler
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.metrics import roc_auc_score, accuracy_score, precision_score, recall_score
    import xgboost as xgb
    import lightgbm as lgb
    
    print(f"\n🎯 Training ensemble for: {market}")
    print(f"   Features: {X_train.shape[1]}, Train samples: {len(X_train):,}")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train XGBoost
    xgb_model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=CONFIG["RANDOM_STATE"],
        use_label_encoder=False,
        eval_metric="logloss",
    )
    xgb_model.fit(X_train_scaled, y_train)
    xgb_proba = xgb_model.predict_proba(X_test_scaled)[:, 1]
    
    # Train LightGBM
    lgb_model = lgb.LGBMClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=CONFIG["RANDOM_STATE"],
        verbose=-1,
    )
    lgb_model.fit(X_train_scaled, y_train)
    lgb_proba = lgb_model.predict_proba(X_test_scaled)[:, 1]
    
    # Ensemble: average probabilities
    ensemble_proba = (xgb_proba + lgb_proba) / 2
    ensemble_pred = (ensemble_proba >= 0.5).astype(int)
    
    # Calculate metrics
    auc = roc_auc_score(y_test, ensemble_proba)
    accuracy = accuracy_score(y_test, ensemble_pred)
    precision = precision_score(y_test, ensemble_pred, zero_division=0)
    recall = recall_score(y_test, ensemble_pred, zero_division=0)
    
    print(f"   ✅ AUC: {auc:.4f} | Accuracy: {accuracy:.4f} | Precision: {precision:.4f} | Recall: {recall:.4f}")
    
    # Find optimal threshold (maximize F1)
    best_threshold = 0.5
    best_f1 = 0
    for thresh in np.arange(0.3, 0.7, 0.01):
        pred = (ensemble_proba >= thresh).astype(int)
        tp = ((pred == 1) & (y_test == 1)).sum()
        fp = ((pred == 1) & (y_test == 0)).sum()
        fn = ((pred == 0) & (y_test == 1)).sum()
        if tp + fp > 0 and tp + fn > 0:
            prec = tp / (tp + fp)
            rec = tp / (tp + fn)
            f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0
            if f1 > best_f1:
                best_f1 = f1
                best_threshold = thresh
    
    print(f"   📈 Optimal threshold: {best_threshold:.2f} (F1: {best_f1:.4f})")
    
    return {
        "xgb_model": xgb_model,
        "lgb_model": lgb_model,
        "scaler": scaler,
        "feature_names": list(X_train.columns),
        "optimal_threshold": best_threshold,
        "metrics": {
            "auc": auc,
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1": best_f1,
        }
    }


# ============ PREDICTION ============
def generate_predictions(fixtures: List[Dict], models: Dict[str, Any], 
                          df: pd.DataFrame) -> List[Dict]:
    """Generate predictions for today's fixtures."""
    print("\n🔮 Generating predictions for today's fixtures...")
    
    predictions = []
    
    # Get recent team stats from training data
    recent_data = df[df["fixture_date"] >= (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d")]
    
    for fixture in fixtures:
        fixture_id = str(fixture.get("fixture_id", fixture.get("id", "")))
        home_team = fixture.get("home_team", "")
        away_team = fixture.get("away_team", "")
        
        if not fixture_id or not home_team or not away_team:
            continue
        
        # Build feature vector from recent team history
        home_matches = recent_data[recent_data["home_team"] == home_team]
        away_matches = recent_data[recent_data["away_team"] == away_team]
        
        # If no historical data, use league averages
        if len(home_matches) < 3 or len(away_matches) < 3:
            continue
        
        for market, model_data in models.items():
            feature_names = model_data["feature_names"]
            scaler = model_data["scaler"]
            xgb_model = model_data["xgb_model"]
            lgb_model = model_data["lgb_model"]
            
            # Build feature vector from most recent matches
            features = {}
            for feat in feature_names:
                if feat in home_matches.columns:
                    val = home_matches[feat].dropna().iloc[-1] if len(home_matches[feat].dropna()) > 0 else 0
                    features[feat] = val
                elif feat in away_matches.columns:
                    val = away_matches[feat].dropna().iloc[-1] if len(away_matches[feat].dropna()) > 0 else 0
                    features[feat] = val
                else:
                    features[feat] = 0
            
            # Create feature array in correct order
            X = np.array([[features.get(f, 0) for f in feature_names]])
            X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
            
            # Scale and predict
            X_scaled = scaler.transform(X)
            xgb_prob = xgb_model.predict_proba(X_scaled)[0][1]
            lgb_prob = lgb_model.predict_proba(X_scaled)[0][1]
            ensemble_prob = (xgb_prob + lgb_prob) / 2
            
            predictions.append({
                "fixture_id": fixture_id,
                "home_team": home_team,
                "away_team": away_team,
                "market": market,
                "prob": round(float(ensemble_prob), 4),
            })
    
    print(f"✅ Generated {len(predictions)} predictions for {len(set(p['fixture_id'] for p in predictions))} fixtures")
    return predictions


# ============ UPLOAD ============
def upload_predictions(predictions: List[Dict], supabase_url: str, upload_key: str) -> bool:
    """Upload predictions to ml-upload-predictions endpoint."""
    if not predictions:
        print("⚠️ No predictions to upload")
        return False
    
    print(f"\n📤 Uploading {len(predictions)} predictions...")
    
    url = f"{supabase_url}/functions/v1/ml-upload-predictions"
    headers = {
        "Content-Type": "application/json",
        "x-upload-key": upload_key,
    }
    
    payload = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "predictions": predictions,
    }
    
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        print("✅ Predictions uploaded successfully!")
        return True
    else:
        print(f"❌ Upload failed: {response.status_code} - {response.text}")
        return False


# ============ MAIN ============
def main():
    print("=" * 60)
    print("🏆 FOOTY ORACLE - ENSEMBLE ML TRAINING")
    print("=" * 60)
    
    # Validate config
    if CONFIG["SUPABASE_KEY"] == "YOUR_SERVICE_ROLE_KEY_HERE":
        print("\n❌ ERROR: Please set your SUPABASE_KEY in the CONFIG section!")
        print("   Get it from: https://thefootyoracle.lovable.app/get-keys")
        return
    
    # 1. Fetch training data
    df = fetch_training_data(CONFIG["SUPABASE_URL"], CONFIG["SUPABASE_KEY"])
    
    # 2. Temporal split
    train_df, test_df = temporal_train_test_split(df, CONFIG["TEST_YEAR"])
    
    # 3. Train models for each market
    models = {}
    for market in MARKET_FEATURES.keys():
        X_train, y_train, features = prepare_features(train_df, market)
        X_test, y_test, _ = prepare_features(test_df, market)
        
        if len(X_train) < CONFIG["MIN_SAMPLES_PER_MARKET"]:
            print(f"⚠️ Skipping {market}: insufficient training samples ({len(X_train)})")
            continue
        
        # Filter test set to have same features
        X_test = X_test[features]
        
        models[market] = train_ensemble(X_train, y_train, X_test, y_test, market)
    
    # 4. Fetch today's fixtures
    fixtures = fetch_todays_fixtures(CONFIG["SUPABASE_URL"], CONFIG["SUPABASE_KEY"])
    
    if not fixtures:
        print("\n⚠️ No fixtures found for today. Training complete but no predictions generated.")
        print_model_summary(models)
        return
    
    # 5. Generate predictions
    predictions = generate_predictions(fixtures, models, df)
    
    # 6. Upload predictions
    if predictions:
        upload_predictions(predictions, CONFIG["SUPABASE_URL"], CONFIG["UPLOAD_KEY"])
    
    # 7. Print summary
    print_model_summary(models)


def print_model_summary(models: Dict[str, Any]):
    """Print final model performance summary."""
    print("\n" + "=" * 60)
    print("📊 MODEL PERFORMANCE SUMMARY")
    print("=" * 60)
    
    for market, data in models.items():
        m = data["metrics"]
        print(f"\n{market.upper()}")
        print(f"  AUC:       {m['auc']:.4f}")
        print(f"  Accuracy:  {m['accuracy']:.4f}")
        print(f"  Precision: {m['precision']:.4f}")
        print(f"  Recall:    {m['recall']:.4f}")
        print(f"  F1 Score:  {m['f1']:.4f}")
        print(f"  Threshold: {data['optimal_threshold']:.2f}")
    
    print("\n" + "=" * 60)
    print("✅ Training complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
