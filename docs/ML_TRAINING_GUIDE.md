# 🏆 Footy Oracle ML Training Guide

## Overview

The ML system is split into two parts:

1. **Training** (External): Run in Google Colab or locally with full Python ML stack
2. **Inference** (Edge Functions): Lightweight predictions using pre-trained models

## Quick Start

### Step 1: Open Google Colab

1. Go to [Google Colab](https://colab.research.google.com)
2. Click **File → Upload notebook**
3. Upload `notebooks/football_ml_training.py` (or paste code)

### Step 2: Configure Credentials

In the notebook, update the CONFIG section:

```python
CONFIG = {
    "SUPABASE_URL": "https://ffonednbxcfhzxardvry.supabase.co",
    "SUPABASE_KEY": "YOUR_SERVICE_ROLE_KEY",  # From Lovable Cloud settings
    ...
}
```

**Important**: Use the **Service Role Key** (not the anon key) to allow uploads.

### Step 3: Run All Cells

The notebook will:
1. Fetch 50,000+ training samples from your database
2. Engineer 25+ predictive features
3. Train an ensemble of 5 models per market:
   - Logistic Regression
   - Random Forest
   - Gradient Boosting
   - XGBoost
   - LightGBM
4. Calibrate probabilities using Platt scaling
5. Find optimal prediction thresholds
6. Upload models to Supabase Storage
7. Save metrics to `ml_models` table

## Model Storage

Models are saved to:
- **Supabase Storage**: `ml-models/` bucket (full Python models)
- **Database**: `ml_models` table (metrics + lightweight fallback weights)

## Inference

### Edge Function (Fast Fallback)

Call the `ml-inference` function for quick predictions:

```typescript
const { data } = await supabase.functions.invoke('ml-inference', {
  body: {
    match: {
      home_team: 'Arsenal',
      away_team: 'Chelsea',
      home_over25_pct: 72,
      away_over25_pct: 68,
      home_avg_goals: 2.1,
      away_avg_goals: 1.8,
      // ... more features
    },
    markets: ['over_2.5_goals', 'btts']
  }
});
```

### Full Python Inference (Maximum Accuracy)

For production with highest accuracy, deploy a Python inference service:

```python
import joblib
from supabase import create_client

# Load model from storage
model_url = supabase.storage.from_("ml-models").get_public_url("over_2_5_goals_model.joblib")
model_package = joblib.load(requests.get(model_url).content)

# Predict
features = [...] # 25 features
X_scaled = model_package['scaler'].transform([features])
probability = model_package['model'].predict_proba(X_scaled)[0][1]
```

## Training Schedule

Recommended: **Weekly retraining** (Sundays at 3 AM)

### Manual Training

1. Open Colab notebook
2. Run all cells
3. Check `ml_models` table for new versions

### Automated Training (Advanced)

Deploy a Cloud Run or Railway service that:
1. Runs the training script weekly
2. Uploads new models
3. Sends Slack notification on completion

## Metrics to Track

| Market | Target AUC | Target Accuracy |
|--------|-----------|-----------------|
| Over 2.5 Goals | > 0.62 | > 58% |
| BTTS | > 0.58 | > 55% |
| Over 9.5 Corners | > 0.70 | > 65% |
| Over 3.5 Cards | > 0.72 | > 68% |

## Troubleshooting

### "Insufficient training data"

Run `ml-bulk-training` to backfill historical data:

```bash
curl -X POST https://ffonednbxcfhzxardvry.supabase.co/functions/v1/ml-bulk-training
```

### Model not loading

Check that `ml-models` bucket exists and has the correct policies:

```sql
SELECT * FROM storage.buckets WHERE id = 'ml-models';
```

### Low AUC scores

- Add more historical data (aim for 100k+ samples)
- Engineer domain-specific features
- Consider league-specific models

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Google Colab   │────▶│ Supabase Storage │────▶│ Edge Functions  │
│  (Training)     │     │  (Model Files)   │     │  (Inference)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Postgres                            │
│  ┌──────────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ ml_training_data │  │   ml_models   │  │ golden_bet_hist  │  │
│  │   (Features)     │  │  (Metrics)    │  │   (Results)      │  │
│  └──────────────────┘  └───────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Next Steps

1. ✅ Run the Colab notebook to train initial models
2. ✅ Verify models appear in `ml_models` table
3. ✅ Test `ml-inference` Edge Function
4. 🔜 Update `ml-value-engine` to use new model probabilities
5. 🔜 Set up weekly retraining schedule
