import * as Lucide from "lucide-react";
import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { CurrencyInput } from "./ui/CurrencyInput";
import { Select, type SelectOption } from "./ui/Select";
import { Textarea } from "./ui/Textarea";
import { IconButton } from "./ui/IconButton";
import { FileUpload } from "./ui/FileUpload";
import { useNotification } from "./ui/NotificationSystem";
import { useAuth } from "../context/AuthContext";
import { landAcquisitionApi } from "../services/landAcquisitionApi";
import { BASE_URL } from "../services/api";
import { formatCurrencyWithDecimals, formatLiveCurrency } from "../utils/currency";
import "../style.css";
import "../pages/LandAcquisition/case_management.css";

export type Owner = {
  id: string;
  name: string;
  icNumber: string;
  address: string;
  phone: string;
  email: string;
  share: string;
  ownershipType?: string;
};

export type Document = {
  id: string;
  type: string;
  file: File | null;
  fileName: string;
  filePath?: string;
  fileUrl?: string;
};

export type CaseFormData = {
  customCaseId?: string;
  caseTitle?: string;
  projectName: string;
  projectType: string;
  projectPurpose: string;
  projectBudget: string;
  fundingSource: string;
  landTitleNumber: string;
  lotNumber: string;
  tempat: string;
  mukim: string;
  district: string;
  state: string;
  landArea: string;
  landCategory: string;
  tenureType: string;
  ownershipType: string;
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

const FUNDING_SOURCE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select funding source" },
  { value: "Government", label: "Government" },
  { value: "Private", label: "Private" },
  { value: "Others", label: "Others" },
];

const STANDARD_PROJECT_PURPOSES = [
  "Public Infrastructure",
  "Public Facilities",
  "Recreational and Environmental Use",
];

const PROJECT_PURPOSE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select project purpose" },
  { value: "Public Infrastructure", label: "Public Infrastructure" },
  { value: "Public Facilities", label: "Public Facilities" },
  { value: "Recreational and Environmental Use", label: "Recreational and Environmental Use" },
  { value: "Others", label: "Others" },
];

export const MANDATORY_DOCUMENT_TYPES = [
  {
    type: "Acquisition Plan",
    label: "Acquisition Plan *",
    description: "Detailed layout showing the land boundary, acquisition perimeter, and project scope.",
  },
  {
    type: "Official Title Search",
    label: "Official Title Search *",
    description: "Certified true copy of land title search issued by the Land Registry / Pejabat Tanah.",
  },
  {
    type: "Proof of Financial Allocation",
    label: "Proof of Financial Allocation *",
    description: "Official warrant, treasury approval, or fund allocation confirmation letter.",
  },
  {
    type: "Project Proposal",
    label: "Project Proposal *",
    description: "Cabinet approval, gazette notification, or executive project proposal brief.",
  },
] as const;

export const DOCUMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select type" },
  { value: "Acquisition Plan", label: "Acquisition Plan" },
  { value: "Official Title Search", label: "Official Title Search" },
  { value: "Proof of Financial Allocation", label: "Proof of Financial Allocation" },
  { value: "Project Proposal", label: "Project Proposal" },
];

export const LAND_CATEGORY_OPTIONS: SelectOption[] = [
  { value: "", label: "Select category" },
  { value: "Agriculture", label: "Agriculture" },
  { value: "Building", label: "Building" },
  { value: "Industry", label: "Industry" },
];

export const TENURE_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select tenure type" },
  { value: "Freehold", label: "Freehold" },
  { value: "Leasehold", label: "Leasehold" },
  { value: "Malay Reserve", label: "Malay Reserve" },
];

export const OWNERSHIP_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select ownership type" },
  { value: "Individual Citizen", label: "Individual Citizen" },
  { value: "Joint Ownership", label: "Joint Ownership" },
  { value: "Corporate Entity", label: "Corporate Entity" },
  { value: "Estate of Deceased", label: "Estate of Deceased" },
  { value: "Trustee", label: "Trustee" },
];

export const MALAYSIA_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Wilayah Persekutuan Kuala Lumpur",
  "Wilayah Persekutuan Labuan",
  "Wilayah Persekutuan Putrajaya",
] as const;

export const MALAYSIA_STATE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select state" },
  ...MALAYSIA_STATES.map((state) => ({ value: state, label: state })),
];

export const MALAYSIA_DISTRICTS_MAP: Record<string, string[]> = {
  "Johor": [
    "Batu Pahat",
    "Johor Bahru",
    "Kluang",
    "Kota Tinggi",
    "Kulai",
    "Mersing",
    "Muar",
    "Pontian",
    "Segamat",
    "Tangkak",
  ],
  "Kedah": [
    "Baling",
    "Bandar Baharu",
    "Kota Setar",
    "Kuala Muda",
    "Kubang Pasu",
    "Kulim",
    "Langkawi",
    "Padang Terap",
    "Pendang",
    "Pokok Sena",
    "Sik",
    "Yan",
  ],
  "Kelantan": [
    "Bachok",
    "Gua Musang",
    "Jeli",
    "Kota Bharu",
    "Kuala Krai",
    "Machang",
    "Pasir Mas",
    "Pasir Puteh",
    "Tanah Merah",
    "Tumpat",
  ],
  "Melaka": [
    "Alor Gajah",
    "Jasin",
    "Melaka Tengah",
  ],
  "Negeri Sembilan": [
    "Jelebu",
    "Jempol",
    "Kuala Pilah",
    "Port Dickson",
    "Rembau",
    "Seremban",
    "Tampin",
  ],
  "Pahang": [
    "Bentong",
    "Bera",
    "Cameron Highlands",
    "Jerantut",
    "Kuantan",
    "Lipis",
    "Maran",
    "Pekan",
    "Raub",
    "Rompin",
    "Temerloh",
  ],
  "Perak": [
    "Bagan Datuk",
    "Batang Padang",
    "Hilir Perak",
    "Hulu Perak",
    "Kampar",
    "Kerian",
    "Kinta",
    "Kuala Kangsar",
    "Larut, Matang dan Selama",
    "Manjung",
    "Muallim",
    "Perak Tengah",
  ],
  "Perlis": [
    "Kangar",
    "Arau",
    "Padang Besar",
  ],
  "Pulau Pinang": [
    "Barat Daya",
    "Seberang Perai Selatan",
    "Seberang Perai Tengah",
    "Seberang Perai Utara",
    "Timur Laut",
  ],
  "Sabah": [
    "Beaufort",
    "Beluran",
    "Kalabakan",
    "Keningau",
    "Kinabatangan",
    "Kota Belud",
    "Kota Kinabalu",
    "Kota Marudu",
    "Kuala Penyu",
    "Kudat",
    "Kunak",
    "Lahad Datu",
    "Nabawan",
    "Papar",
    "Penampang",
    "Putatan",
    "Ranau",
    "Sandakan",
    "Semporna",
    "Sipitang",
    "Tambunan",
    "Tawau",
    "Telupid",
    "Tenom",
    "Tongod",
    "Tuaran",
  ],
  "Sarawak": [
    "Betong",
    "Bintulu",
    "Kapit",
    "Kuching",
    "Limbang",
    "Miri",
    "Mukah",
    "Samarahan",
    "Sarikei",
    "Serian",
    "Sibu",
    "Sri Aman",
  ],
  "Selangor": [
    "Gombak",
    "Hulu Langat",
    "Hulu Selangor",
    "Klang",
    "Kuala Langat",
    "Kuala Selangor",
    "Petaling",
    "Sabak Bernam",
    "Sepang",
  ],
  "Terengganu": [
    "Besut",
    "Dungun",
    "Hulu Terengganu",
    "Kemaman",
    "Kuala Nerus",
    "Kuala Terengganu",
    "Marang",
    "Setiu",
  ],
  "Wilayah Persekutuan Kuala Lumpur": [
    "Bandar Tun Razak",
    "Batu",
    "Bukit Bintang",
    "Cheras",
    "Kepong",
    "Lembah Pantai",
    "Segambut",
    "Seputeh",
    "Setiawangsa",
    "Titiwangsa",
    "Wangsa Maju",
  ],
  "Wilayah Persekutuan Labuan": [
    "Labuan",
    "Victoria",
  ],
  "Wilayah Persekutuan Putrajaya": [
    "Putrajaya",
  ],
};

export const DISTRICT_TO_STATE_MAP: Record<string, string> = {};
Object.entries(MALAYSIA_DISTRICTS_MAP).forEach(([state, districts]) => {
  districts.forEach((d) => {
    DISTRICT_TO_STATE_MAP[d] = state;
  });
});

export function validateEmailFormat(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return "Please enter a valid email address (e.g., name@example.com).";
  }
  return null;
}

export function validatePhoneNumber(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return "Phone number is required.";

  // Strip spaces and hyphens
  const cleanDigits = trimmed.replace(/[\s\-+]/g, "");

  if (!/^\d+$/.test(cleanDigits)) {
    return "Phone number must contain only digits and optional hyphens.";
  }

  if (!cleanDigits.startsWith("01")) {
    return "Phone number must start with 01 (e.g., 012-3456789 or 011-12345678).";
  }

  if (cleanDigits.startsWith("011")) {
    if (cleanDigits.length !== 11) {
      return "Phone numbers starting with 011 must be exactly 11 digits (e.g., 011-12345678).";
    }
  } else {
    if (cleanDigits.length !== 10) {
      return "Phone numbers starting with 01 must be exactly 10 digits (e.g., 012-3456789).";
    }
  }

  return null;
}

export const CaseForm: React.FC<CaseFormProps> = ({
  mode,
  initialStep = 0,
  targetSection,
  initialValues,
  onSubmit,
  isSubmitting = false,
  onCancel,
}) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const isSectionEdit = mode === "edit" && Boolean(targetSection);
  const isWholeCaseEdit = mode === "edit" && !targetSection;
  const isCreate = mode === "create";

  const [currentStep, setCurrentStep] = useState(initialStep);
  const formatBudgetValue = (val: string): string => {
    return formatCurrencyWithDecimals(val) || val;
  };

  const formatLiveBudget = (input: string): string => {
    return formatLiveCurrency(input);
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawVal = input.value;
    const selectionStart = input.selectionStart ?? rawVal.length;

    // Count raw non-comma characters before the cursor
    const rawCharsBeforeCursor = rawVal
      .slice(0, selectionStart)
      .replace(/,/g, "").length;

    const formatted = formatLiveBudget(rawVal);
    handleFieldChange("projectBudget", formatted);

    // Calculate the target cursor position in the formatted string
    let newCursorPos = formatted.length;
    let countedRaw = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (countedRaw >= rawCharsBeforeCursor) {
        newCursorPos = i;
        break;
      }
      if (formatted[i] !== ",") {
        countedRaw++;
      }
      if (countedRaw >= rawCharsBeforeCursor) {
        newCursorPos = i + 1;
        break;
      }
    }

    requestAnimationFrame(() => {
      input.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const [formData, setFormData] = useState<CaseFormData>({
    customCaseId: initialValues?.formData?.customCaseId || "",
    caseTitle: initialValues?.formData?.caseTitle || "",
    projectName: initialValues?.formData?.projectName || "",
    projectType: initialValues?.formData?.projectType || "",
    projectPurpose: initialValues?.formData?.projectPurpose || "",
    projectBudget: initialValues?.formData?.projectBudget
      ? formatBudgetValue(String(initialValues.formData.projectBudget))
      : "",
    fundingSource: initialValues?.formData?.fundingSource || "",
    landTitleNumber: initialValues?.formData?.landTitleNumber || "",
    lotNumber: initialValues?.formData?.lotNumber || "",
    tempat: initialValues?.formData?.tempat || "",
    mukim: initialValues?.formData?.mukim || "",
    district: initialValues?.formData?.district || "",
    state: initialValues?.formData?.state || "",
    landArea: initialValues?.formData?.landArea || "",
    landCategory: initialValues?.formData?.landCategory || "",
    tenureType: initialValues?.formData?.tenureType || "",
    ownershipType: initialValues?.formData?.ownershipType || "Individual Citizen",
  });

  const [selectedPurposeOption, setSelectedPurposeOption] = useState<string>(() => {
    const init = initialValues?.formData?.projectPurpose || "";
    if (!init) return "";
    if (STANDARD_PROJECT_PURPOSES.includes(init)) return init;
    return "Others";
  });

  const [customPurposeText, setCustomPurposeText] = useState<string>(() => {
    const init = initialValues?.formData?.projectPurpose || "";
    if (init && !STANDARD_PROJECT_PURPOSES.includes(init)) {
      return init.replace(/^Others:\s*/i, "");
    }
    return "";
  });

  // Project Selection Mode: Create from scratch vs Select existing project
  const [existingProjects, setExistingProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [projectMode, setProjectMode] = useState<"scratch" | "existing">("scratch");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  React.useEffect(() => {
    if (mode === "edit") return;
    let isMounted = true;
    const fetchExistingProjects = async () => {
      setLoadingProjects(true);
      try {
        const res = await landAcquisitionApi.getAllProjects();
        if (isMounted && res.projects) {
          setExistingProjects(res.projects);
        }
      } catch (err) {
        console.error("Failed to load existing projects:", err);
      } finally {
        if (isMounted) setLoadingProjects(false);
      }
    };
    fetchExistingProjects();
    return () => {
      isMounted = false;
    };
  }, [mode]);

  const handleSelectExistingProject = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

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
            email: "",
            share: "100",
          },
        ]
  );

  const [documents, setDocuments] = useState<Document[]>(() => {
    return MANDATORY_DOCUMENT_TYPES.map((mDoc, idx) => {
      const existing = initialValues?.documents?.find((d) => d.type === mDoc.type);
      return {
        id: existing?.id || String(idx + 1),
        type: mDoc.type,
        file: existing?.file || null,
        fileName: existing?.fileName || "",
        filePath: existing?.filePath || "",
        fileUrl: existing?.fileUrl || (existing?.filePath ? `${BASE_URL}/${existing.filePath.replace(/^\//, "")}` : ""),
      };
    });
  });

  React.useEffect(() => {
    if (initialValues?.formData) {
      setFormData((prev) => ({
        ...prev,
        ...initialValues.formData,
      }));
      if (initialValues.formData.projectBudget) {
        setFormData((prev) => ({
          ...prev,
          projectBudget: formatBudgetValue(String(initialValues.formData!.projectBudget)),
        }));
      }
      if (initialValues.formData.projectPurpose !== undefined) {
        const init = initialValues.formData.projectPurpose;
        if (!init) {
          setSelectedPurposeOption("");
          setCustomPurposeText("");
        } else if (STANDARD_PROJECT_PURPOSES.includes(init)) {
          setSelectedPurposeOption(init);
          setCustomPurposeText("");
        } else {
          setSelectedPurposeOption("Others");
          setCustomPurposeText(init.replace(/^Others:\s*/i, ""));
        }
      }
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
    clearError(name);
  };

  const districtOptions: SelectOption[] = useMemo(() => {
    if (formData.state && MALAYSIA_DISTRICTS_MAP[formData.state]) {
      return [
        { value: "", label: "Select district" },
        ...MALAYSIA_DISTRICTS_MAP[formData.state].map((d) => ({
          value: d,
          label: d,
        })),
      ];
    }

    // When no state is selected, list all districts alphabetically with their state
    const allDistricts: { district: string; state: string }[] = [];
    Object.entries(MALAYSIA_DISTRICTS_MAP).forEach(([state, districts]) => {
      districts.forEach((d) => {
        allDistricts.push({ district: d, state });
      });
    });
    allDistricts.sort((a, b) => a.district.localeCompare(b.district));

    return [
      { value: "", label: "Select district" },
      ...allDistricts.map((item) => ({
        value: item.district,
        label: `${item.district} (${item.state})`,
      })),
    ];
  }, [formData.state]);

  const handleStateChange = (val: string) => {
    setFormData((prev) => {
      const validDistricts = val ? MALAYSIA_DISTRICTS_MAP[val] || [] : [];
      const keepDistrict = prev.district && validDistricts.includes(prev.district);
      return {
        ...prev,
        state: val,
        district: keepDistrict ? prev.district : "",
      };
    });
    clearError("state");
  };

  const handleDistrictChange = (val: string) => {
    const inferredState = DISTRICT_TO_STATE_MAP[val];
    setFormData((prev) => ({
      ...prev,
      district: val,
      state: inferredState || prev.state,
    }));
    clearError("district");
    if (inferredState) {
      clearError("state");
    }
  };

  const calculateTotalShare = (currentOwners: Owner[]): number => {
    return currentOwners.reduce((sum, o) => {
      const val = parseFloat(o.share);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  };

  const handleOwnershipTypeChange = (val: string) => {
    handleFieldChange("ownershipType", val);
    if (val === "Individual Citizen" || val === "Corporate Entity") {
      if (owners.length > 1) {
        setOwners((prev) => prev.slice(0, 1));
      }
    } else if (val === "Trustee") {
      if (owners.length > 4) {
        setOwners((prev) => prev.slice(0, 4));
      }
    }
  };

  const canAddOwner = () => {
    const type = formData.ownershipType || "Individual Citizen";
    if (type === "Individual Citizen" || type === "Corporate Entity") {
      return false;
    }
    if (type === "Trustee" && owners.length >= 4) {
      return false;
    }
    return true;
  };

  const addOwner = () => {
    if (!canAddOwner()) return;
    const newOwner: Owner = {
      id: Date.now().toString(),
      name: "",
      icNumber: "",
      address: "",
      phone: "",
      email: "",
      share: "",
    };
    setOwners([...owners, newOwner]);
  };

  const removeOwner = (id: string) => {
    if (owners.length <= 1) return;
    const updated = owners.filter((o) => o.id !== id);
    setOwners(updated);

    // Recheck total share after owner removal
    const total = calculateTotalShare(updated);
    if (total <= 100) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.ownersShareTotal;
        updated.forEach((o) => {
          if (next[`owner_${o.id}_share`]?.includes("Total ownership share exceeds")) {
            delete next[`owner_${o.id}_share`];
          }
        });
        return next;
      });
    }
  };

  const handleOwnerChange = (id: string, field: keyof Owner, value: string) => {
    const updated = owners.map((o) => (o.id === id ? { ...o, [field]: value } : o));
    setOwners(updated);
    clearError(`owner_${id}_${field}`);
    clearError("owners");
    clearError("ownersShareTotal");

    if (field === "share") {
      const total = calculateTotalShare(updated);
      if (total > 100) {
        const formattedTotal = Number(total.toFixed(2)).toString();
        setErrors((prev) => {
          const next = { ...prev };
          updated.forEach((o) => {
            next[`owner_${o.id}_share`] = `Total ownership share exceeds 100% (currently ${formattedTotal}%).`;
          });
          next.ownersShareTotal = `Total ownership share cannot exceed 100% (currently ${formattedTotal}%).`;
          return next;
        });
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.ownersShareTotal;
          updated.forEach((o) => {
            if (next[`owner_${o.id}_share`]?.includes("Total ownership share exceeds")) {
              delete next[`owner_${o.id}_share`];
            }
          });
          return next;
        });
      }
    }
  };

  const handleMandatoryFileUpload = (type: string, file: File | null) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.type === type) {
          return {
            ...d,
            file,
            fileName: file ? file.name : "",
            filePath: file ? "" : d.filePath,
            fileUrl: file ? URL.createObjectURL(file) : "",
          };
        }
        return d;
      })
    );
    clearError(`doc_${type}`);
    clearError("documents");
  };

  const isStepValid = (stepIndex: number): boolean => {
    if (stepIndex === 0) {
      if (mode === "create" && projectMode === "existing") {
        return Boolean(selectedProjectId);
      }
      const { projectName, projectType, projectBudget, fundingSource } = formData;
      const hasPurpose =
        selectedPurposeOption === "Others"
          ? Boolean(customPurposeText.trim())
          : Boolean(selectedPurposeOption.trim());
      return Boolean(
        projectName.trim() &&
        projectType.trim() &&
        hasPurpose &&
        projectBudget.trim() &&
        fundingSource.trim()
      );
    } else if (stepIndex === 1) {
      const {
        landTitleNumber,
        landCategory,
        tenureType,
        landArea,
        lotNumber,
        tempat,
        mukim,
        district,
        state,
      } = formData;
      return Boolean(
        landTitleNumber.trim() &&
        landCategory.trim() &&
        tenureType.trim() &&
        landArea.trim() &&
        lotNumber.trim() &&
        tempat.trim() &&
        mukim.trim() &&
        district.trim() &&
        state.trim()
      );
    } else if (stepIndex === 2) {
      if (!formData.ownershipType?.trim()) return false;
      if (!owners || owners.length === 0) return false;
      const allFilled = owners.every(
        (owner) =>
          owner.name.trim() &&
          owner.icNumber.trim() &&
          owner.address.trim() &&
          owner.phone.trim() &&
          !validatePhoneNumber(owner.phone) &&
          owner.email.trim() &&
          !validateEmailFormat(owner.email) &&
          owner.share.trim()
      );
      if (!allFilled) return false;
      const total = calculateTotalShare(owners);
      if (total !== 100) return false;
      return true;
    } else if (stepIndex === 3) {
      return MANDATORY_DOCUMENT_TYPES.every((mDoc) => {
        const doc = documents.find((d) => d.type === mDoc.type);
        return doc && Boolean(doc.file || doc.fileName.trim());
      });
    }
    return true;
  };

  const validateStep = (stepIndex: number, showAlert = true): boolean => {
    const stepErrors: Record<string, string> = {};

    if (stepIndex === 0) {
      if (mode === "create" && projectMode === "existing") {
        if (!selectedProjectId) {
          stepErrors.selectedProjectId = "Please select an existing project from the dropdown.";
        }
      } else {
        const { projectName, projectType, projectBudget, fundingSource } = formData;
        if (!projectName.trim()) {
          stepErrors.projectName = "Project name is required.";
        }
        if (!projectType.trim()) {
          stepErrors.projectType = "Project type is required.";
        }
        if (!fundingSource.trim()) {
          stepErrors.fundingSource = "Funding source is required.";
        }
        if (selectedPurposeOption === "Others") {
          if (!customPurposeText.trim()) {
            stepErrors.customProjectPurpose = "Please specify the custom project purpose.";
          }
        } else if (!selectedPurposeOption.trim()) {
          stepErrors.projectPurpose = "Project purpose is required.";
        }
        if (!projectBudget.trim()) {
          stepErrors.projectBudget = "Project budget is required.";
        }
      }
    } else if (stepIndex === 1) {
      const {
        landTitleNumber,
        landCategory,
        tenureType,
        landArea,
        lotNumber,
        tempat,
        mukim,
        district,
        state,
      } = formData;

      if (!landTitleNumber.trim()) stepErrors.landTitleNumber = "Land title number is required.";
      if (!landCategory.trim()) stepErrors.landCategory = "Land category is required.";
      if (!tenureType.trim()) stepErrors.tenureType = "Tenure type is required.";
      if (!landArea.trim()) stepErrors.landArea = "Land area is required.";
      if (!lotNumber.trim()) stepErrors.lotNumber = "Lot number is required.";
      if (!tempat.trim()) stepErrors.tempat = "Tempat is required.";
      if (!mukim.trim()) stepErrors.mukim = "Mukim is required.";
      if (!district.trim()) stepErrors.district = "District is required.";
      if (!state.trim()) stepErrors.state = "State is required.";
    } else if (stepIndex === 2) {
      if (!formData.ownershipType?.trim()) {
        stepErrors.ownershipType = "Ownership type is required.";
      }
      if (!owners || owners.length === 0) {
        stepErrors.owners = "Please add at least one owner.";
      } else {
        let totalShare = 0;
        for (const owner of owners) {
          if (!owner.name.trim()) stepErrors[`owner_${owner.id}_name`] = "Full name is required.";
          if (!owner.icNumber.trim()) stepErrors[`owner_${owner.id}_icNumber`] = "Identification number is required.";
          if (!owner.address.trim()) stepErrors[`owner_${owner.id}_address`] = "Address is required.";

          if (!owner.phone.trim()) {
            stepErrors[`owner_${owner.id}_phone`] = "Phone number is required.";
          } else {
            const phoneErr = validatePhoneNumber(owner.phone);
            if (phoneErr) {
              stepErrors[`owner_${owner.id}_phone`] = phoneErr;
            }
          }

          if (!owner.email.trim()) {
            stepErrors[`owner_${owner.id}_email`] = "Email is required.";
          } else {
            const emailErr = validateEmailFormat(owner.email);
            if (emailErr) {
              stepErrors[`owner_${owner.id}_email`] = emailErr;
            }
          }

          if (!owner.share.trim()) {
            stepErrors[`owner_${owner.id}_share`] = "Ownership share (%) is required.";
          } else {
            const shareNum = parseFloat(owner.share);
            if (isNaN(shareNum) || shareNum <= 0) {
              stepErrors[`owner_${owner.id}_share`] = "Share must be greater than 0%.";
            } else if (shareNum > 100) {
              stepErrors[`owner_${owner.id}_share`] = "Share cannot exceed 100%.";
            }
            totalShare += isNaN(shareNum) ? 0 : shareNum;
          }
        }

        if (totalShare !== 100) {
          const formattedTotal = Number(totalShare.toFixed(2)).toString();
          if (totalShare > 100) {
            for (const owner of owners) {
              if (!stepErrors[`owner_${owner.id}_share`]) {
                stepErrors[`owner_${owner.id}_share`] = `Total ownership share exceeds 100% (currently ${formattedTotal}%).`;
              }
            }
            stepErrors.ownersShareTotal = `Total ownership share cannot exceed 100% (currently ${formattedTotal}%). Please adjust individual shares.`;
          } else {
            const remaining = Number((100 - totalShare).toFixed(2)).toString();
            for (const owner of owners) {
              if (!stepErrors[`owner_${owner.id}_share`]) {
                stepErrors[`owner_${owner.id}_share`] = `Total ownership share must reach 100% (currently ${formattedTotal}%).`;
              }
            }
            stepErrors.ownersShareTotal = `Total ownership share must reach 100% (currently ${formattedTotal}%). Remaining unallocated: ${remaining}%.`;
          }
        }
      }
    } else if (stepIndex === 3) {
      let missingCount = 0;
      for (const mDoc of MANDATORY_DOCUMENT_TYPES) {
        const doc = documents.find((d) => d.type === mDoc.type);
        if (!doc || (!doc.file && !doc.fileName.trim())) {
          stepErrors[`doc_${mDoc.type}`] = `${mDoc.type} is required.`;
          missingCount++;
        }
      }
      if (missingCount > 0) {
        stepErrors.documents = "Please upload all 4 mandatory supporting documents before proceeding.";
      }
    }

    const hasErrors = Object.keys(stepErrors).length > 0;
    if (hasErrors) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      if (showAlert) {
        const firstKey = Object.keys(stepErrors)[0];
        const firstMessage = stepErrors[firstKey];
        notify({
          type: "error",
          title: "Incomplete Form Details",
          message: firstMessage,
        });

        // Automatically focus and scroll into view the first invalid input
        setTimeout(() => {
          const targetEl = document.querySelector(
            `#${firstKey}, [name="${firstKey}"], [id*="${firstKey}"], button[id*="${firstKey}"]`
          ) as HTMLElement;
          if (targetEl) {
            targetEl.focus();
            targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 80);
      }
      return false;
    }

    return true;
  };

  const canNavigateToStep = (targetIndex: number): boolean => {
    if (isSectionEdit) return targetIndex === currentStep;
    // Backward step is always allowed
    if (targetIndex <= currentStep) return true;
    // Forward step: All steps from 0 up to targetIndex - 1 must be valid
    for (let i = 0; i < targetIndex; i++) {
      if (!isStepValid(i)) {
        return false;
      }
    }
    return true;
  };

  const handleStepClick = (targetIndex: number) => {
    if (isSectionEdit) return;
    if (targetIndex === currentStep) return;

    // Backward step is always allowed
    if (targetIndex < currentStep) {
      setCurrentStep(targetIndex);
      return;
    }

    // Forward step: Must validate preceding steps sequentially
    for (let i = 0; i < targetIndex; i++) {
      if (!validateStep(i, true)) {
        setCurrentStep(i);
        return;
      }
    }

    setCurrentStep(targetIndex);
  };

  const nextStep = () => {
    if (!validateStep(currentStep, true)) return;
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    // Backward step is unconditionally allowed
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleFormSubmit = async () => {
    if (!validateStep(currentStep, true)) return;

    let finalFormData = { ...formData };
    if (mode === "create" && projectMode === "existing" && selectedProjectId) {
      const selectedProj = existingProjects.find((p) => p.projectId === selectedProjectId);
      if (selectedProj) {
        const formattedFundingSource =
          selectedProj.fundingSource === "GOVERNMENT"
            ? "Government"
            : selectedProj.fundingSource === "PRIVATE"
            ? "Private"
            : selectedProj.fundingSource === "OTHERS"
            ? "Others"
            : selectedProj.fundingSource || "Government";

        finalFormData = {
          ...finalFormData,
          projectName: selectedProj.projectName || "",
          projectType: selectedProj.projectType || "",
          fundingSource: formattedFundingSource,
          projectPurpose: selectedProj.purpose || "",
          projectBudget: selectedProj.budget != null ? formatCurrencyWithDecimals(selectedProj.budget) : "",
        };
      }
    } else {
      const resolvedPurpose =
        selectedPurposeOption === "Others"
          ? (customPurposeText.trim() ? `Others: ${customPurposeText.trim()}` : "")
          : selectedPurposeOption;

      finalFormData = {
        ...finalFormData,
        projectPurpose: resolvedPurpose,
      };
    }

    const resolvedOwners = owners.map((o) => ({
      ...o,
      ownershipType: formData.ownershipType || "Individual Citizen",
      share: o.share || "1/1",
    }));

    await onSubmit({ formData: finalFormData, owners: resolvedOwners, documents });
  };

  const getUserInitials = (name?: string) => {
    if (!name) return "AO";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-md-outline-variant/30 pb-4">
              <div>
                <h3 className="text-xl font-bold text-md-on-surface">
                  Project Information
                </h3>
                <p className="text-xs text-md-on-surface-variant mt-0.5">
                  {mode === "edit"
                    ? "Update the project details for this land acquisition case."
                    : "Link this case to an existing project or define a new project from scratch."}
                </p>
              </div>

              {/* Mode Selector Toggle: Only in Create Mode */}
              {mode === "create" && (
                <div className="flex items-center p-1 bg-md-surface-container rounded-xl border border-md-outline-variant/40 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setProjectMode("scratch");
                      setSelectedProjectId("");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      projectMode === "scratch"
                        ? "bg-md-primary text-md-on-primary shadow-sm"
                        : "text-md-on-surface-variant hover:text-md-on-surface"
                    }`}
                  >
                    <Lucide.PlusCircle size={14} />
                    Create New Project
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectMode("existing")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      projectMode === "existing"
                        ? "bg-md-primary text-md-on-primary shadow-sm"
                        : "text-md-on-surface-variant hover:text-md-on-surface"
                    }`}
                  >
                    <Lucide.FolderGit2 size={14} />
                    Select Existing Project
                  </button>
                </div>
              )}
            </div>

            {mode === "create" && projectMode === "existing" ? (
              <div className="space-y-4">
                <Select
                  id="selectedProjectId"
                  label="Select Existing Project *"
                  value={selectedProjectId}
                  error={errors.selectedProjectId}
                  options={[
                    { value: "", label: loadingProjects ? "Loading projects..." : "-- Select an existing project --" },
                    ...existingProjects.map((p) => ({
                      value: p.projectId,
                      label: `${p.projectId}: ${p.projectName} (${p._count?.cases || 0} ${p._count?.cases === 1 ? "case" : "cases"})`,
                    })),
                  ]}
                  onChange={(val) => {
                    handleSelectExistingProject(val);
                    clearError("selectedProjectId");
                  }}
                  placeholder="Select an existing project..."
                />

                {(() => {
                  const selectedProj = existingProjects.find((p) => p.projectId === selectedProjectId);
                  if (!selectedProj) return null;

                  const fundingLabel =
                    selectedProj.fundingSource === "GOVERNMENT"
                      ? "Government"
                      : selectedProj.fundingSource === "PRIVATE"
                      ? "Private"
                      : selectedProj.fundingSource === "OTHERS"
                      ? "Others"
                      : selectedProj.fundingSource || "—";

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-3.5 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <Lucide.CheckCircle2 size={16} className="flex-shrink-0" />
                        <span>
                          Project details populated from <strong>{selectedProj.projectName}</strong>. This case will be attached to this project.
                        </span>
                      </div>

                      <div className="p-5 rounded-2xl bg-md-surface-container border border-md-outline-variant/30">
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Project Name</span>
                            <span className="value">{selectedProj.projectName || "—"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Project Type</span>
                            <span className="value">{selectedProj.projectType || "—"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Project Purpose</span>
                            <span className="value">{selectedProj.purpose || "—"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Project Budget</span>
                            <span className="value">
                              {selectedProj.budget != null
                                ? `RM ${Number(selectedProj.budget).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : "—"}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Funding Source</span>
                            <span className="value">{fundingLabel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Row 1: Project Name */}
                <div className="col-span-1 md:col-span-2">
                  <Input
                    id="projectName"
                    name="projectName"
                    label="Project Name *"
                    value={formData.projectName}
                    error={errors.projectName}
                    onChange={(e) => handleFieldChange("projectName", e.target.value)}
                    placeholder="Enter project name"
                  />
                </div>

                {/* Row 2: Type, Funding Source */}
                <div>
                  <Select
                    id="projectType"
                    name="projectType"
                    label="Project Type *"
                    value={formData.projectType}
                    error={errors.projectType}
                    options={PROJECT_TYPE_OPTIONS}
                    onChange={(val) => handleFieldChange("projectType", val)}
                    placeholder="Select type"
                  />
                </div>
                <div>
                  <Select
                    id="fundingSource"
                    name="fundingSource"
                    label="Funding Source *"
                    value={formData.fundingSource}
                    error={errors.fundingSource}
                    options={FUNDING_SOURCE_OPTIONS}
                    onChange={(val) => handleFieldChange("fundingSource", val)}
                    placeholder="Select funding source"
                  />
                </div>

                {/* Row 3: Purpose, Budget */}
                <div>
                  <div className="space-y-2">
                    <Select
                      id="projectPurpose"
                      name="projectPurpose"
                      label="Project Purpose *"
                      value={selectedPurposeOption}
                      error={errors.projectPurpose}
                      options={PROJECT_PURPOSE_OPTIONS}
                      onChange={(val) => {
                        setSelectedPurposeOption(val);
                        clearError("projectPurpose");
                        clearError("customProjectPurpose");
                        if (val === "Others") {
                          handleFieldChange("projectPurpose", customPurposeText ? `Others: ${customPurposeText.trim()}` : "");
                        } else {
                          handleFieldChange("projectPurpose", val);
                        }
                      }}
                      placeholder="Select project purpose"
                    />
                    {selectedPurposeOption === "Others" && (
                      <Input
                        id="customProjectPurpose"
                        name="customProjectPurpose"
                        label="Specify Other Purpose *"
                        value={customPurposeText}
                        error={errors.customProjectPurpose}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomPurposeText(val);
                          clearError("customProjectPurpose");
                          clearError("projectPurpose");
                          handleFieldChange("projectPurpose", val ? `Others: ${val.trim()}` : "");
                        }}
                        placeholder="Enter other project purpose"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <CurrencyInput
                    id="projectBudget"
                    name="projectBudget"
                    label="Project Budget (RM) *"
                    value={formData.projectBudget}
                    error={errors.projectBudget}
                    onChange={(e) => handleFieldChange("projectBudget", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-md-on-surface">
              Land Information
            </h3>
            <div className="space-y-6">
              {/* Row 1: Land Title Number, Land Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    id="landTitleNumber"
                    name="landTitleNumber"
                    label="Land Title Number *"
                    value={formData.landTitleNumber}
                    error={errors.landTitleNumber}
                    onChange={(e) => handleFieldChange("landTitleNumber", e.target.value)}
                    placeholder="e.g., PN 12345"
                  />
                </div>
                <div>
                  <Select
                    id="landCategory"
                    name="landCategory"
                    label="Land Category *"
                    value={formData.landCategory}
                    error={errors.landCategory}
                    options={LAND_CATEGORY_OPTIONS}
                    onChange={(val) => handleFieldChange("landCategory", val)}
                    placeholder="Select category"
                  />
                </div>
              </div>

              {/* Row 2: Tenure Type, Land Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Select
                    id="tenureType"
                    name="tenureType"
                    label="Tenure Type *"
                    value={formData.tenureType}
                    error={errors.tenureType}
                    options={TENURE_TYPE_OPTIONS}
                    onChange={(val) => handleFieldChange("tenureType", val)}
                    placeholder="Select tenure"
                  />
                </div>
                <div>
                  <Input
                    id="landArea"
                    name="landArea"
                    label="Land Area (m²) *"
                    type="number"
                    value={formData.landArea}
                    error={errors.landArea}
                    onChange={(e) => handleFieldChange("landArea", e.target.value)}
                    placeholder="0.0"
                  />
                </div>
              </div>

              {/* Row 3: Lot Number, Tempat, Mukim */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Input
                    id="lotNumber"
                    name="lotNumber"
                    label="Lot Number *"
                    value={formData.lotNumber}
                    error={errors.lotNumber}
                    onChange={(e) => handleFieldChange("lotNumber", e.target.value)}
                    placeholder="e.g., Lot 1234"
                  />
                </div>
                <div>
                  <Input
                    id="tempat"
                    name="tempat"
                    label="Tempat *"
                    value={formData.tempat}
                    error={errors.tempat}
                    onChange={(e) => handleFieldChange("tempat", e.target.value)}
                    placeholder="e.g., Kampung Baru"
                  />
                </div>
                <div>
                  <Input
                    id="mukim"
                    name="mukim"
                    label="Mukim *"
                    value={formData.mukim}
                    error={errors.mukim}
                    onChange={(e) => handleFieldChange("mukim", e.target.value)}
                    placeholder="Mukim name"
                  />
                </div>
              </div>

              {/* Row 4: District, State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Select
                    id="district"
                    name="district"
                    label="District *"
                    value={formData.district}
                    error={errors.district}
                    options={districtOptions}
                    onChange={handleDistrictChange}
                    placeholder="Select district"
                  />
                </div>
                <div>
                  <Select
                    id="state"
                    name="state"
                    label="State *"
                    value={formData.state}
                    error={errors.state}
                    options={MALAYSIA_STATE_OPTIONS}
                    onChange={handleStateChange}
                    placeholder="Select state"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-md-on-surface">
                  Land Owner Information
                </h3>
                <p className="text-xs text-md-on-surface-variant mt-0.5">
                  Specify the property ownership category and register all associated titleholders.
                </p>
              </div>
              {canAddOwner() && (
                <Button
                  variant="filled"
                  size="sm"
                  onClick={addOwner}
                >
                  <Plus size={16} /> Add Owner
                </Button>
              )}
            </div>

            {/* Top Ownership Type Selector */}
            <div className="p-5 bg-md-surface-container rounded-2xl border border-md-outline-variant/30">
              <div className="max-w-md">
                <Select
                  id="ownershipType"
                  name="ownershipType"
                  label="Ownership Type *"
                  value={formData.ownershipType}
                  error={errors.ownershipType}
                  options={OWNERSHIP_TYPE_OPTIONS}
                  onChange={handleOwnershipTypeChange}
                  placeholder="Select ownership type"
                />
              </div>
            </div>

            {/* Total Share Summary Banner */}
            {(() => {
              const currentTotal = calculateTotalShare(owners);
              const isOver = currentTotal > 100;
              const isUnder = currentTotal < 100;
              const formatted = Number(currentTotal.toFixed(2)).toString();
              return (
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                    isOver || isUnder
                      ? "bg-md-error/10 border-md-error/40 text-md-error"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
                    <span>Total Ownership Share Allocated:</span>
                    <span className={`font-bold ${isOver || isUnder ? "text-md-error" : ""}`}>
                      {formatted}% / 100%
                    </span>
                    {isOver && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--md-error-text)] text-white shadow-sm">
                        Exceeds 100%
                      </span>
                    )}
                    {isUnder && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--md-error-text)] text-white shadow-sm">
                        Must Reach 100%
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {errors.owners && (
              <div className="p-3 bg-md-error/10 border border-md-error/30 rounded-xl text-xs text-md-error font-medium">
                {errors.owners}
              </div>
            )}

            <div className="space-y-6">
              {owners.map((owner, index) => (
                <div
                  key={owner.id}
                  className="p-6 bg-md-surface-container rounded-2xl border border-md-outline/10 relative space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-md-primary">
                      Owner #{index + 1}
                    </div>
                    {owners.length > 1 && (
                      <IconButton
                        title="Remove Owner"
                        size="sm"
                        variant="danger"
                        onClick={() => removeOwner(owner.id)}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    )}
                  </div>

                  {/* Row 1: Full Name | Identification Number */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Input
                        id={`owner_${owner.id}_name`}
                        name={`owner_${owner.id}_name`}
                        label="Full Name *"
                        value={owner.name}
                        error={errors[`owner_${owner.id}_name`]}
                        onChange={(e) =>
                          handleOwnerChange(owner.id, "name", e.target.value)
                        }
                        placeholder="e.g., Tan Ah Kow / Syarikat ABC Sdn Bhd"
                      />
                    </div>
                    <div>
                      <Input
                        id={`owner_${owner.id}_icNumber`}
                        name={`owner_${owner.id}_icNumber`}
                        label="Identification Number *"
                        value={owner.icNumber}
                        error={errors[`owner_${owner.id}_icNumber`]}
                        onChange={(e) =>
                          handleOwnerChange(owner.id, "icNumber", e.target.value)
                        }
                        placeholder="e.g., 800101-10-1234"
                      />
                    </div>
                  </div>

                  {/* Row 2: Address */}
                  <div>
                    <Input
                      id={`owner_${owner.id}_address`}
                      name={`owner_${owner.id}_address`}
                      label="Address *"
                      value={owner.address}
                      error={errors[`owner_${owner.id}_address`]}
                      onChange={(e) =>
                        handleOwnerChange(owner.id, "address", e.target.value)
                      }
                      placeholder="Enter registered correspondence address"
                    />
                  </div>

                  {/* Row 3: Phone Number | Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Input
                        id={`owner_${owner.id}_phone`}
                        name={`owner_${owner.id}_phone`}
                        label="Phone Number *"
                        type="tel"
                        value={owner.phone}
                        error={errors[`owner_${owner.id}_phone`]}
                        onChange={(e) =>
                          handleOwnerChange(owner.id, "phone", e.target.value)
                        }
                        placeholder="e.g., 012-3456789 or 011-12345678"
                      />
                    </div>
                    <div>
                      <Input
                        id={`owner_${owner.id}_email`}
                        name={`owner_${owner.id}_email`}
                        label="Email *"
                        type="email"
                        value={owner.email}
                        error={errors[`owner_${owner.id}_email`]}
                        onChange={(e) =>
                          handleOwnerChange(owner.id, "email", e.target.value)
                        }
                        placeholder="e.g., owner@example.com"
                      />
                    </div>
                  </div>

                  {/* Row 4: Ownership Share */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Input
                        id={`owner_${owner.id}_share`}
                        name={`owner_${owner.id}_share`}
                        label="Ownership Share (%) *"
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={owner.share}
                        error={errors[`owner_${owner.id}_share`]}
                        onChange={(e) =>
                          handleOwnerChange(owner.id, "share", e.target.value)
                        }
                        placeholder="e.g., 50 or 100"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        const uploadedCount = documents.filter((d) => d.file || d.fileName.trim()).length;
        const allUploaded = uploadedCount === MANDATORY_DOCUMENT_TYPES.length;

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-md-on-surface">
                  Supporting Documents (Mandatory)
                </h3>
                <p className="text-xs text-md-on-surface-variant mt-0.5">
                  All 4 supporting documents are required to complete case registration.
                </p>
              </div>
              <div
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  allUploaded
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                }`}
              >
                {allUploaded && <CheckCircle2 size={14} />}
                <span>{uploadedCount} of 4 Documents Uploaded</span>
              </div>
            </div>

            {errors.documents && (
              <div className="p-3 bg-md-error/10 border border-md-error/30 rounded-xl text-xs text-md-error font-medium">
                {errors.documents}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MANDATORY_DOCUMENT_TYPES.map((mDoc, index) => {
                const doc = documents.find((d) => d.type === mDoc.type) || {
                  id: String(index + 1),
                  type: mDoc.type,
                  file: null,
                  fileName: "",
                  filePath: "",
                  fileUrl: "",
                };

                const isUploaded = Boolean(doc.file || doc.fileName.trim());
                const targetUrl = doc.file
                  ? URL.createObjectURL(doc.file)
                  : doc.fileUrl || (doc.filePath ? `${BASE_URL}/${doc.filePath.replace(/^\//, "")}` : "");

                return (
                  <div
                    key={mDoc.type}
                    className={`p-5 rounded-2xl border transition-all ${
                      isUploaded
                        ? "bg-md-surface-container border-md-outline/15"
                        : "bg-md-surface-container border-md-outline-variant/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-sm font-bold text-md-on-surface flex items-center gap-1.5">
                          <span>{mDoc.type}</span>
                          <span className="text-md-error font-bold">*</span>
                        </div>
                        <p className="text-xs text-md-on-surface-variant opacity-75 mt-0.5 leading-relaxed">
                          {mDoc.description}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          isUploaded
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            : "bg-md-error/10 text-md-error border border-md-error/25"
                        }`}
                      >
                        {isUploaded ? "Uploaded" : "Required"}
                      </span>
                    </div>

                    <div className="mt-4">
                      <FileUpload
                        id={`doc_${mDoc.type}`}
                        label={`Upload ${mDoc.type} *`}
                        fileName={doc.fileName}
                        fileUrl={targetUrl}
                        error={errors[`doc_${mDoc.type}`]}
                        onChange={(file) => handleMandatoryFileUpload(mDoc.type, file)}
                        onClear={() => handleMandatoryFileUpload(mDoc.type, null)}
                        placeholder={`Upload ${mDoc.type} (PDF, JPG, PNG, DOC)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-md-on-surface-variant opacity-60">
              Supported formats: PDF, JPEG, PNG, DOC, DOCX, XLSX, CSV. Max file size: 10 MB per document. Click on any uploaded document to preview it in a new browser tab.
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
    <div className="main blur-shape-bg">
      <div className="topbar flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="topbar-left">
          <h1 className="mb-0 text-2xl md:text-3xl font-bold text-md-on-surface">{titleText}</h1>
          <div className="sub">{subtitleText}</div>
        </div>
        <div className="topbar-right flex items-center gap-3">
          {onCancel && (
            <Button variant="outlined" size="sm" onClick={onCancel}>
              <Lucide.ArrowLeft size={16} /> Back
            </Button>
          )}
          <span className="date-badge">
            <Lucide.Calendar size={16} className="inline mr-1" /> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <div
            className="avatar"
            title={user ? `${user.name} (${user.role.replace(/_/g, " ")})` : "Current User"}
          >
            {user?.name ? getUserInitials(user.name) : "AO"}
          </div>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="stepper-wrapper w-full mb-6">
        {["Project", "Land", "Owners", "Documents"].map((label, index) => {
          const isAccessible = canNavigateToStep(index);
          const isActive = index === currentStep;
          const isCompleted = index < currentStep && isStepValid(index);
          const isLocked = !isAccessible && !isActive;

          let status = "inactive";
          if (isActive) status = "active";
          else if (isCompleted) status = "completed";
          else if (isLocked) status = "locked";

          return (
            <div
              key={index}
              className={`step-item ${isAccessible ? "cursor-pointer" : "cursor-not-allowed"} ${isLocked ? "locked" : ""}`}
              onClick={() => handleStepClick(index)}
              title={
                isActive
                  ? `Current step: ${label}`
                  : isAccessible
                  ? `Navigate to ${label}`
                  : `Complete previous step before unlocking ${label}`
              }
            >
              <div className={`step-circle ${status}`}>
                {isLocked ? (
                  <Lucide.Lock size={14} />
                ) : isCompleted ? (
                  <Lucide.Check size={16} />
                ) : (
                  index + 1
                )}
              </div>
              <div className={`step-label ${isActive ? "active" : ""}`}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* Form card */}
      <div className="w-full bg-md-surface-container rounded-2xl p-6 md:p-8 shadow-sm">
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
    </div>
  );
};
