import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { CaseForm } from "../../components/CaseForm";
import type { CaseFormData, Owner, Document } from "../../components/CaseForm";

export const CaseRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: {
    formData: CaseFormData;
    owners: Owner[];
    documents: Document[];
  }) => {
    setIsSubmitting(true);
    try {
      const payload = {
        project: {
          projectName: data.formData.projectName,
          projectType: data.formData.projectType,
          purpose: data.formData.projectPurpose,
          budget: parseFloat(data.formData.projectBudget.replace(/[^0-9.]/g, "")) || 1000000,
          fundingSource: data.formData.fundingSource || "Government (Ministry)",
        },
        land: {
          landTitleNo: data.formData.landTitleNumber,
          lotNo: data.formData.lotNumber,
          mukim: data.formData.mukim,
          district: data.formData.district,
          state: data.formData.state,
          area: parseFloat(data.formData.landArea) || 1.0,
          areaUnit: "HECTARE",
          category: data.formData.landCategory || "Residential",
          latitude: parseFloat(data.formData.gpsLatitude) || 3.139,
          longitude: parseFloat(data.formData.gpsLongitude) || 101.6869,
        },
        owners: data.owners.map((o) => ({
          name: o.name,
          nric: o.icNumber,
          address: o.address,
          contact: o.phone,
          ownershipType: o.ownershipType || "Individual",
        })),
        caseTitle: `${data.formData.projectName} - ${data.formData.landTitleNumber}`,
        remarks: "Case registered via online registration portal",
      };

      const result = await landAcquisitionApi.createCase(payload);
      const newCaseId = result.case.caseId;

      // Upload documents if attached
      for (const doc of data.documents) {
        if (doc.file && doc.type) {
          try {
            await landAcquisitionApi.uploadDocument(newCaseId, doc.file, doc.type);
          } catch (docErr) {
            console.warn("Document upload warning:", docErr);
          }
        }
      }

      alert(`Case Registered Successfully in Backend!\n\nCase ID: ${newCaseId}\nStatus: Case Registered`);
      navigate('/admin/case/details', { state: { caseId: newCaseId } });
    } catch (err: any) {
      console.error("Case registration failed:", err);
      alert(`Registration Failed: ${err.message || "Could not reach backend"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CaseForm
      mode="create"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      onCancel={() => navigate("/admin/case")}
    />
  );
};
