import { useState, useMemo } from "react";
import type { CompensationFormData } from "../types/compensation.types";
import { parseCurrencyToNumber } from "../../../utils/currency";

const initialCompensationFormData: CompensationFormData = {
  landValue: "",
  buildingValue: "",
  cropValue: "",
  businessDisruption: "",
  disturbanceCompensation: "",
  relocationAllowance: "",
  otherEligible: "",
  remarks: "",
};

export function useCompensationForm() {
  const [formData, setFormData] = useState<CompensationFormData>(initialCompensationFormData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const calculatedTotal = useMemo(() => {
    const lv = parseCurrencyToNumber(formData.landValue);
    const bv = parseCurrencyToNumber(formData.buildingValue);
    const cv = parseCurrencyToNumber(formData.cropValue);
    const bd = parseCurrencyToNumber(formData.businessDisruption);
    const dc = parseCurrencyToNumber(formData.disturbanceCompensation);
    const ra = parseCurrencyToNumber(formData.relocationAllowance);
    const oe = parseCurrencyToNumber(formData.otherEligible);
    return Math.round((lv + bv + cv + bd + dc + ra + oe) * 100) / 100;
  }, [formData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

    const landVal = parseCurrencyToNumber(formData.landValue);
    const bldgValNum = parseCurrencyToNumber(formData.buildingValue);
    const cropValNum = parseCurrencyToNumber(formData.cropValue);
    const bdValNum = parseCurrencyToNumber(formData.businessDisruption);
    const dcValNum = parseCurrencyToNumber(formData.disturbanceCompensation);
    const raValNum = parseCurrencyToNumber(formData.relocationAllowance);
    const oeValNum = parseCurrencyToNumber(formData.otherEligible);

    if (!formData.landValue.trim() || isNaN(landVal) || landVal <= 0) {
      errors.landValue = "Land Value is required, must be filled in, and cannot be negative or zero.";
    }

    if (bldgValNum < 0) {
      errors.buildingValue = "Building Value cannot be negative.";
    }

    if (cropValNum < 0) {
      errors.cropValue = "Crop Value cannot be negative.";
    }

    if (bdValNum < 0) {
      errors.businessDisruption = "Business Disruption cannot be negative.";
    }

    if (dcValNum < 0) {
      errors.disturbanceCompensation = "Disturbance Compensation cannot be negative.";
    }

    if (raValNum < 0) {
      errors.relocationAllowance = "Relocation Allowance cannot be negative.";
    }

    if (oeValNum < 0) {
      errors.otherEligible = "Other Eligible cannot be negative.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return {
    formData,
    setFormData,
    validationErrors,
    setValidationErrors,
    calculatedTotal,
    handleInputChange,
    validateForm,
  };
}
