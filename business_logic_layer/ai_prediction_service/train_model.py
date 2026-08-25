"""
Baseline trainer for the FCR-SCS AI Valuation model.

Trains on the generated training dataset, evaluates on the independent test
dataset, saves the active model artifact (joblib) and seeds the model registry.

Usage: python train_model.py
"""

import pandas as pd

import ml_core as core


def train_and_evaluate_model():
    print(f"Loading Training Set: {core.TRAIN_DATASET_PATH}")
    df_train = pd.read_csv(core.TRAIN_DATASET_PATH)

    print(f"Loading Testing Set:  {core.TEST_DATASET_PATH}")
    df_test = pd.read_csv(core.TEST_DATASET_PATH)

    X_train = df_train[core.FEATURE_COLUMNS]
    y_train = df_train[core.TARGET_COLUMN]
    X_test = df_test[core.FEATURE_COLUMNS]
    y_test = df_test[core.TARGET_COLUMN]

    model = core.build_pipeline()

    print("\nTraining Random Forest Regressor on Set 1 (Training Dataset)...")
    model.fit(X_train, y_train)

    metrics = core.evaluate(model, X_test, y_test)

    print("\n--- MODEL PERFORMANCE EVALUATION ON TEST SET (1,500 unseen samples) ---")
    print(f"Mean Absolute Error (MAE): RM {metrics['mae']:,.2f}")
    print(f"Root Mean Squared Error (RMSE): RM {metrics['rmse']:,.2f}")
    print(f"R-squared Score (Accuracy): {metrics['r2'] * 100:.2f}% (R² = {metrics['r2']:.4f})")

    core.save_model(model, core.ACTIVE_MODEL_PATH)
    print(f"\nTrained Model saved successfully to: {core.ACTIVE_MODEL_PATH}")

    registry = core.read_registry()
    registry['activeModel'] = core.make_active_entry('v1.0', metrics, len(df_train))
    core.write_registry(registry)
    print(f"Model registry seeded at: {core.REGISTRY_PATH}")


if __name__ == '__main__':
    train_and_evaluate_model()
