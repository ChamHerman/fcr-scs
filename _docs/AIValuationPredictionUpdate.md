# AI Valuation Prediction Service Update Plan

**Target Module:** `business_logic_layer/ai_prediction_service` & `data_layer/ai_model_repository`  
**Purpose:** Align the AI Property Valuation Machine Learning model schema with the official Land Acquisition & Land Parcel database constants.  
**Scope:** Dataset generator, ML model training pipeline, Python Flask sidecar, Node.js prediction service layer, and frontend prediction interfaces.

---

## 1. Overview & Motivation

The previous AI valuation model was trained on legacy synthetic features (e.g. `Rural_Coastal`, `Leasehold_99`, `Residential`, `Commercial`, and `building_condition`). 

To maintain consistency across the system, the AI prediction service must be updated to align with the actual data captured in the **Land Parcel Database (`land_parcel`)** and the **Valuation Report Creation Module**.

---

## 2. Updated AI Feature Schema

The new AI Prediction feature schema consists of **7 input features** (4 Categorical + 3 Numeric):

### A. Categorical Features (4 Features)

| Feature Name | Source Constant / Enum | Allowed / Valid Values |
|---|---|---|
| `state` | `MALAYSIA_STATES` in `malaysiaLocations.ts` | `['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'Wilayah Persekutuan Kuala Lumpur', 'Wilayah Persekutuan Labuan', 'Wilayah Persekutuan Putrajaya']` |
| `land_category` | `LAND_CATEGORY_OPTIONS` in `landAcquisition.ts` / Prisma `LandCategory` | `['Agriculture', 'Building', 'Industry']` *(or uppercase `['AGRICULTURE', 'BUILDING', 'INDUSTRY']`)* |
| `location_type` | `LOCATION_TYPE_OPTIONS` in `landAcquisition.ts` | `['Urban', 'Suburban', 'Rural']` |
| `tenure_type` | `TENURE_TYPE_OPTIONS` in `landAcquisition.ts` / Prisma `TenureType` | `['Freehold', 'Leasehold', 'Malay Reserve']` *(or uppercase `['FREEHOLD', 'LEASEHOLD', 'MALAY_RESERVE']`)* |

### B. Numeric Features (3 Features)

| Feature Name | Unit | Source | Description |
|---|---|---|---|
| `land_area_sqft` | Square Feet ($sqft$) | Land Parcel Table (`area` in $m^2 \times 10.7639$) | Total land parcel plot area |
| `built_up_area_sqft` | Square Feet ($sqft$) | Valuation Form (`builtUpArea` in $m^2 \times 10.7639$) | Gross built-up area of structures (0 if vacant land) |
| `building_age_years` | Years (Integer $\ge 0$) | Valuation Form (`buildingAge`) | Age of physical structures on the parcel |

### C. Dropped / Removed Features

- **`building_condition` (REMOVED)**: Drop `building_condition` from dataset generation, ML pipeline One-Hot Encoding, API validation, and frontend inputs.

---

## 3. Step-by-Step Implementation Guide

```
+-------------------------------------------------------------------------------+
|                        AI Valuation Model Update Flow                         |
+-------------------------------------------------------------------------------+
                                        |
  Step 1: Update Dataset Generator      | business_logic_layer/ai_prediction_service/generate_datasets.py
                                        v
  Step 2: Update ML Core & Pipelines    | business_logic_layer/ai_prediction_service/ml_core.py
                                        v
  Step 3: Regenerate & Retrain Model    | Run generate_datasets.py & train_model.py
                                        v
  Step 4: Update Python Sidecar         | business_logic_layer/ai_prediction_service/app.py
                                        v
  Step 5: Update Node.js Backend Layer  | business_logic_layer/ai_prediction_service/src/
                                        v
  Step 6: Update Frontend Types & Pages | presentation_layer/src/
```

---

### Step 1: Update Dataset Generator (`generate_datasets.py`)

**File:** `business_logic_layer/ai_prediction_service/generate_datasets.py`

1. **Update `states_data`**:
   Add realistic base price multipliers for all 16 Malaysian states/territories from `MALAYSIA_STATES`:
   ```python
   states_data = {
       'Selangor': {'base_multiplier': 1.45},
       'Wilayah Persekutuan Kuala Lumpur': {'base_multiplier': 1.60},
       'Wilayah Persekutuan Putrajaya': {'base_multiplier': 1.40},
       'Pulau Pinang': {'base_multiplier': 1.35},
       'Johor': {'base_multiplier': 1.18},
       'Melaka': {'base_multiplier': 1.05},
       'Negeri Sembilan': {'base_multiplier': 1.02},
       'Perak': {'base_multiplier': 0.88},
       'Kedah': {'base_multiplier': 0.85},
       'Pahang': {'base_multiplier': 0.90},
       'Terengganu': {'base_multiplier': 0.85},
       'Kelantan': {'base_multiplier': 0.80},
       'Perlis': {'base_multiplier': 0.78},
       'Sabah': {'base_multiplier': 0.95},
       'Sarawak': {'base_multiplier': 0.98},
       'Wilayah Persekutuan Labuan': {'base_multiplier': 1.10}
   }
   ```
2. **Update `land_categories`**:
   Replace `['Residential', 'Commercial', 'Agricultural', 'Industrial']` with:
   ```python
   land_categories = ['Agriculture', 'Building', 'Industry']
   cat_probs = [0.45, 0.40, 0.15]
   cat_rates = {'Building': 190, 'Industry': 180, 'Agriculture': 45}
   cat_material_cost_per_sqft = {'Building': 195, 'Industry': 195, 'Agriculture': 95}
   ```
3. **Update `location_types`**:
   Replace `Rural_Coastal` with `Rural`:
   ```python
   loc_mult = {'Urban': 0.95, 'Suburban': 0.83, 'Rural': 0.70}
   ```
4. **Update `tenures`**:
   Replace `Leasehold_99` and `Malay_Reserve` with `Leasehold` and `Malay Reserve`:
   ```python
   tenures = ['Freehold', 'Leasehold', 'Malay Reserve']
   tenure_mult = {'Freehold': 1.05, 'Leasehold': 0.98, 'Malay Reserve': 0.92}
   ```
5. **Remove `building_condition`**:
   - Remove `conditions` list and `cond_mult`.
   - Update structure depreciated value calculation to remove `cond_mult[condition]`:
     ```python
     depreciation_rate = min(0.60, age * 0.015)
     structure_depreciated = structure_base * (1.0 - depreciation_rate)
     ```
6. **Update DataFrame columns**:
   Ensure generated dataset CSV excludes `building_condition`.

---

### Step 2: Update ML Core Logic (`ml_core.py`)

**File:** `business_logic_layer/ai_prediction_service/ml_core.py`

1. **Update Feature Lists**:
   ```python
   CATEGORICAL_FEATURES = ['state', 'land_category', 'location_type', 'tenure_type']
   NUMERIC_FEATURES = ['land_area_sqft', 'built_up_area_sqft', 'building_age_years']
   FEATURE_COLUMNS = CATEGORICAL_FEATURES + NUMERIC_FEATURES
   TARGET_COLUMN = 'market_value_myr'
   ```
2. **Update `VALID_VALUES`**:
   ```python
   VALID_VALUES = {
       'state': [
           'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
           'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
           'Terengganu', 'Wilayah Persekutuan Kuala Lumpur',
           'Wilayah Persekutuan Labuan', 'Wilayah Persekutuan Putrajaya'
       ],
       'land_category': ['Agriculture', 'Building', 'Industry'],
       'location_type': ['Urban', 'Suburban', 'Rural'],
       'tenure_type': ['Freehold', 'Leasehold', 'Malay Reserve'],
   }
   ```
3. **Update `validate_feature_payload`**:
   Ensure payload validation only checks the 4 categorical and 3 numeric features (no `building_condition`).

---

### Step 3: Regenerate Dataset & Retrain Model

Run the Python commands to generate fresh datasets and retrain the `.joblib` model artifact:

```bash
# 1. Activate Python virtual environment (if applicable)
cd "business_logic_layer/ai_prediction_service"

# 2. Regenerate training & test datasets
python generate_datasets.py

# 3. Train and persist the updated Random Forest Regressor model
python train_model.py
```

Expected output:
- `data_layer/ai_model_repository/datasets/fcr_scs_valuation_train_dataset.csv` updated (7 features + target).
- `data_layer/ai_model_repository/datasets/fcr_scs_valuation_test_dataset.csv` updated.
- `data_layer/ai_model_repository/models/fcr_scs_property_valuation_rf.joblib` regenerated with $R^2 \ge 0.95$.
- `data_layer/ai_model_repository/models/model_registry.json` updated with active version metadata.

---

### Step 4: Update Python Sidecar (`app.py`)

**File:** `business_logic_layer/ai_prediction_service/app.py`

1. **Verify `/predict` endpoint**:
   - Ensure `payload` does not require `building_condition`.
   - Ensure template generator `download_template` outputs the new 7-feature header.

---

### Step 5: Update Node.js / TypeScript AI Prediction Service Layer

#### A. Interfaces (`src/interfaces/prediction.types.ts`)
```typescript
export interface ValuationInput {
  state: string;
  land_category: string;
  location_type: string;
  tenure_type: string;
  land_area_sqft: number;
  built_up_area_sqft: number;
  building_age_years: number;
}
```

#### B. Validators (`src/validators/prediction.validator.ts`)
```typescript
import { ValuationInput } from "../interfaces/prediction.types";

const REQUIRED_FEATURES: (keyof ValuationInput)[] = [
  "state",
  "land_category",
  "location_type",
  "tenure_type",
  "land_area_sqft",
  "built_up_area_sqft",
  "building_age_years",
];

export function validateValuationPayload(body: Record<string, unknown>): string | null {
  const missing = REQUIRED_FEATURES.filter((f) => body[f] === undefined || body[f] === "");
  if (missing.length > 0) {
    return `Missing required attributes: ${missing.join(", ")}`;
  }
  return null;
}
```

#### C. Controller (`src/controllers/prediction.controller.ts`)
```typescript
export async function valuate(req: Request, res: Response): Promise<void> {
  const validationError = validateValuationPayload(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const input: ValuationInput = {
      state: String(req.body.state),
      land_category: String(req.body.land_category),
      location_type: String(req.body.location_type),
      tenure_type: String(req.body.tenure_type),
      land_area_sqft: Number(req.body.land_area_sqft),
      built_up_area_sqft: Number(req.body.built_up_area_sqft),
      building_age_years: Number(req.body.building_age_years),
    };
    const breakdown = await predictionService.valuate(input);
    res.json({ success: true, data: breakdown });
  } catch (e: unknown) {
    handleError(res, e);
  }
}
```

---

### Step 6: Update Frontend Prediction Services & UI Pages

#### A. Prediction API Client (`presentation_layer/src/services/predictionApi.ts`)
1. Update `VALUATION_OPTIONS`:
   ```typescript
   export const VALUATION_OPTIONS = {
     states: [
       'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
       'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
       'Terengganu', 'Wilayah Persekutuan Kuala Lumpur',
       'Wilayah Persekutuan Labuan', 'Wilayah Persekutuan Putrajaya'
     ],
     landCategories: ['Agriculture', 'Building', 'Industry'],
     locationTypes: ['Urban', 'Suburban', 'Rural'],
     tenureTypes: ['Freehold', 'Leasehold', 'Malay Reserve'],
   };
   ```
2. Update `ValuationInput` interface (remove `building_condition`).

#### B. Standalone Prediction Page (`GenerateAIValuation.tsx`)
- Remove the `Building Condition` select field and form state.
- Ensure state, land category, location type, and tenure dropdowns use the updated options.

#### C. Valuation Report Generator (`ValuationCreate.tsx`)
- Directly send `state`, `land_category`, `location_type`, `tenure_type`, `land_area_sqft`, `built_up_area_sqft`, `building_age_years` to `POST /api/prediction/valuate` when **Generate Report** is clicked.

---

## 4. Testing & Verification Checklist

- [ ] **Data Generation:** `python generate_datasets.py` runs without errors; dataset rows contain the updated columns and valid values.
- [ ] **Model Training:** `python train_model.py` successfully trains and reports $R^2 \ge 0.95$ on test split.
- [ ] **Sidecar Health:** Python sidecar `/predict` endpoint returns valid HTTP 200 responses for sample payloads with the 7 features.
- [ ] **Backend Build:** `npm run build` in `business_logic_layer` (or root) succeeds without TypeScript compiler errors.
- [ ] **Frontend Build:** `npm run build` in `presentation_layer` succeeds without TypeScript compiler errors.
- [ ] **End-to-End Test:** In the UI, selecting an acquisition case and clicking "Generate Report" calls `POST /api/prediction/valuate` with the 7 features and displays the predicted market value in the summary modal.
