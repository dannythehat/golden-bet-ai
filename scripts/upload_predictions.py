#!/usr/bin/env python3
"""
Supabase ML Predictions Upload Script
=====================================
Uploads predictions JSON via the ml-upload-predictions Edge Function.
No API keys required - just call the endpoint!

Usage:
    # Run smoke test
    python upload_predictions.py --test
    
    # Upload a JSON file
    python upload_predictions.py path/to/predictions.json
    
    # Use in your ML script:
    from upload_predictions import upload_predictions_to_storage
    upload_predictions_to_storage(predictions_data)
"""

import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, Any
import urllib.request
import urllib.error

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ============ CONFIGURATION ============
EDGE_FUNCTION_URL = "https://ffonednbxcfhzxardvry.supabase.co/functions/v1/ml-upload-predictions"
UPLOAD_KEY = "footy-oracle-ml-2026"


def validate_predictions_format(data: Dict[str, Any]) -> bool:
    """Validate the predictions JSON has required fields."""
    required_fields = ['date', 'predictions']
    
    for field in required_fields:
        if field not in data:
            logger.error(f"❌ Missing required field: {field}")
            return False
    
    if not isinstance(data['predictions'], list):
        logger.error("❌ 'predictions' must be a list")
        return False
    
    # Validate each prediction has fixture_id and markets
    for i, pred in enumerate(data['predictions'][:5]):  # Check first 5
        if 'fixture_id' not in pred:
            logger.error(f"❌ Prediction {i} missing 'fixture_id'")
            return False
        if 'markets' not in pred:
            logger.error(f"❌ Prediction {i} missing 'markets'")
            return False
    
    return True


def upload_predictions_to_storage(
    predictions_data: Dict[str, Any],
    validate: bool = True
) -> bool:
    """
    Upload predictions JSON via Edge Function.
    
    Uses the ml-upload-predictions Edge Function which handles
    authentication and storage internally.
    
    Args:
        predictions_data: Dict with {date, generated_at, predictions[]}
        validate: Whether to validate the format before upload
    
    Returns:
        bool: True if upload succeeded, False otherwise
    """
    # Validate predictions format
    if validate and not validate_predictions_format(predictions_data):
        logger.error("❌ Predictions data failed validation")
        return False

    try:
        # Add generated_at if not present
        if 'generated_at' not in predictions_data:
            predictions_data['generated_at'] = datetime.utcnow().isoformat() + 'Z'
        
        # Convert to JSON bytes
        json_content = json.dumps(predictions_data, indent=2, ensure_ascii=False)
        json_bytes = json_content.encode('utf-8')
        
        logger.info(f"📦 Preparing upload: {len(json_bytes):,} bytes, {len(predictions_data.get('predictions', []))} predictions")
        logger.info(f"📤 Uploading to Edge Function: {EDGE_FUNCTION_URL}")
        
        # Create request
        request = urllib.request.Request(
            EDGE_FUNCTION_URL,
            data=json_bytes,
            method='POST',
            headers={
                'Content-Type': 'application/json',
                'x-upload-key': UPLOAD_KEY,
            }
        )
        
        # Execute the request
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                response_data = json.loads(response.read().decode('utf-8'))
                
                if response_data.get('success'):
                    logger.info("=" * 60)
                    logger.info("✅ UPLOAD SUCCESSFUL")
                    logger.info(f"   Date: {response_data.get('date')}")
                    logger.info(f"   Predictions: {response_data.get('prediction_count')}")
                    logger.info(f"   Size: {response_data.get('size_bytes'):,} bytes")
                    logger.info(f"   Public URL: {response_data.get('public_url')}")
                    logger.info("=" * 60)
                    return True
                else:
                    logger.error(f"❌ Upload failed: {response_data.get('error')}")
                    return False
                    
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else 'No response body'
            logger.error(f"❌ HTTP Error {e.code}: {e.reason}")
            try:
                error_json = json.loads(error_body)
                logger.error(f"   Error: {error_json.get('error', error_body)}")
            except:
                logger.error(f"   Response: {error_body}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Upload failed with exception: {str(e)}")
        return False


def upload_from_file(file_path: str) -> bool:
    """Upload predictions from a JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logger.info(f"📄 Loaded predictions from: {file_path}")
        return upload_predictions_to_storage(data)
        
    except FileNotFoundError:
        logger.error(f"❌ File not found: {file_path}")
        return False
    except json.JSONDecodeError as e:
        logger.error(f"❌ Invalid JSON in file: {e}")
        return False


def run_smoke_test() -> bool:
    """
    Run a smoke test to verify the upload works.
    Creates a minimal test prediction and uploads it.
    """
    logger.info("🧪 Running smoke test...")
    logger.info(f"   Edge Function: {EDGE_FUNCTION_URL}")
    
    test_data = {
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "model_version": "smoke_test_v1",
        "predictions": [
            {
                "fixture_id": "smoke_test_12345",
                "home_team": "Test Home FC",
                "away_team": "Test Away United",
                "kickoff": (datetime.utcnow().isoformat() + "Z"),
                "league": "Test League",
                "markets": {
                    "over_2_5_goals": {"probability": 0.75},
                    "btts": {"probability": 0.65},
                    "over_9_5_corners": {"probability": 0.72},
                    "over_3_5_cards": {"probability": 0.70}
                }
            }
        ]
    }
    
    success = upload_predictions_to_storage(test_data)
    
    if success:
        logger.info("\n🎉 SMOKE TEST PASSED!")
        logger.info("   The upload pipeline is working correctly.")
        logger.info("   Integrate into your ML script:")
        logger.info("     from upload_predictions import upload_predictions_to_storage")
        logger.info("     upload_predictions_to_storage(your_predictions)")
    else:
        logger.error("\n💥 SMOKE TEST FAILED!")
        logger.error("   Check the error messages above.")
    
    return success


# ============ CLI ENTRY POINT ============
if __name__ == '__main__':
    if len(sys.argv) > 1:
        if sys.argv[1] == '--test':
            success = run_smoke_test()
        else:
            file_path = sys.argv[1]
            success = upload_from_file(file_path)
    else:
        print(__doc__)
        print("\nQuick start:")
        print("  python upload_predictions.py --test")
        print()
        success = True
    
    sys.exit(0 if success else 1)
