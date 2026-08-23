import * as Lucide from "lucide-react";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Select, type SelectOption } from "./ui/Select";
import { Textarea } from "./ui/Textarea";
import { IconButton } from "./ui/IconButton";
import { FileUpload } from "./ui/FileUpload";
import "../style.css";
import "../pages/LandAcquisition/case_management.css";

export type Owner = {
  id: string;
  name: string;
  icNumber: string;
  address: string;
  phone: string;
  ownershipType: string;
};

export type Document = {
  id: string;
  type: string;
  file: File | null;
  fileName: string;
};

export type CaseFormData = {
  customCaseId?: string;
  projectName: string;
  projectType: string;
  projectPurpose: string;
  projectBudget: string;
  fundingSource: string;
  landTitleNumber: string;
  lotNumber: string;
  mukim: string;
  district: string;
  state: string;
  landArea: string;
  landCategory: string;
  gpsLatitude: string;
  gpsLongitude: string;
};

export interface CaseFormProps {
  mode: "create" | "edit";
  initialStep?: number;
  targetSection?: string;
  initialValues?: {
    formData?: Partial<CaseFormData>;
    owners?: Owner[];
    documents?: Document[];
  };
  onSubmit: (data: {
    formData: CaseFormData;
    owners: Owner[];
    documents: Document[];
  }) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

const PROJECT_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select type" },
  { value: "Public Amenities", label: "Public Amenities" },
  { value: "Transportation Development", label: "Transportation Development" },
  { value: "Urban Redevelopment", label: "Urban Redevelopment" },
  { value: "Tourism Development", label: "Tourism Development" },
  { value: "Others", label: "Others" },
];

const OWNERSHIP_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select type" },
  { value: "Individual", label: "Individual" },
  { value: "Joint", label: "Joint" },
  { value: "Company", label: "Company" },
  { value: "Trust", label: "Trust" },
  { value: "Other", label: "Other" },
];

const DOCUMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select type" },
  { value: "Project Approval Letter", label: "Project Approval Letter" },
  { value: "Development Plan", label: "Development Plan" },
  { value: "Gazette", label: "Gazette" },
  { value: "Survey Plan", label: "Survey Plan" },
  { value: "Land Title Copy", label: "Land Title Copy" },
  { value: "Location Map", label: "Location Map" },
  { value: "Satellite Image", label: "Satellite Image" },
  { value: "Others", label: "Others" },
];

export const CaseForm: React.FC<CaseFormProps> = ({
  mode,
  initialStep = 0,
  targetSection,
  initialValues,
  onSubmit,
  isSubmitting = false,
  onCancel,
}) => {
  const isSectionEdit = mode === "edit" && Boolean(targetSection);
  const isWholeCaseEdit = mode === "edit" && !targetSection;
  const isCreate = mode === "create";

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState<CaseFormData>({
    customCaseId: initialValues?.formData?.customCaseId || "",
    projectName: initialValues?.formData?.projectName || "",
    projectType: initialValues?.formData?.projectType || "",
    projectPurpose: initialValues?.formData?.projectPurpose || "",
    projectBudget: initialValues?.formData?.projectBudget || "",
    fundingSource: initialValues?.formData?.fundingSource || "",
    landTitleNumber: initialValues?.formData?.landTitleNumber || "",
    lotNumber: initialValues?.formData?.lotNumber || "",
    mukim: initialValues?.formData?.mukim || "",
    district: initialValues?.formData?.district || "",
    state: initialValues?.formData?.state || "",
    landArea: initialValues?.formData?.landArea || "",
    landCategory: initialValues?.formData?.landCategory || "",
    gpsLatitude: initialValues?.formData?.gpsLatitude || "",
    gpsLongitude: initialValues?.formData?.gpsLongitude || "",
  });

  const [owners, setOwners] = useState<Owner[]>(
    initialValues?.owners && initialValues.owners.length > 0
      ? initialValues.owners
      : [
          {
            id: "1",
            name: "",
            icNumber: "",
            address: "",
            phone: "",
            ownershipType: "",
          },
        ]
  );

  const [documents, setDocuments] = useState<Document[]>(
    initialValues?.documents && initialValues.documents.length > 0
      ? initialValues.documents
      : [{ id: "1", type: "", file: null, fileName: "" }]
  );

  React.useEffect(() => {
    if (initialValues?.formData) {
      setFormData((prev) => ({
        ...prev,
        ...initialValues.formData,
      }));
    }
    if (initialValues?.owners && initialValues.owners.length > 0) {
      setOwners(initialValues.owners);
    }
    if (initialValues?.documents && initialValues.documents.length > 0) {
      setDocuments(initialValues.documents);
    }
  }, [initialValues]);

  const handleFieldChange = (name: keyof CaseFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addOwner = () => {
    const newOwner: Owner = {
      id: Date.now().toString(),
      name: "",
      icNumber: "",
      address: "",
      phone: "",
      ownershipType: "",
    };
    setOwners([...owners, newOwner]);
  };

  const removeOwner = (id: string) => {
    if (owners.length <= 1) return;
    setOwners(owners.filter((o) => o.id !== id));
  };

  const handleOwnerChange = (id: string, field: keyof Owner, value: string) => {
    setOwners(owners.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  };

  const addDocument = () => {
    const newDoc: Document = {
      id: Date.now().toString(),
      type: "",
      file: null,
      fileName: "",
    };
    setDocuments([...documents, newDoc]);
  };

  const removeDocument = (id: string) => {
    if (documents.length <= 1) return;
    setDocuments(documents.filter((d) => d.id !== id));
  };

  const handleDocumentTypeChange = (id: string, type: string) => {
    setDocuments(documents.map((d) => (d.id === id ? { ...d, type } : d)));
  };

  const handleFileUpload = (id: string, file: File | null) => {
    if (file) {
      setDocuments(
        documents.map((d) =>
          d.id === id ? { ...d, file, fileName: file.name } : d
        )
      );
    }
  };

  const validateStep = (stepIndex: number): boolean => {
    if (stepIndex === 0) {
      const { projectName, projectType, projectPurpose, projectBudget, fundingSource } = formData;
      if (!projectName || !projectType || !projectPurpose || !projectBudget || !fundingSource) {
        alert("Please fill all required fields in Project Information.");
        return false;
      }
    } else if (stepIndex === 1) {
      const { landTitleNumber, lotNumber, mukim, district, state, landArea, landCategory, gpsLatitude, gpsLongitude } = formData;
      if (!landTitleNumber || !lotNumber || !mukim || !district || !state || !landArea || !landCategory || !gpsLatitude || !gpsLongitude) {
        alert("Please fill all required fields in Land Information.");
        return false;
      }
    } else if (stepIndex === 2) {
      for (const owner of owners) {
        if (!owner.name || !owner.icNumber || !owner.address || !owner.phone || !owner.ownershipType) {
          alert("Please fill all required fields for each owner.");
          return false;
        }
      }
    } else if (stepIndex === 3) {
      if (mode === "create") {
        const hasValidDoc = documents.some((d) => d.type && d.file);
        if (!hasValidDoc) {
          alert("Please upload at least one supporting document with a selected type.");
          return false;
        }
      }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleFormSubmit = async () => {
    if (!validateStep(currentStep)) return;
    await onSubmit({ formData, owners, documents });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-md-on-surface">
              Project Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <Input
                  label="Project Name *"
                  name="projectName"
                  value={formData.projectName}
                  onChange={(e) => handleFieldChange("projectName", e.target.value)}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Select
                  label="Project Type *"
                  value={formData.projectType}
                  options={PROJECT_TYPE_OPTIONS}
                  onChange={(val) => handleFieldChange("projectType", val)}
                  placeholder="Select type"
                />
              </div>
              <div>
                <Input
                  label="Project Purpose *"
                  name="projectPurpose"
                  value={formData.projectPurpose}
                  onChange={(e) => handleFieldChange("projectPurpose", e.target.value)}
                  placeholder="e.g., Infrastructure development"
                />
              </div>
              <div>
                <Input
                  label="Project Budget (RM) *"
                  type="number"
                  name="projectBudget"
                  value={formData.projectBudget}
                  onChange={(e) => handleFieldChange("projectBudget", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Input
                  label="Funding Source *"
                  name="fundingSource"
                  value={formData.fundingSource}
                  onChange={(e) => handleFieldChange("fundingSource", e.target.value)}
                  placeholder="e.g., Government, Private, etc."
                />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-md-on-surface">
              Land Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Land Title Number *"
                  name="landTitleNumber"
                  value={formData.landTitleNumber}
                  onChange={(e) => handleFieldChange("landTitleNumber", e.target.value)}
                  placeholder="e.g., PN 12345"
                />
              </div>
              <div>
                <Input
                  label="Lot Number *"
                  name="lotNumber"
                  value={formData.lotNumber}
                  onChange={(e) => handleFieldChange("lotNumber", e.target.value)}
                  placeholder="e.g., Lot 1234"
                />
              </div>
              <div>
                <Input
                  label="Mukim *"
                  name="mukim"
                  value={formData.mukim}
                  onChange={(e) => handleFieldChange("mukim", e.target.value)}
                  placeholder="Mukim name"
                />
              </div>
              <div>
                <Input
                  label="District *"
                  name="district"
                  value={formData.district}
                  onChange={(e) => handleFieldChange("district", e.target.value)}
                  placeholder="District name"
                />
              </div>
              <div>
                <Input
                  label="State *"
                  name="state"
                  value={formData.state}
                  onChange={(e) => handleFieldChange("state", e.target.value)}
                  placeholder="State name"
                />
              </div>
              <div>
                <Input
                  label="Land Area (hectares) *"
                  type="number"
                  name="landArea"
                  value={formData.landArea}
                  onChange={(e) => handleFieldChange("landArea", e.target.value)}
                  placeholder="0.0"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <Input
                  label="Land Category *"
                  name="landCategory"
                  value={formData.landCategory}
                  onChange={(e) => handleFieldChange("landCategory", e.target.value)}
                  placeholder="e.g., Agricultural, Residential"
                />
              </div>
              <div>
                <Input
                  label="GPS Latitude *"
                  name="gpsLatitude"
                  value={formData.gpsLatitude}
                  onChange={(e) => handleFieldChange("gpsLatitude", e.target.value)}
                  placeholder="e.g., 3.1390"
                />
              </div>
              <div>
                <Input
                  label="GPS Longitude *"
                  name="gpsLongitude"
                  value={formData.gpsLongitude}
                  onChange={(e) => handleFieldChange("gpsLongitude", e.target.value)}
                  placeholder="e.g., 101.6869"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-md-on-surface">
                Owner Information
              </h3>
              <Button
                variant="filled"
                size="sm"
                onClick={addOwner}
              >
                <Plus size={16} /> Add Owner
              </Button>
            </div>
            {owners.map((owner, index) => (
              <div
                key={owner.id}
                className="p-6 bg-md-surface-container rounded-2xl border border-md-outline/10 relative"
              >
                {owners.length > 1 && (
                  <div className="absolute top-4 right-4">
                    <IconButton
                      title="Remove Owner"
                      size="sm"
                      variant="danger"
                      onClick={() => removeOwner(owner.id)}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </div>
                )}
                <div className="text-sm font-semibold text-md-on-surface-variant mb-4">
                  Owner #{index + 1}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Full Name *"
                      value={owner.name}
                      onChange={(e) =>
                        handleOwnerChange(owner.id, "name", e.target.value)
                      }
                      placeholder="Owner name"
                    />
                  </div>
                  <div>
                    <Input
                      label="Identity Card Number *"
                      value={owner.icNumber}
                      onChange={(e) =>
                        handleOwnerChange(owner.id, "icNumber", e.target.value)
                      }
                      placeholder="e.g., 800101-10-1234"
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="Address *"
                      value={owner.address}
                      onChange={(e) =>
                        handleOwnerChange(owner.id, "address", e.target.value)
                      }
                      rows={2}
                      placeholder="Full address"
                    />
                  </div>
                  <div>
                    <Input
                      label="Phone Number *"
                      type="tel"
                      value={owner.phone}
                      onChange={(e) =>
                        handleOwnerChange(owner.id, "phone", e.target.value)
                      }
                      placeholder="e.g., 012-3456789"
                    />
                  </div>
                  <div>
                    <Select
                      label="Ownership Type *"
                      value={owner.ownershipType}
                      options={OWNERSHIP_TYPE_OPTIONS}
                      onChange={(val) =>
                        handleOwnerChange(owner.id, "ownershipType", val)
                      }
                      placeholder="Select type"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-md-on-surface">
                Supporting Documents
              </h3>
              <Button
                variant="filled"
                size="sm"
                onClick={addDocument}
              >
                <Plus size={16} /> Add Document
              </Button>
            </div>
            {documents.map((doc, index) => (
              <div
                key={doc.id}
                className="p-6 bg-md-surface-container rounded-2xl border border-md-outline/10 relative"
              >
                {documents.length > 1 && (
                  <div className="absolute top-4 right-4">
                    <IconButton
                      title="Remove Document"
                      size="sm"
                      variant="danger"
                      onClick={() => removeDocument(doc.id)}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </div>
                )}
                <div className="text-sm font-semibold text-md-on-surface-variant mb-4">
                  Document #{index + 1}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Select
                      label="Document Type *"
                      value={doc.type}
                      options={DOCUMENT_TYPE_OPTIONS}
                      onChange={(val) => handleDocumentTypeChange(doc.id, val)}
                      placeholder="Select type"
                    />
                  </div>
                  <div>
                    <FileUpload
                      label="Upload File *"
                      fileName={doc.fileName}
                      onChange={(file) => handleFileUpload(doc.id, file)}
                      onClear={() => handleFileUpload(doc.id, null)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <p className="text-sm text-md-on-surface-variant opacity-60">
              Supported formats: PDF, JPEG, PNG, DOC, DOCX, XLSX, CSV. Max file size: 10 MB.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const sectionTitleMap: Record<number, string> = {
    0: "Project Information",
    1: "Land Information",
    2: "Owner Information",
    3: "Supporting Documents",
  };

  const titleText = isSectionEdit
    ? `Edit ${sectionTitleMap[currentStep] || "Section"}`
    : isWholeCaseEdit
    ? "Edit Case Details"
    : "Register New Case";

  const subtitleText = isSectionEdit
    ? `Editing ${sectionTitleMap[currentStep] || "selected section"} only`
    : isWholeCaseEdit
    ? "Update the project, land, and owner details for this acquisition case"
    : "Fill in the details below to create a new land acquisition case";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--md-background)", color: "var(--md-on-surface)" }}>
      <main className="main blur-shape-bg w-full">
        <div className="topbar flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="topbar-left">
            <h1 className="mb-0 text-2xl md:text-3xl font-bold text-md-on-surface">{titleText}</h1>
            <div className="sub">{subtitleText}</div>
          </div>
          <div className="topbar-right flex items-center gap-4">
            <span className="date-badge bg-md-surface-container px-4 py-2 rounded-full text-sm font-medium text-md-on-surface-variant">
              <Lucide.Calendar size={16} className="inline mr-1" /> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <div className="avatar w-10 h-10 rounded-full bg-md-primary text-white flex items-center justify-center font-semibold">
              AO
            </div>
          </div>
        </div>

        {/* Stepper Header */}
        <div className="stepper-wrapper max-w-4xl mx-auto">
          {["Project", "Land", "Owners", "Documents"].map((label, index) => {
            let status = "inactive";
            if (index === currentStep) status = "active";
            else if (index < currentStep && !isSectionEdit) status = "completed";

            const isClickable = !isSectionEdit;

            return (
              <div
                key={index}
                className={`step-item ${isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                onClick={() => {
                  if (isClickable) setCurrentStep(index);
                }}
                title={isClickable ? `Jump to ${label} section` : `${label} section is locked`}
              >
                <div className={`step-circle ${status === "active" ? "active" : status === "completed" ? "completed" : ""}`}>
                  {status === "completed" ? <Lucide.Check size={16} /> : index + 1}
                </div>
                <div className={`step-label ${status === "active" ? "active" : ""}`}>{label}</div>
              </div>
            );
          })}
        </div>

        {/* Form card */}
        <div className="max-w-4xl mx-auto bg-md-surface-container rounded-2xl p-6 md:p-8 shadow-sm">
          {renderStepContent()}

          {/* Navigation Action Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-md-outline/10">
            {/* Left Button Group */}
            <div className="flex items-center gap-3">
              {isSectionEdit ? (
                onCancel && (
                  <Button
                    variant="tonal"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                )
              ) : currentStep === 0 ? (
                <Button
                  variant="tonal"
                  onClick={onCancel || (() => window.history.back())}
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={prevStep}
                >
                  <ChevronLeft size={18} /> Back
                </Button>
              )}
            </div>

            {/* Right Button Group */}
            <div className="flex items-center gap-3">
              {isSectionEdit ? (
                <Button
                  variant="filled"
                  isLoading={isSubmitting}
                  onClick={handleFormSubmit}
                >
                  Save Changes
                </Button>
              ) : currentStep === 3 ? (
                <Button
                  variant="filled"
                  isLoading={isSubmitting}
                  onClick={handleFormSubmit}
                >
                  {isWholeCaseEdit ? "Save Changes" : "Submit Case"}
                </Button>
              ) : (
                <Button
                  variant="filled"
                  onClick={nextStep}
                >
                  Next <ChevronRight size={18} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
