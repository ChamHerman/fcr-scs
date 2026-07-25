import React, { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Upload } from "lucide-react";
import "../../style.css";
import "./case_management.css";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../Shared";

// Types
type Owner = {
  id: string;
  name: string;
  icNumber: string;
  address: string;
  phone: string;
  ownershipType: string;
};

type Document = {
  id: string;
  type: string;
  file: File | null;
  fileName: string;
};

type FormData = {
  // Project Information
  projectName: string;
  projectType: string;
  projectPurpose: string;
  projectBudget: string;
  fundingSource: string;
  // Land Information
  landTitleNumber: string;
  lotNumber: string;
  mukim: string;
  district: string;
  state: string;
  landArea: string;
  landCategory: string;
  gpsLatitude: string;
  gpsLongitude: string;
  // Owners & Documents are stored separately
};

export const CaseRegistration: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    projectName: "",
    projectType: "",
    projectPurpose: "",
    projectBudget: "",
    fundingSource: "",
    landTitleNumber: "",
    lotNumber: "",
    mukim: "",
    district: "",
    state: "",
    landArea: "",
    landCategory: "",
    gpsLatitude: "",
    gpsLongitude: "",
  });
  const [owners, setOwners] = useState<Owner[]>([
    {
      id: "1",
      name: "",
      icNumber: "",
      address: "",
      phone: "",
      ownershipType: "",
    },
  ]);
  const [documents, setDocuments] = useState<Document[]>([
    { id: "1", type: "", file: null, fileName: "" },
  ]);

  // Handlers for form fields
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Owner handlers
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

  // Document handlers
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
          d.id === id ? { ...d, file, fileName: file.name } : d,
        ),
      );
    }
  };

  // Navigation
  const nextStep = () => {
    // Basic validation: check required fields per step
    if (currentStep === 0) {
      const {
        projectName,
        projectType,
        projectPurpose,
        projectBudget,
        fundingSource,
      } = formData;
      if (
        !projectName ||
        !projectType ||
        !projectPurpose ||
        !projectBudget ||
        !fundingSource
      ) {
        alert("Please fill all required fields in Project Information.");
        return;
      }
    } else if (currentStep === 1) {
      const {
        landTitleNumber,
        lotNumber,
        mukim,
        district,
        state,
        landArea,
        landCategory,
        gpsLatitude,
        gpsLongitude,
      } = formData;
      if (
        !landTitleNumber ||
        !lotNumber ||
        !mukim ||
        !district ||
        !state ||
        !landArea ||
        !landCategory ||
        !gpsLatitude ||
        !gpsLongitude
      ) {
        alert("Please fill all required fields in Land Information.");
        return;
      }
    } else if (currentStep === 2) {
      // Check each owner has name and IC
      for (const owner of owners) {
        if (
          !owner.name ||
          !owner.icNumber ||
          !owner.address ||
          !owner.phone ||
          !owner.ownershipType
        ) {
          alert("Please fill all required fields for each owner.");
          return;
        }
      }
    } else if (currentStep === 3) {
      // Check at least one document has type and file
      const hasValidDoc = documents.some((d) => d.type && d.file);
      if (!hasValidDoc) {
        alert(
          "Please upload at least one supporting document with a selected type.",
        );
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    // Final submission logic
    console.log("Submitting case:", { ...formData, owners, documents });
    alert("Case submitted successfully!");
  };

  // Step rendering
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
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  Project Type *
                </label>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition appearance-none"
                >
                  <option value="">Select type</option>
                  <option value="Public Amenities">Public Amenities</option>
                  <option value="Transportation Development">
                    Transportation Development
                  </option>
                  <option value="Urban Redevelopment">
                    Urban Redevelopment
                  </option>
                  <option value="Tourism Development">
                    Tourism Development
                  </option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  Project Purpose *
                </label>
                <input
                  type="text"
                  name="projectPurpose"
                  value={formData.projectPurpose}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                  placeholder="e.g., Infrastructure development"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  Project Budget (RM) *
                </label>
                <input
                  type="number"
                  name="projectBudget"
                  value={formData.projectBudget}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  Funding Source *
                </label>
                <input
                  type="text"
                  name="fundingSource"
                  value={formData.fundingSource}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
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
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  Land Title Number *
                </label>
                <input
                  type="text"
                  name="landTitleNumber"
                  value={formData.landTitleNumber}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                  placeholder="e.g., PN 12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  Lot Number *
                </label>
                <input
                  type="text"
                  name="lotNumber"
                  value={formData.lotNumber}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                  placeholder="e.g., Lot 1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  Mukim *
                </label>
                <input
                  type="text"
                  name="mukim"
                  value={formData.mukim}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                  placeholder="Mukim name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  District *
                </label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                  placeholder="District name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                  placeholder="State name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  Land Area (hectares) *
                </label>
                <input
                  type="number"
                  name="landArea"
                  value={formData.landArea}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                  Land Category *
                </label>
                <input
                  type="text"
                  name="landCategory"
                  value={formData.landCategory}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                  placeholder="e.g., Agricultural, Residential"
                />
              </div>
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                    GPS Latitude *
                  </label>
                  <input
                    type="text"
                    name="gpsLatitude"
                    value={formData.gpsLatitude}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                    placeholder="e.g., 3.1390"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                    GPS Longitude *
                  </label>
                  <input
                    type="text"
                    name="gpsLongitude"
                    value={formData.gpsLongitude}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                    placeholder="e.g., 101.6869"
                  />
                </div>
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
              <button
                onClick={addOwner}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-md-primary text-white text-sm font-semibold hover:shadow-md transition active:scale-95"
              >
                <Plus size={16} /> Add Owner
              </button>
            </div>
            {owners.map((owner, index) => (
              <div
                key={owner.id}
                className="p-6 bg-md-surface-container rounded-2xl border border-md-outline/10 relative"
              >
                {owners.length > 1 && (
                  <button
                    onClick={() => removeOwner(owner.id)}
                    className="absolute top-4 right-4 text-md-error-text hover:bg-md-error/20 p-2 rounded-full transition"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <div className="text-sm font-semibold text-md-on-surface-variant mb-4">
                  Owner #{index + 1}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={owner.name}
                      onChange={(e) =>
                        handleOwnerChange(owner.id, "name", e.target.value)
                      }
                      className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                      placeholder="Owner name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                      Identity Card Number *
                    </label>
                    <input
                      type="text"
                      value={owner.icNumber}
                      onChange={(e) =>
                        handleOwnerChange(owner.id, "icNumber", e.target.value)
                      }
                      className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                      placeholder="e.g., 800101-10-1234"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                      Address *
                    </label>
                    <textarea
                      value={owner.address}
                      onChange={(e) =>
                        handleOwnerChange(owner.id, "address", e.target.value)
                      }
                      rows={2}
                      className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition resize-none"
                      placeholder="Full address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={owner.phone}
                      onChange={(e) =>
                        handleOwnerChange(owner.id, "phone", e.target.value)
                      }
                      className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition"
                      placeholder="e.g., 012-3456789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                      Ownership Type *
                    </label>
                    <select
                      value={owner.ownershipType}
                      onChange={(e) =>
                        handleOwnerChange(
                          owner.id,
                          "ownershipType",
                          e.target.value,
                        )
                      }
                      className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition appearance-none"
                    >
                      <option value="">Select type</option>
                      <option value="Individual">Individual</option>
                      <option value="Joint">Joint</option>
                      <option value="Company">Company</option>
                      <option value="Trust">Trust</option>
                      <option value="Other">Other</option>
                    </select>
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
              <button
                onClick={addDocument}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-md-primary text-white text-sm font-semibold hover:shadow-md transition active:scale-95"
              >
                <Plus size={16} /> Add Document
              </button>
            </div>
            {documents.map((doc, index) => (
              <div
                key={doc.id}
                className="p-6 bg-md-surface-container rounded-2xl border border-md-outline/10 relative"
              >
                {documents.length > 1 && (
                  <button
                    onClick={() => removeDocument(doc.id)}
                    className="absolute top-4 right-4 text-md-error-text hover:bg-md-error/20 p-2 rounded-full transition"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <div className="text-sm font-semibold text-md-on-surface-variant mb-4">
                  Document #{index + 1}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                      Document Type *
                    </label>
                    <select
                      value={doc.type}
                      onChange={(e) =>
                        handleDocumentTypeChange(doc.id, e.target.value)
                      }
                      className="w-full p-3 rounded-xl border border-md-outline/30 bg-md-surface-container-low focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 outline-none transition appearance-none"
                    >
                      <option value="">Select type</option>
                      <option value="Project Approval Letter">
                        Project Approval Letter
                      </option>
                      <option value="Development Plan">Development Plan</option>
                      <option value="Gazette">Gazette</option>
                      <option value="Survey Plan">Survey Plan</option>
                      <option value="Land Title Copy">Land Title Copy</option>
                      <option value="Location Map">Location Map</option>
                      <option value="Satellite Image">Satellite Image</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-md-on-surface-variant mb-1">
                        Upload File *
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 cursor-pointer">
                          <div className="w-full p-3 rounded-xl border-2 border-dashed border-md-outline/30 bg-md-surface-container-low hover:border-md-primary transition flex items-center justify-center gap-2 text-md-on-surface-variant">
                            <Upload size={18} />
                            <span className="text-sm">
                              {doc.file
                                ? doc.fileName
                                : "Choose file (PDF, JPG, PNG, DOC, XLSX, CSV)"}
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.csv"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleFileUpload(doc.id, file);
                              }}
                            />
                          </div>
                        </label>
                        {doc.file && (
                          <button
                            onClick={() => handleFileUpload(doc.id, null)}
                            className="text-md-error-text hover:bg-md-error/20 p-2 rounded-full transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-sm text-md-on-surface-variant opacity-60">
              Supported formats: PDF, JPEG, PNG, DOC, DOCX, XLSX, CSV. Max file
              size: 10 MB.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className="flex min-h-screen"
        style={{ background: "#f8f5fa", color: "#1c1b1f" }}
      >
        {/* ====== SIDEBAR ====== */}
        <Sidebar />

        {/* Main content */}
        <main className="main blur-shape-bg">
          <div className="topbar flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="topbar-left">
              <h1 className="mb-0 text-2xl md:text-3xl font-bold text-md-on-surface">
                Register New Case
              </h1>
              <div className="sub">
                Fill in the details below to create a new land acquisition case
              </div>
            </div>
            <div className="topbar-right flex items-center gap-4">
              <span className="date-badge bg-md-surface-container px-4 py-2 rounded-full text-sm font-medium text-md-on-surface-variant">
                📅 24 Jul 2026
              </span>
              <div className="avatar w-10 h-10 rounded-full bg-md-primary text-white flex items-center justify-center font-semibold">
                AO
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="stepper-wrapper max-w-4xl mx-auto">
            {["Project", "Land", "Owners", "Documents"].map((label, index) => {
              let status = "inactive";
              if (index === currentStep) status = "active";
              else if (index < currentStep) status = "completed";
              return (
                <div key={index} className="step-item">
                  <div
                    className={`step-circle ${status === "active" ? "active" : status === "completed" ? "completed" : ""}`}
                  >
                    {status === "completed" ? "✓" : index + 1}
                  </div>
                  <div
                    className={`step-label ${status === "active" ? "active" : ""}`}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form card */}
          <div className="max-w-4xl mx-auto bg-md-surface-container rounded-2xl p-6 md:p-8 shadow-sm">
            {renderStepContent()}

            {/* Navigation buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-md-outline/10">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition ${
                  currentStep === 0
                    ? "text-md-on-surface-variant/40 cursor-not-allowed"
                    : "text-md-on-surface-variant hover:bg-md-primary/10 active:scale-95"
                }`}
              >
                <ChevronLeft size={18} /> Back
              </button>
              {currentStep === 3 ? (
                <button
                  onClick={() => {
                    handleSubmit();
                    navigate("/case");
                  }}
                  className="flex items-center gap-2 px-8 py-3 rounded-full bg-md-primary text-white font-semibold shadow-sm hover:shadow-md transition active:scale-95"
                >
                  Submit Case
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  className="flex items-center gap-2 px-8 py-3 rounded-full bg-md-primary text-white font-semibold shadow-sm hover:shadow-md transition active:scale-95"
                >
                  Next <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
