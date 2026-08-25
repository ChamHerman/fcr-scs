import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Lucide from "lucide-react";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import { CaseForm } from "../../components/CaseForm";
import type { CaseFormData, Owner, Document } from "../../components/CaseForm";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { useNotification } from "../../components/ui/NotificationSystem";

export const CaseRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authorised roles for case registration: Government Officers, System Administrators
  const isAuthorized =
    !user ||
    user.role === "GOVERNMENT_OFFICER" ||
    user.role === "SYSTEM_ADMINISTRATOR";

  if (user && !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-md-background p-6">
        <div className="text-center p-8 bg-md-surface-container rounded-2xl shadow-sm border border-md-outline/10 max-w-md">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <Lucide.ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-md-on-surface mb-2">Access Restricted</h2>
          <p className="text-sm text-md-on-surface-variant mb-6">
            Only authorised Government Officers can create new land acquisition cases. Government Administrators have supervisory and assignment access.
          </p>
          <Button variant="filled" onClick={() => navigate("/admin/case")}>
            Return to Case Management
          </Button>
        </div>
      </div>
    );
  }

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
        createdById: user?.userId || "00000000-0000-0000-0000-000000000001",
      };

      const result = await landAcquisitionApi.createCase(payload);
      const newCaseId = result.case.caseId;

      // Upload documents if attached
      for (const doc of data.documents) {
        if (doc.file && doc.type) {
          try {
            await landAcquisitionApi.uploadDocument(newCaseId, doc.file, doc.type, user?.userId);
          } catch (docErr) {
            console.warn("Document upload warning:", docErr);
          }
        }
      }

      notify({
        type: 'success',
        title: 'Case Registered',
        message: `Case ID: ${newCaseId} — Status: Case Registered`,
      });
      navigate('/admin/case/details', { state: { caseId: newCaseId } });
    } catch (err: any) {
      console.error("Case registration failed:", err);
      notify({
        type: 'error',
        title: 'Registration Failed',
        message: err.message || "Could not reach backend",
      });
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
