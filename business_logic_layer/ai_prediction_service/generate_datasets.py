import os
import numpy as np
import pandas as pd

def generate_unified_valuation_dataset(n_samples=6000, random_seed=42, case_prefix="TR"):
    """
    Generates a tabular valuation dataset for FCR-SCS (Property, Land, and Resettlement Compensation)
    using realistic Malaysian valuation parameters.

    Reduced schema: 8 input attributes + compensation targets. Drivers that were
    dropped (construction material, distances, crop count, property type,
    district/mukim) are folded into per-category constants so the market value
    stays explainable by the 8 retained attributes.
    """
    np.random.seed(random_seed)

    states_data = {
        'Selangor': {'base_multiplier': 1.45},
        'Penang': {'base_multiplier': 1.35},
        'Johor': {'base_multiplier': 1.18},
        'Melaka': {'base_multiplier': 1.05},
        'Pahang': {'base_multiplier': 0.90},
        'Perak': {'base_multiplier': 0.88},
        'Terengganu': {'base_multiplier': 0.85},
        'Sabah': {'base_multiplier': 0.95},
        'Sarawak': {'base_multiplier': 0.98}
    }

    land_categories = ['Residential', 'Commercial', 'Agricultural', 'Industrial']
    cat_probs = [0.50, 0.20, 0.20, 0.10]
    cat_rates = {'Commercial': 260, 'Residential': 155, 'Industrial': 180, 'Agricultural': 42}

    # Dominant construction cost per sqft per category (was a separate
    # construction_material attribute).
    cat_material_cost_per_sqft = {
        'Commercial': 210,
        'Residential': 185,
        'Industrial': 195,
        'Agricultural': 95
    }

    tenures = ['Freehold', 'Leasehold_99', 'Malay_Reserve']
    tenure_mult = {'Freehold': 1.05, 'Leasehold_99': 0.98, 'Malay_Reserve': 0.92}

    conditions = ['Excellent', 'Good', 'Fair', 'Poor']
    cond_mult = {'Excellent': 1.15, 'Good': 1.00, 'Fair': 0.85, 'Poor': 0.65}

    # Location multiplier now absorbs both the urban/rural premium and the
    # average distance-to-city/road discount from the previous schema.
    loc_mult = {'Urban': 0.95, 'Suburban': 0.83, 'Rural_Coastal': 0.70}

    data = []

    for i in range(1, n_samples + 1):
        case_id = f"CASE-2026-{case_prefix}-{i:05d}"

        state = np.random.choice(list(states_data.keys()), p=[0.25, 0.18, 0.16, 0.08, 0.08, 0.08, 0.05, 0.06, 0.06])
        loc_type = np.random.choice(list(loc_mult.keys()), p=[0.40, 0.40, 0.20])
        cat = np.random.choice(land_categories, p=cat_probs)

        if cat == 'Residential':
            land_area = np.random.randint(1300, 7500)
            built_up = int(land_area * np.random.uniform(0.55, 0.95))
            age = np.random.randint(1, 35)
        elif cat == 'Commercial':
            land_area = np.random.randint(1500, 12000)
            built_up = int(land_area * np.random.uniform(0.70, 1.40))
            age = np.random.randint(1, 28)
        elif cat == 'Industrial':
            land_area = np.random.randint(4000, 35000)
            built_up = int(land_area * np.random.uniform(0.40, 0.75))
            age = np.random.randint(1, 30)
        else:  # Agricultural
            land_area = np.random.randint(15000, 65000)
            built_up = np.random.choice([0, np.random.randint(400, 1500)], p=[0.60, 0.40])
            age = np.random.randint(0, 40)

        tenure = np.random.choice(tenures, p=[0.55, 0.35, 0.10])
        condition = np.random.choice(conditions, p=[0.25, 0.45, 0.22, 0.08])

        # VALUATION CALCULATION (MYR)
        state_factor = states_data[state]['base_multiplier']
        land_rate_adjusted = cat_rates[cat] * state_factor * loc_mult[loc_type] * tenure_mult[tenure]
        land_value = land_area * land_rate_adjusted

        structure_unit_cost = cat_material_cost_per_sqft[cat]
        structure_base = built_up * structure_unit_cost

        # Depreciation (approx 1.5% per year up to max 60%)
        depreciation_rate = min(0.60, age * 0.015)
        structure_depreciated = structure_base * (1.0 - depreciation_rate) * cond_mult[condition]

        # Crop valuation: derived internally from farmland size (no user input).
        if cat == 'Agricultural':
            num_crops = min(180, int(land_area / 350))
        else:
            num_crops = 0
        crop_value = num_crops * 420

        # Small residual variance around the location multiplier replaces the
        # continuous distance penalty of the old schema.
        location_variance = 1.0 + np.random.normal(0, 0.02)

        total_market_val = (land_value + structure_depreciated + crop_value) * location_variance

        # Market variance noise (+- 4%)
        noise = np.random.normal(0, total_market_val * 0.04)
        market_val_final = int(max(45000, round((total_market_val + noise) / 1000) * 1000))

        # Land Acquisition Act 1960 Statutory Compensations:
        # Statutory 15% Solatium / Disturbance allowance
        statutory_disturbance = int(round((market_val_final * 0.15) / 100) * 100)
        relocation_allowance = 8000 if built_up > 0 else 2000
        recommended_compensation = market_val_final + statutory_disturbance + relocation_allowance

        data.append({
            'case_id': case_id,
            'state': state,
            'land_category': cat,
            'location_type': loc_type,
            'tenure_type': tenure,
            'land_area_sqft': int(land_area),
            'built_up_area_sqft': int(built_up),
            'building_age_years': int(age),
            'building_condition': condition,
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

    print("\nDataset Generation Complete (8 Valuation Attributes)!")
    print(f"Set 1 (Training Dataset): {len(df_train)} rows, {len(df_train.columns)} columns.")
    print(f"Set 2 (Testing Dataset): {len(df_test)} rows, {len(df_test.columns)} columns.")
