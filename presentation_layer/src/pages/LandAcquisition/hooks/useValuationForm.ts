import { useState } from "react";
import type { ValuationFormData } from "../types/land-acquisition.types";
import { parseCurrencyToNumber, formatCurrencyWithDecimals } from "../../../utils/currency";
import { valuateProperty } from "../../../services/predictionApi";

const initialValuationFormData: ValuationFormData = {
  landArea: "",
  acquisitionArea: "",
  builtUpArea: "",
  valuationMethod: "",
  locationType: "",
  buildingAge: "",
  marketRatePerSqMeter: "",
  compensationRatePerSqMeter: "",
  remarks: "",
  buildingAssessment: null,
  siteInspection: null,
  aiValuationPrice: "",
};

export function useValuationForm() {
  const [formData, setFormData] = useState<ValuationFormData>(initialValuationFormData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isCalculatingAi, setIsCalculatingAi] = useState<boolean>(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (hasCase: boolean): boolean => {
    const errors: Record<string, string> = {};

    if (!hasCase) {
      return false;
    }

    const landNum = parseCurrencyToNumber(formData.landArea);
    const acqNum = parseCurrencyToNumber(formData.acquisitionArea);
    const builtNum = parseCurrencyToNumber(formData.builtUpArea);
    const marketRateNum = parseCurrencyToNumber(formData.marketRatePerSqMeter);
    const compRateNum = parseCurrencyToNumber(formData.compensationRatePerSqMeter);

    if (!formData.landArea.trim() || landNum <= 0) {
      errors.landArea = "Land Area is required and must be greater than 0.";
    }

    if (!formData.acquisitionArea.trim() || acqNum <= 0) {
      errors.acquisitionArea = "Acquisition Area is required and must be greater than 0.";
    } else if (landNum > 0 && acqNum > landNum) {
      errors.acquisitionArea =
        "Land Area must be greater than or equal to Acquisition Area (Land Area >= Acquisition Area).";
    }

    if (!formData.builtUpArea.trim() || isNaN(builtNum) || builtNum < 0) {
      errors.builtUpArea = "Built-Up Area is required (0 for vacant land).";
    } else if (landNum > 0 && builtNum >= landNum) {
      errors.builtUpArea =
        "Land Area must be greater than Built-Up Area (Land Area > Built-Up Area).";
    }

    if (!formData.valuationMethod.trim()) {
      errors.valuationMethod = "Valuation Method is required.";
    }

    if (!formData.locationType.trim()) {
      errors.locationType = "Location Type is required.";
    }

    if (
      !formData.buildingAge.trim() ||
      isNaN(Number(formData.buildingAge)) ||
      Number(formData.buildingAge) < 0
    ) {
      errors.buildingAge = "Building Age cannot be less than 0 year.";
    }

    if (!formData.marketRatePerSqMeter.trim() || isNaN(marketRateNum) || marketRateNum <= 0) {
      errors.marketRatePerSqMeter =
        "Market Price (RM /m²) is required and cannot be negative or zero.";
    }

    if (
      !formData.compensationRatePerSqMeter.trim() ||
      isNaN(compRateNum) ||
      compRateNum <= 0
    ) {
      errors.compensationRatePerSqMeter =
        "Recommended Compensation (RM /m²) is required and cannot be negative or zero.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateAiPrediction = async (caseInfo: {
    state?: string;
    category?: string;
    tenureType?: string;
    rawArea?: number;
  }) => {
    setIsCalculatingAi(true);
    let predictedAiPrice = "";

    try {
      const acqAreaVal = parseCurrencyToNumber(formData.acquisitionArea);
      const builtUpAreaVal = parseCurrencyToNumber(formData.builtUpArea);
      const bldgAgeNum = Math.max(0, parseInt(formData.buildingAge, 10) || 0);

      const res = await valuateProperty({
        state: caseInfo.state || "Selangor",
        land_category: caseInfo.category || "AGRICULTURE",
        location_type: formData.locationType || "Urban",
        tenure_type: caseInfo.tenureType || "FREEHOLD",
        building_condition: "Good",
        land_area_sqft: acqAreaVal,
        built_up_area_sqft: builtUpAreaVal,
        building_age_years: bldgAgeNum,
      });

      if (res && typeof res.marketValueMyr === "number" && !isNaN(res.marketValueMyr)) {
        predictedAiPrice = formatCurrencyWithDecimals(res.marketValueMyr);
      }
    } catch (err) {
      console.error("AI valuation prediction failed:", err);
      throw err;
    } finally {
      setIsCalculatingAi(false);
    }

    return predictedAiPrice;
  };

  return {
    formData,
    setFormData,
    validationErrors,
    setValidationErrors,
    isCalculatingAi,
    handleInputChange,
    validateForm,
    calculateAiPrediction,
  };
}
