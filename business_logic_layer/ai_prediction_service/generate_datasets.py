import os
import numpy as np
import pandas as pd

# The valuation attributes exposed to officers in the AI Valuation form and
# used as model features. Vocabulary is aligned with the manual Valuation
# module (presentation_layer/src/constants): state = Malaysian state name,
# land_category = title category (Agriculture/Building/Industry), tenure =
# Freehold/Leasehold/Malay Reserve, location = Urban/Suburban/Rural, areas in
# square metres. Everything else that drove price in older versions (use-class,
# building condition, material, distances, crops) is folded in internally so
# the market value stays explainable by these 7 attributes.
FEATURE_COLUMNS = [
    'state',
    'land_category',
    'location_type',
    'tenure_type',
    'land_area_m2',
    'built_up_area_m2',
    'building_age_years',
]

TARGET_COLUMN = 'market_value_myr'

DATASET_COLUMNS = ['case_id'] + FEATURE_COLUMNS + [
    'market_value_myr',
    'statutory_disturbance_myr',
    'relocation_allowance_myr',
    'recommended_compensation_myr',
]

# Malaysian states using the same names as MALAYSIA_STATE_OPTIONS.
STATES_MULTIPLIER = {
    'Johor': 1.18,
    'Kedah': 0.90,
    'Kelantan': 0.82,
    'Melaka': 1.05,
    'Negeri Sembilan': 0.98,
    'Pahang': 0.90,
    'Perak': 0.88,
    'Perlis': 0.85,
    'Pulau Pinang': 1.35,
    'Sabah': 0.95,
    'Sarawak': 0.98,
    'Selangor': 1.45,
    'Terengganu': 0.85,
    'Wilayah Persekutuan Kuala Lumpur': 1.60,
    'Wilayah Persekutuan Labuan': 1.00,
    'Wilayah Persekutuan Putrajaya': 1.35,
}
STATE_PROBS = [
    0.13,  # Johor
    0.06,  # Kedah
    0.05,  # Kelantan
    0.07,  # Melaka
    0.05,  # Negeri Sembilan
    0.05,  # Pahang
    0.07,  # Perak
    0.01,  # Perlis
    0.11,  # Pulau Pinang
    0.02,  # Sabah
    0.02,  # Sarawak
    0.20,  # Selangor
    0.04,  # Terengganu
    0.10,  # WP Kuala Lumpur
    0.01,  # WP Labuan
    0.01,  # WP Putrajaya
]
assert abs(sum(STATE_PROBS) - 1.0) < 1e-9

def generate_unified_valuation_dataset(n_samples=6000, random_seed=42, case_prefix="TR"):
    """
    Generates a tabular valuation dataset for FCR-SCS aligned with the manual
    Valuation module vocabulary (title land categories, m2 areas, no building
    condition). Used to train the baseline model and to produce templates.
    """
    np.random.seed(random_seed)

    land_categories = ['Agriculture', 'Building', 'Industry']
    cat_probs = [0.40, 0.50, 0.10]

    # Land value per m2 (title-category basis) and structure cost per m2.
    cat_config = {
        'Agriculture': {'land_rate': 450, 'structure_cost': 1100},
        'Building': {'land_rate': 2000, 'structure_cost': 1800},
        'Industry': {'land_rate': 1500, 'structure_cost': 1700},
    }

    tenures = ['Freehold', 'Leasehold', 'Malay Reserve']
    tenure_mult = {'Freehold': 1.05, 'Leasehold': 0.98, 'Malay Reserve': 0.92}

    loc_mult = {'Urban': 1.20, 'Suburban': 1.00, 'Rural': 0.78}

    data = []

    for i in range(1, n_samples + 1):
        case_id = f"CASE-2026-{case_prefix}-{i:05d}"

        state = np.random.choice(list(STATES_MULTIPLIER.keys()), p=STATE_PROBS)
        loc_type = np.random.choice(list(loc_mult.keys()), p=[0.40, 0.40, 0.20])
        cat = np.random.choice(land_categories, p=cat_probs)

        if cat == 'Agriculture':
            land_area = np.random.randint(2000, 20000)
            built_up = np.random.choice([0, np.random.randint(30, 250)], p=[0.60, 0.40])
            age = np.random.randint(0, 40)
        elif cat == 'Building':
            land_area = np.random.randint(150, 3000)
            built_up = int(land_area * np.random.uniform(0.50, 1.30))
            age = np.random.randint(1, 40)
        else:  # Industry
            land_area = np.random.randint(1000, 25000)
            built_up = int(land_area * np.random.uniform(0.35, 0.80))
            age = np.random.randint(1, 35)

        tenure = np.random.choice(tenures, p=[0.55, 0.35, 0.10])

        # VALUATION CALCULATION (MYR)
        land_rate = (cat_config[cat]['land_rate']
                     * STATES_MULTIPLIER[state] * loc_mult[loc_type] * tenure_mult[tenure])
        land_value = land_area * land_rate

        structure_base = built_up * cat_config[cat]['structure_cost']
        # Depreciation (approx 1.5% per year up to max 60%)
        depreciation_rate = min(0.60, age * 0.015)
        structure_depreciated = structure_base * (1.0 - depreciation_rate)

        # Crops contribute to farmland value; derived internally from size.
        if cat == 'Agriculture':
            crop_value = min(250, int(land_area / 800)) * 420
        else:
            crop_value = 0

        # Small residual variance replaces the old continuous distance penalty.
        location_variance = 1.0 + np.random.normal(0, 0.02)
        total_market_val = (land_value + structure_depreciated + crop_value) * location_variance

        # Market variance noise (+- 4%)
        noise = np.random.normal(0, total_market_val * 0.04)
        market_val_final = int(max(45000, round((total_market_val + noise) / 1000) * 1000))

        # Land Acquisition Act 1960 statutory compensations
        statutory_disturbance = int(round((market_val_final * 0.15) / 100) * 100)
        relocation_allowance = 8000 if built_up > 0 else 2000
        recommended_compensation = market_val_final + statutory_disturbance + relocation_allowance

        data.append({
            'case_id': case_id,
            'state': state,
            'land_category': cat,
            'location_type': loc_type,
            'tenure_type': tenure,
            'land_area_m2': int(land_area),
            'built_up_area_m2': int(built_up),
            'building_age_years': int(age),
            'market_value_myr': market_val_final,
            'statutory_disturbance_myr': statutory_disturbance,
            'relocation_allowance_myr': relocation_allowance,
            'recommended_compensation_myr': recommended_compensation
        })

    return pd.DataFrame(data)


if __name__ == '__main__':
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
    datasets_dir = os.path.join(repo_root, 'data_layer', 'ai_model_repository', 'datasets')
    os.makedirs(datasets_dir, exist_ok=True)

    print("Generating Set 1: Training Dataset (6,000 samples)...")
    df_train = generate_unified_valuation_dataset(n_samples=6000, random_seed=42, case_prefix="TR")

    print("Generating Set 2: Testing / Evaluation Dataset (1,500 samples)...")
    df_test = generate_unified_valuation_dataset(n_samples=1500, random_seed=2026, case_prefix="TS")

    train_path = os.path.join(datasets_dir, 'fcr_scs_valuation_train_dataset.csv')
    test_path = os.path.join(datasets_dir, 'fcr_scs_valuation_test_dataset.csv')

    df_train.to_csv(train_path, index=False)
    df_test.to_csv(test_path, index=False)
    print(f"Saved datasets to: {datasets_dir}")

    print("\nDataset Generation Complete (7 Valuation Attributes, module vocabulary)!")
    print(f"Set 1 (Training Dataset): {len(df_train)} rows, {len(df_train.columns)} columns.")
    print(f"Set 2 (Testing Dataset): {len(df_test)} rows, {len(df_test.columns)} columns.")
