import os
import numpy as np
import pandas as pd

# The valuation attributes exposed to officers in the AI Valuation form and
# used as model features. Vocabulary is aligned with the manual Valuation
# module (presentation_layer/src/constants): state = Malaysian state name,
# land_category = title category (Agriculture/Building/Industry), tenure =
# Freehold/Leasehold/Malay Reserve, location = Urban/Suburban/Rural, areas in
# square metres. The second area attribute is the ACQUISITION area (the portion
# the government acquires), not a built-up area. Everything else that drives
# price (structures, crops, distance premiums) is derived internally from these
# 7 attributes so the market value stays fully explainable.
FEATURE_COLUMNS = [
    'state',
    'land_category',
    'location_type',
    'tenure_type',
    'land_area_m2',
    'acquisition_area_m2',
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

# Land value per m2 (title-category basis) and improvement cost per m2.
CAT_CONFIG = {
    'Agriculture': {'land_rate': 450, 'structure_cost': 1100},
    'Building': {'land_rate': 2000, 'structure_cost': 1800},
    'Industry': {'land_rate': 1500, 'structure_cost': 1700},
}

# Land area ranges per category (m2).
LAND_AREA_RANGES = {
    'Agriculture': (2000, 20000),
    'Building': (150, 3000),
    'Industry': (1000, 25000),
}

# Proportion of the parcel being acquired, and the share of the acquired area
# covered by structures, per category.
ACQUISITION_RATIO = {
    'Agriculture': (0.20, 0.90),
    'Building': (0.25, 0.95),
    'Industry': (0.25, 0.95),
}
STRUCTURE_RATIO = {
    'Agriculture': (0.05, 0.15),
    'Building': (0.50, 0.90),
    'Industry': (0.40, 0.70),
}

# A structure is assumed on the acquired land for Building/Industry, and for
# Agriculture only when a sizeable farm building/homestead is acquired. This
# rule is deterministic so the same relocation allowance can be recomputed at
# prediction time (see ml_core.derive_compensation).
AGRICULTURE_STRUCTURE_THRESHOLD_M2 = 400


def location_multipliers():
    return {'Urban': 1.20, 'Suburban': 1.00, 'Rural': 0.78}


def generate_unified_valuation_dataset(n_samples=6000, random_seed=42, case_prefix="TR"):
    """
    Generates a tabular valuation dataset for FCR-SCS aligned with the manual
    Valuation module vocabulary. The compensated value is based on the
    ACQUISITION area (the part acquired), plus improvements and crops standing
    on it, with a per-m2 uplift when only a small share of the parcel is taken.
    """
    np.random.seed(random_seed)

    land_categories = ['Agriculture', 'Building', 'Industry']
    cat_probs = [0.40, 0.50, 0.10]

    tenures = ['Freehold', 'Leasehold', 'Malay Reserve']
    tenure_mult = {'Freehold': 1.05, 'Leasehold': 0.98, 'Malay Reserve': 0.92}

    loc_mult = location_multipliers()

    data = []

    for i in range(1, n_samples + 1):
        case_id = f"CASE-2026-{case_prefix}-{i:05d}"

        state = np.random.choice(list(STATES_MULTIPLIER.keys()), p=STATE_PROBS)
        loc_type = np.random.choice(list(loc_mult.keys()), p=[0.40, 0.40, 0.20])
        cat = np.random.choice(land_categories, p=cat_probs)

        low, high = LAND_AREA_RANGES[cat]
        land_area = np.random.randint(low, high)

        ratio_low, ratio_high = ACQUISITION_RATIO[cat]
        acquisition_ratio = np.random.uniform(ratio_low, ratio_high)
        acquisition_area = max(1, min(land_area - 1, int(land_area * acquisition_ratio)))

        if cat == 'Agriculture':
            age = np.random.randint(0, 40)
        elif cat == 'Building':
            age = np.random.randint(1, 40)
        else:  # Industry
            age = np.random.randint(1, 35)

        tenure = np.random.choice(tenures, p=[0.55, 0.35, 0.10])

        structure_present = (
            cat in ('Building', 'Industry')
            or acquisition_area >= AGRICULTURE_STRUCTURE_THRESHOLD_M2
        )
        if structure_present:
            s_low, s_high = STRUCTURE_RATIO[cat]
            structure_area = max(1, int(acquisition_area * np.random.uniform(s_low, s_high)))
        else:
            structure_area = 0

        # VALUATION CALCULATION (MYR)
        # Taking only a slice of a parcel costs a little more per m2 than
        # acquiring the whole parcel, so the acquired share adjusts the rate.
        share_uplift = 1.15 - 0.30 * acquisition_ratio
        land_rate = (CAT_CONFIG[cat]['land_rate']
                     * STATES_MULTIPLIER[state] * loc_mult[loc_type] * tenure_mult[tenure]
                     * share_uplift)
        land_value = acquisition_area * land_rate

        structure_base = structure_area * CAT_CONFIG[cat]['structure_cost']
        depreciation_rate = min(0.60, age * 0.015)
        structure_depreciated = structure_base * (1.0 - depreciation_rate)

        # Standing crops on the acquired farmland (derived from acquired area).
        if cat == 'Agriculture':
            crop_value = min(250, int(acquisition_area / 800)) * 420
        else:
            crop_value = 0

        location_variance = 1.0 + np.random.normal(0, 0.02)
        total_market_val = (land_value + structure_depreciated + crop_value) * location_variance

        # Market variance noise (+- 4%)
        noise = np.random.normal(0, total_market_val * 0.04)
        market_val_final = int(max(45000, round((total_market_val + noise) / 1000) * 1000))

        # Land Acquisition Act 1960 statutory compensations
        statutory_disturbance = int(round((market_val_final * 0.15) / 100) * 100)
        relocation_allowance = 8000 if structure_present else 2000
        recommended_compensation = market_val_final + statutory_disturbance + relocation_allowance

        data.append({
            'case_id': case_id,
            'state': state,
            'land_category': cat,
            'location_type': loc_type,
            'tenure_type': tenure,
            'land_area_m2': int(land_area),
            'acquisition_area_m2': int(acquisition_area),
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

    print("\nDataset Generation Complete (7 attributes, acquisition-area based compensation)!")
    print(f"Set 1 (Training Dataset): {len(df_train)} rows, {len(df_train.columns)} columns.")
    print(f"Set 2 (Testing Dataset): {len(df_test)} rows, {len(df_test.columns)} columns.")
