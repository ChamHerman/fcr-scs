import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useNotification } from "../../components/ui/NotificationSystem";
import { formatCurrencyRM } from "../../utils/currency";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export type OwnerApprovalStatus = {
  ownerId: string;
  name: string;
  nric: string;
  contact: string;
  address: string;
  sharePercentage?: number | string;
  status: "ACCEPTED" | "REJECTED" | "PENDING";
  remarks?: string;
  respondedAt?: string;
  respondedAtDate?: Date | null;
  isCurrentUser: boolean;
};

export type OfferDetail = {
  id: string;
  offerReferenceNo: string;
  caseId: string;
  caseTitle: string;
  projectName: string;
  acquiringAuthority: string;
  ownerName: string;
  ownerIc: string;
  ownerAddress: string;
  ownerPhone: string;
  landTitle: string;
  lotNo: string;
  tempat: string;
  mukim: string;
  district: string;
  state: string;
  landArea: string;
  acquisitionArea: string;
  issueDate: string;
  expiryDate: string;
  enquiryDate: string;
  awardDate: string;
  awardReference: string;
  status: string;
  statusClass: string;
  totalCompensation: number;
  components: {
    landValue: number;
    buildingValue: number;
    cropValue: number;
    businessDisruption: number;
    disturbanceCompensation: number;
    relocationAllowance: number;
    otherEligible: number;
  };
  valuationReferences: {
    marketValue: number;
    aiValuationPrice?: number;
    recommendedCompensation: number;
    approvedCompensation: number;
    valuationMethod: string;
  };
  paymentConditions: string;
  remarks?: string;
  rawOffer: any;
  owners: OwnerApprovalStatus[];
  isMultiOwner: boolean;
  acceptedCount: number;
  totalOwners: number;
  hasRejectedOwner: boolean;
  acceptedAtDate?: Date | null;
  currentUserAcceptedAtDate?: Date | null;
  isWithinOneDay?: boolean;
  rejectedOwnerInfo: {
    name: string;
    nric: string;
    remarks?: string;
    respondedAt?: string;
  } | null;
  currentUserStatus: "ACCEPTED" | "REJECTED" | "PENDING" | null;
  rawStatus?: string;
};

interface OfferLetterPreviewProps {
  offer: OfferDetail;
}

type SectionId = "sec1" | "sec2" | "sec3" | "sec4" | "sec5" | "sec6";

interface PageLayout {
  pageNumber: number;
  sections: SectionId[];
}

export const OfferLetterPreview: React.FC<OfferLetterPreviewProps> = ({ offer }) => {
  const { notify } = useNotification();
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // PDF View mode: 'pdf' (native embedded PDF viewer iframe) or 'html' (dynamic A4 sheet view)
  const [viewMode, setViewMode] = useState<"pdf" | "html">("pdf");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Dynamic layout state calculated from actual DOM section heights
  const [pageLayouts, setPageLayouts] = useState<PageLayout[]>([
    { pageNumber: 1, sections: ["sec1", "sec2"] },
    { pageNumber: 2, sections: ["sec3", "sec4", "sec5"] },
    { pageNumber: 3, sections: ["sec6"] },
  ]);

  // DOM references for measurement and capture
  const measureContainerRef = useRef<HTMLDivElement>(null);
  const dynamicPageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 10, 70));
  const handleResetZoom = () => setZoomScale(100);

  // Dynamic Page Break Algorithm:
  // Measures exact heights of all sections and groups them into pages without splitting any section across pages
  const calculateDynamicLayout = (): PageLayout[] => {
    if (!measureContainerRef.current) return pageLayouts;

    const container = measureContainerRef.current;
    const headerEl = container.querySelector('[data-sec="header"]') as HTMLElement;
    const metaEl = container.querySelector('[data-sec="meta"]') as HTMLElement;
    const sec1El = container.querySelector('[data-sec="sec1"]') as HTMLElement;
    const sec2El = container.querySelector('[data-sec="sec2"]') as HTMLElement;
    const sec3El = container.querySelector('[data-sec="sec3"]') as HTMLElement;
    const sec4El = container.querySelector('[data-sec="sec4"]') as HTMLElement;
    const sec5El = container.querySelector('[data-sec="sec5"]') as HTMLElement;
    const sec6El = container.querySelector('[data-sec="sec6"]') as HTMLElement;

    const sectionsList: { id: SectionId; el: HTMLElement | null }[] = [
      { id: "sec1", el: sec1El },
      { id: "sec2", el: sec2El },
      { id: "sec3", el: sec3El },
      { id: "sec4", el: sec4El },
      { id: "sec5", el: sec5El },
      { id: "sec6", el: sec6El },
    ];

    // Total A4 page height (1123px) minus padding (72px) and footer/header clearance (~111px)
    const MAX_PAGE_SECTION_HEIGHT = 940;

    const headerH = headerEl ? headerEl.offsetHeight : 180;
    const metaH = metaEl ? metaEl.offsetHeight : 100;
    const secondaryHeaderH = 75;

    const pages: PageLayout[] = [];
    let pageNum = 1;
    let currentSections: SectionId[] = [];
    let currentHeight = headerH + metaH;

    for (const sec of sectionsList) {
      const secH = sec.el ? sec.el.offsetHeight : 160;

      // If adding this section exceeds page capacity AND we already have sections on this page,
      // push the WHOLE section to the next page!
      if (currentSections.length > 0 && currentHeight + secH > MAX_PAGE_SECTION_HEIGHT) {
        pages.push({ pageNumber: pageNum, sections: [...currentSections] });
        pageNum++;
        currentSections = [sec.id];
        currentHeight = secondaryHeaderH + secH;
      } else {
        currentSections.push(sec.id);
        currentHeight += secH;
      }
    }

    if (currentSections.length > 0) {
      pages.push({ pageNumber: pageNum, sections: [...currentSections] });
    }

    return pages;
  };

  // Compile PDF Blob using dynamic page refs
  const generatePdfBlob = async (): Promise<string | null> => {
    if (!offer) return null;
    setIsGeneratingPdf(true);
    try {
      // 1. Compute dynamic section page breaks first based on actual DOM measurements
      const newLayouts = calculateDynamicLayout();
      setPageLayouts(newLayouts);

      // Brief pause to allow React to render dynamic pages into DOM refs
      await new Promise((resolve) => setTimeout(resolve, 100));

      const pageElements = dynamicPageRefs.current.filter((el): el is HTMLDivElement => el !== null);
      if (pageElements.length === 0) return null;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
        });

        if (i > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
      }

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return url;
      });
      return url;
    } catch (err) {
      console.error("Failed to generate dynamic section PDF blob:", err);
      return null;
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        generatePdfBlob();
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [offer]);

  const handleDownload = async () => {
    if (!offer) return;
    setDownloadingPdf(true);
    try {
      let currentUrl = pdfUrl;
      if (!currentUrl) {
        currentUrl = await generatePdfBlob();
      }

      const safeFilename = `Form_H_Offer_Letter_${offer.offerReferenceNo || offer.id}.pdf`.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      if (currentUrl) {
        const a = document.createElement("a");
        a.href = currentUrl;
        a.download = safeFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      notify({
        type: "success",
        title: "Download Complete",
        message: `Form H PDF (${pageLayouts.length} pages) saved as ${safeFilename}`,
      });
    } catch (err: any) {
      console.error("PDF download failed:", err);
      notify({
        type: "error",
        title: "Download Failed",
        message: "Failed to download PDF. Please try again.",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Reusable Component: Official Header
  const renderOfficialHeader = () => (
    <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
      <div className="text-[15px] uppercase tracking-widest font-bold text-slate-600">
        KERAJAAN MALAYSIA · GOVERNMENT OF MALAYSIA
      </div>
      <div className="text-[14px] uppercase text-slate-500">
        LAND ACQUISITION ACT 1960 [ACT 486] — SECTION 16
      </div>
      <div className="text-[20px] font-bold tracking-wide mt-1.5 uppercase text-slate-900">
        BORANG H / FORM H
      </div>
      <h2 className="text-[22px] font-bold tracking-tight uppercase text-slate-950">
        NOTICE OF AWARD AND OFFER OF COMPENSATION
      </h2>
      <div className="text-[14px] italic text-slate-600">
        (Notis Penganugerahan dan Tawaran Pampasan di Bawah Seksyen 16)
      </div>
    </div>
  );

  // Reusable Component: Secondary Header for Page 2 and Page 3
  const renderSecondaryHeader = (pageNumber: number) => (
    <div className="text-center pb-3 border-b border-slate-300 space-y-1">
      <div className="text-[16px] font-bold tracking-wide uppercase text-slate-900">
        BORANG H / FORM H — NOTICE OF AWARD AND OFFER OF COMPENSATION
      </div>
      <div className="text-[14px] text-slate-600">
        Offer Reference No.: <strong className="text-slate-900 font-bold">{offer.offerReferenceNo}</strong> · Case ID: <strong className="text-slate-900 font-bold">{offer.caseId}</strong>
      </div>
    </div>
  );

  // Reusable Component: Header Metadata Box
  const renderMetadataBox = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 border-b border-slate-200 text-[15px]">
      <div className="space-y-1">
        <div>
          <span className="font-bold text-slate-900">Offer Reference No.: </span>
          <span className="text-slate-600">{offer.offerReferenceNo}</span>
        </div>
        <div>
          <span className="font-bold text-slate-900">Case Reference No.: </span>
          <span className="text-slate-600">{offer.caseId}</span>
        </div>
        <div>
          <span className="font-bold text-slate-900">Date of Issue: </span>
          <span className="text-slate-600">{offer.issueDate}</span>
        </div>
      </div>
      <div className="space-y-1">
        <div>
          <span className="font-bold text-slate-900">Project: </span>
          <span className="text-slate-600">{offer.projectName}</span>
        </div>
        <div>
          <span className="font-bold text-slate-900">Acquiring Authority: </span>
          <span className="text-slate-600">{offer.acquiringAuthority}</span>
        </div>
      </div>
    </div>
  );

  // Reusable Component: Section 1
  const renderSection1 = () => {
    const ownerList =
      offer.owners && offer.owners.length > 0
        ? offer.owners
        : [
            {
              ownerId: "single-1",
              name: offer.ownerName || "—",
              nric: offer.ownerIc || "—",
              sharePercentage: "100%",
            },
          ];

    return (
      <div className="py-3 border-b border-slate-200 space-y-2.5">
        <h3 className="text-[17px] font-bold uppercase tracking-wider text-slate-900">
          1. RECIPIENT / REGISTERED LAND OWNER INFORMATION
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-[15px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold">
                <th className="p-2.5 border border-slate-300 text-center w-14 text-[15px] font-bold">No.</th>
                <th className="p-2.5 border border-slate-300 text-left text-[15px] font-bold">Owner Name</th>
                <th className="p-2.5 border border-slate-300 text-left w-52 text-[15px] font-bold">NRIC / Passport</th>
                <th className="p-2.5 border border-slate-300 text-center w-36 text-[15px] font-bold">Shareholding</th>
              </tr>
            </thead>
            <tbody>
              {ownerList.map((ow, idx) => (
                <tr key={ow.ownerId || idx} className="hover:bg-slate-50 text-slate-700 text-[15px]">
                  <td className="p-2.5 border border-slate-300 text-center text-slate-800 font-medium text-[15px]">
                    {idx + 1}
                  </td>
                  <td className="p-2.5 border border-slate-300 font-bold text-slate-900 text-[15px]">
                    {ow.name}
                  </td>
                  <td className="p-2.5 border border-slate-300 text-slate-700 text-[15px]">
                    {ow.nric}
                  </td>
                  <td className="p-2.5 border border-slate-300 text-center text-slate-700 font-medium text-[15px]">
                    {typeof ow.sharePercentage === "number"
                      ? `${ow.sharePercentage}%`
                      : ow.sharePercentage || "100%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Reusable Component: Section 2
  const renderSection2 = (includeBottomBorder = true) => (
    <div className={`py-3 ${includeBottomBorder ? "border-b border-slate-200" : ""} space-y-2`}>
      <h3 className="text-[17px] font-bold uppercase tracking-wider text-slate-900">
        2. LAND AND PROPERTY PARTICULARS
      </h3>
      <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[15px] space-y-2">
        {/* Row 1: Title No */}
        <div>
          <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Title No.:</span>
          <span className="text-[15px] text-slate-600">{offer.landTitle}</span>
        </div>

        {/* Row 2: Lot No | Tempat | Mukim | District & State */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200">
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Lot No.:</span>
            <span className="text-[15px] text-slate-600">{offer.lotNo}</span>
          </div>
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Tempat:</span>
            <span className="text-[15px] text-slate-600">{offer.tempat || "—"}</span>
          </div>
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Mukim:</span>
            <span className="text-[15px] text-slate-600">{offer.mukim}</span>
          </div>
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">District & State:</span>
            <span className="text-[15px] text-slate-600">
              {offer.district}, {offer.state}
            </span>
          </div>
        </div>

        {/* Row 3: Total Land Area | Acquisition Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200">
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Total Land Area:</span>
            <span className="text-[15px] text-slate-600">{offer.landArea}</span>
          </div>
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Acquisition Area:</span>
            <span className="text-[15px] text-slate-600">{offer.acquisitionArea}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Reusable Component: Section 3
  const renderSection3 = () => (
    <div className="py-4 pb-5 border-b border-slate-200 space-y-3.5">
      <h3 className="text-[17px] font-bold uppercase tracking-wider text-slate-900">
        3. COMPENSATION AND AWARD BREAKDOWN
      </h3>

      <table className="w-full text-[15px] border-collapse border border-slate-300">
        <thead>
          <tr className="bg-slate-100 text-slate-900 font-bold">
            <th className="p-2.5 border border-slate-300 text-left text-[15px] font-bold">Itemized Component Description</th>
            <th className="p-2.5 border border-slate-300 text-right w-64 text-[15px] font-bold pr-4">Awarded Amount (RM)</th>
          </tr>
        </thead>
        <tbody>
          {offer.components.landValue > 0 && (
            <tr>
              <td className="p-2.5 border border-slate-300 text-slate-900 text-[15px] font-bold">Land Value Compensation</td>
              <td className="p-2.5 border border-slate-300 text-right text-slate-700 text-[15px] font-semibold pr-4">
                {formatCurrencyRM(offer.components.landValue)}
              </td>
            </tr>
          )}
          {offer.components.buildingValue > 0 && (
            <tr>
              <td className="p-2.5 border border-slate-300 text-slate-900 text-[15px] font-bold">Building and Structure Value</td>
              <td className="p-2.5 border border-slate-300 text-right text-slate-700 text-[15px] font-semibold pr-4">
                {formatCurrencyRM(offer.components.buildingValue)}
              </td>
            </tr>
          )}
          {offer.components.cropValue > 0 && (
            <tr>
              <td className="p-2.5 border border-slate-300 text-slate-900 text-[15px] font-bold">Crop and Plantation Value</td>
              <td className="p-2.5 border border-slate-300 text-right text-slate-700 text-[15px] font-semibold pr-4">
                {formatCurrencyRM(offer.components.cropValue)}
              </td>
            </tr>
          )}
          {offer.components.businessDisruption > 0 && (
            <tr>
              <td className="p-2.5 border border-slate-300 text-slate-900 text-[15px] font-bold">Business Disruption</td>
              <td className="p-2.5 border border-slate-300 text-right text-slate-700 text-[15px] font-semibold pr-4">
                {formatCurrencyRM(offer.components.businessDisruption)}
              </td>
            </tr>
          )}
          {offer.components.disturbanceCompensation > 0 && (
            <tr>
              <td className="p-2.5 border border-slate-300 text-slate-900 text-[15px] font-bold">Disturbance Compensation</td>
              <td className="p-2.5 border border-slate-300 text-right text-slate-700 text-[15px] font-semibold pr-4">
                {formatCurrencyRM(offer.components.disturbanceCompensation)}
              </td>
            </tr>
          )}
          {offer.components.relocationAllowance > 0 && (
            <tr>
              <td className="p-2.5 border border-slate-300 text-slate-900 text-[15px] font-bold">Relocation Allowance</td>
              <td className="p-2.5 border border-slate-300 text-right text-slate-700 text-[15px] font-semibold pr-4">
                {formatCurrencyRM(offer.components.relocationAllowance)}
              </td>
            </tr>
          )}
          {offer.components.otherEligible > 0 && (
            <tr>
              <td className="p-2.5 border border-slate-300 text-slate-900 text-[15px] font-bold">Other Eligible Items (Special Damages)</td>
              <td className="p-2.5 border border-slate-300 text-right text-slate-700 text-[15px] font-semibold pr-4">
                {formatCurrencyRM(offer.components.otherEligible)}
              </td>
            </tr>
          )}
          <tr className="bg-slate-50 font-bold">
            <td className="p-2.5 border border-slate-300 uppercase tracking-wide text-slate-900 text-[15px] font-bold">
              TOTAL COMPENSATION AWARDED
            </td>
            <td className="p-2.5 border border-slate-300 text-right text-slate-950 font-bold text-[15px] pr-4">
              {formatCurrencyRM(offer.totalCompensation)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Valuation Benchmark References */}
      <div className="p-4 pb-5 bg-slate-50 rounded-lg border border-slate-200 text-[15px] space-y-3">
        <div className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">
          Valuation Assessment Reference Benchmarks
        </div>
        <div className="grid grid-cols-4 gap-3 pt-1 text-[14px]">
          <div className="p-3.5 pb-6 bg-white rounded-lg border border-slate-300 shadow-2xs flex flex-col justify-start min-h-[96px]">
            <span className="text-[12px] font-bold text-slate-700 block uppercase tracking-tight leading-tight">Market Value</span>
            <span className="text-[14px] font-bold text-slate-900 block truncate mt-auto">
              {formatCurrencyRM(offer.valuationReferences.marketValue)}
            </span>
          </div>
          <div className="p-3.5 pb-6 bg-white rounded-lg border border-slate-300 shadow-2xs flex flex-col justify-start min-h-[96px]">
            <span className="text-[12px] font-bold text-slate-700 block uppercase tracking-tight leading-tight">AI Value</span>
            <span className="text-[14px] font-bold text-slate-900 block truncate mt-auto">
              {offer.valuationReferences.aiValuationPrice
                ? formatCurrencyRM(offer.valuationReferences.aiValuationPrice)
                : "—"}
            </span>
          </div>
          <div className="p-3.5 pb-6 bg-white rounded-lg border border-slate-300 shadow-2xs flex flex-col justify-start min-h-[96px]">
            <span className="text-[12px] font-bold text-slate-700 block uppercase tracking-tight leading-tight">Recommended Value</span>
            <span className="text-[14px] font-bold text-slate-900 block truncate mt-auto">
              {formatCurrencyRM(offer.valuationReferences.recommendedCompensation)}
            </span>
          </div>
          <div className="p-3.5 pb-6 bg-white rounded-lg border border-slate-300 shadow-2xs flex flex-col justify-start min-h-[96px]">
            <span className="text-[12px] font-bold text-slate-700 block uppercase tracking-tight leading-tight">Approved Compensation</span>
            <span className="text-[14px] font-bold text-slate-900 block truncate mt-auto">
              {formatCurrencyRM(offer.valuationReferences.approvedCompensation)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Reusable Component: Section 4
  const renderSection4 = () => (
    <div className="py-3 border-b border-slate-200 space-y-2">
      <h3 className="text-[17px] font-bold uppercase tracking-wider text-slate-900">
        4. AWARD PROCEEDINGS AND STATUTORY TIMELINE
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[15px]">
        <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
          <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Hearing / Enquiry Date</span>
          <span className="text-[15px] text-slate-600">{offer.enquiryDate}</span>
        </div>
        <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
          <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Award Date</span>
          <span className="text-[15px] text-slate-600">{offer.awardDate}</span>
        </div>
      </div>
    </div>
  );

  // Reusable Component: Section 5
  const renderSection5 = (includeBottomBorder = true) => (
    <div className={`py-3 ${includeBottomBorder ? "border-b border-slate-200" : ""} space-y-2`}>
      <h3 className="text-[17px] font-bold uppercase tracking-wider text-slate-900">
        5. ACCEPTANCE OPTIONS (TAWARAN PILIHAN PENERIMAAN)
      </h3>
      <p className="text-[15px] text-slate-600">
        Please indicate your election regarding this award by marking the appropriate box below:
      </p>

      <div className="space-y-2.5 pt-0.5">
        {/* Option 1 */}
        <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-300 rounded text-[15px]">
          <span className="w-5 h-5 rounded-full border-2 border-slate-800 flex-shrink-0 inline-block bg-white"></span>
          <div className="text-[15px] leading-snug text-slate-900">
            <strong className="font-bold text-slate-900">I ACCEPT</strong>{" "}
            <span className="text-slate-600">
              the offer of compensation as awarded in full and final settlement.
            </span>
          </div>
        </div>

        {/* Option 2 */}
        <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-300 rounded text-[15px]">
          <span className="w-5 h-5 rounded-full border-2 border-slate-800 flex-shrink-0 inline-block bg-white"></span>
          <div className="text-[15px] leading-snug text-slate-900">
            <strong className="font-bold text-slate-900">I ACCEPT</strong>{" "}
            <span className="text-slate-600">the offer of compensation </span>
            <strong className="font-bold text-slate-900">UNDER PROTEST</strong>{" "}
            <span className="text-slate-600">
              and reserve the right to refer the matter to Court under Section 37.
            </span>
          </div>
        </div>

        {/* Option 3 */}
        <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-300 rounded text-[15px]">
          <span className="w-5 h-5 rounded-full border-2 border-slate-800 flex-shrink-0 inline-block bg-white"></span>
          <div className="text-[15px] leading-snug text-slate-900">
            <strong className="font-bold text-slate-900">I DO NOT ACCEPT</strong>{" "}
            <span className="text-slate-600">the offer of compensation awarded.</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Reusable Component: Section 6
  const renderSection6 = () => (
    <div className="pt-3 space-y-3">
      <div className="space-y-1">
        <h3 className="text-[17px] font-bold uppercase tracking-wider text-slate-900">
          6. OWNER DECLARATION AND SIGNATURE
        </h3>
        <p className="text-[15px] italic text-slate-600">
          "I acknowledge that I have received and read this Notice of Award and Offer of Compensation."
        </p>
      </div>

      <div className="space-y-4 text-[15px] max-w-sm pt-2">
        <div>
          <span className="text-[15px] font-bold text-slate-900 block mb-1">Signature:</span>
          <div className="border-b border-slate-400 h-6"></div>
        </div>

        <div>
          <span className="text-[15px] font-bold text-slate-900 block mb-1">Name:</span>
          <div className="border-b border-slate-400 pb-2 text-slate-700 text-[15px]">
            {offer.ownerName}
          </div>
        </div>

        <div>
          <span className="text-[15px] font-bold text-slate-900 block mb-1">NRIC:</span>
          <div className="border-b border-slate-400 pb-2 text-slate-700 text-[15px]">
            {offer.ownerIc}
          </div>
        </div>

        <div>
          <span className="text-[15px] font-bold text-slate-900 block mb-1">Date:</span>
          <div className="border-b border-slate-400 pb-2 text-slate-700 text-[15px]">
            {offer.issueDate}
          </div>
        </div>
      </div>
    </div>
  );

  // Reusable Component: Fixed Position Bottom Footer for Download Pages
  const renderPageFooter = (pageNum: number, totalPages: number = 3) => (
    <div
      style={{
        position: "absolute",
        bottom: "28px",
        left: "40px",
        right: "40px",
        borderTop: "1px solid #cbd5e1",
        paddingTop: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "13px",
        color: "#64748b",
      }}
    >
      <div style={{ width: "80px" }}></div>
      <div
        style={{
          flex: 1,
          textAlign: "center",
          fontStyle: "italic",
          color: "#475569",
          whiteSpace: "nowrap",
          fontSize: "13px",
        }}
      >
        Form H · Notice of Award and Offer of Compensation · Land Acquisition Act 1960
      </div>
      <div
        style={{
          width: "80px",
          textAlign: "right",
          fontWeight: 600,
          color: "#475569",
          fontSize: "13px",
        }}
      >
        [ Page {pageNum} of {totalPages} ]
      </div>
    </div>
  );

  return (
    <div className="pdf-viewer-container mt-6 bg-md-surface-container rounded-2xl border border-md-outline/15 shadow-sm overflow-hidden">
      {/* PDF Toolbar Header */}
      <div className="pdf-toolbar flex justify-between items-center p-3.5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-md-on-surface font-semibold text-sm">
            <FileText size={18} className="text-md-primary" />
            <span>Form H: Notice of Award and Offer of Compensation</span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="hidden sm:flex items-center bg-md-surface-container-low border border-md-outline/15 rounded-lg p-1 text-xs">
            <button
              onClick={() => setViewMode("pdf")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition font-medium ${
                viewMode === "pdf"
                  ? "bg-md-primary text-white shadow-xs"
                  : "text-md-on-surface-variant hover:bg-md-outline/10"
              }`}
              title="Native PDF Viewer (Exact compiled document)"
            >
              <FileText size={13} />
              <span>PDF Viewer</span>
            </button>
            <button
              onClick={() => setViewMode("html")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition font-medium ${
                viewMode === "html"
                  ? "bg-md-primary text-white shadow-xs"
                  : "text-md-on-surface-variant hover:bg-md-outline/10"
              }`}
              title="Dynamic Synchronized HTML Sheet View"
            >
              <Layers size={13} />
              <span>Sheet View</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh PDF Blob Button */}
          {viewMode === "pdf" && (
            <button
              onClick={() => generatePdfBlob()}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-md-outline/20 text-xs font-medium text-md-on-surface hover:bg-md-outline/10 transition disabled:opacity-50"
              title="Re-generate PDF Document"
            >
              <RefreshCw size={13} className={isGeneratingPdf ? "animate-spin text-md-primary" : ""} />
              <span className="hidden md:inline">Refresh PDF</span>
            </button>
          )}

          {/* Collapse / Expand Toggle for Desktop */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-md-outline/20 text-xs font-medium text-md-on-surface hover:bg-md-outline/10 transition"
            title={isCollapsed ? "Expand PDF Preview" : "Collapse PDF Preview"}
          >
            {isCollapsed ? (
              <>
                <Eye size={14} className="text-md-primary" />
                <span>Show Preview</span>
                <ChevronDown size={14} />
              </>
            ) : (
              <>
                <EyeOff size={14} className="text-md-on-surface-variant" />
                <span>Collapse Preview</span>
                <ChevronUp size={14} />
              </>
            )}
          </button>

          {/* Zoom Controls for HTML Sheet View */}
          {!isCollapsed && viewMode === "html" && (
            <div className="hidden md:flex items-center bg-md-surface-container-low border border-md-outline/15 rounded-lg p-1 text-xs">
              <button
                onClick={handleZoomOut}
                className="px-2 py-1 hover:bg-md-outline/10 rounded transition text-md-on-surface"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="px-2 font-mono text-xs">{zoomScale}%</span>
              <button
                onClick={handleZoomIn}
                className="px-2 py-1 hover:bg-md-outline/10 rounded transition text-md-on-surface"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-1.5 py-1 hover:bg-md-outline/10 rounded transition text-md-on-surface-variant ml-1"
                title="Reset Zoom"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}

          <Button variant="filled" size="sm" onClick={handleDownload} isLoading={downloadingPdf}>
            <Download size={15} /> {downloadingPdf ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* MOBILE HELPER CARD */}
      <div className="md:hidden p-4 border-t border-md-outline/15 text-center space-y-3 bg-md-surface-container-low">
        <div className="flex items-center justify-center gap-2 text-md-on-surface font-semibold text-sm">
          <FileText size={18} className="text-md-primary" />
          <span>Form H PDF Ready</span>
        </div>
        <p className="text-xs text-md-on-surface-variant leading-relaxed">
          Full interactive document preview is optimized for desktop. Download the official Form H PDF below to view or print the full document.
        </p>
        <Button
          variant="filled"
          size="sm"
          className="w-full justify-center"
          onClick={handleDownload}
          isLoading={downloadingPdf}
        >
          <Download size={15} /> {downloadingPdf ? "Generating PDF..." : "Download Form H PDF"}
        </Button>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ON-SCREEN PREVIEW DROPDOWN PANEL (ATTACHED DIRECTLY TO TOOLBAR) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div className="pdf-preview-panel border-t border-md-outline/15 hidden md:flex flex-col items-center p-4 sm:p-6 bg-slate-900/10 dark:bg-slate-950/40 w-full min-h-[500px]">
          {/* MODE 1: NATIVE EMBEDDED PDF VIEWER (EXACT GENERATED PDF FILE) */}
          {viewMode === "pdf" && (
            <div className="w-full space-y-3">
              {isGeneratingPdf && !pdfUrl && (
                <div className="flex flex-col items-center justify-center h-[600px] bg-slate-900/5 rounded-2xl border border-slate-300/40 space-y-4">
                  <RefreshCw size={36} className="animate-spin text-md-primary" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Compiling Official Form H PDF Document...
                  </p>
                </div>
              )}

              {pdfUrl ? (
                <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-slate-300 bg-slate-800">
                  <iframe
                    src={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
                    className="w-full h-[850px] border-none"
                    title="Form H PDF Official Viewer"
                  />
                </div>
              ) : (
                !isGeneratingPdf && (
                  <div className="flex flex-col items-center justify-center h-[400px] bg-slate-900/5 rounded-2xl border border-dashed border-slate-300 space-y-3">
                    <FileText size={40} className="text-slate-400" />
                    <p className="text-sm text-slate-600">PDF Preview could not be loaded automatically.</p>
                    <Button variant="tonal" size="sm" onClick={() => generatePdfBlob()}>
                      <RefreshCw size={14} /> Generate PDF Viewer
                    </Button>
                  </div>
                )
              )}
            </div>
          )}

          {/* MODE 2: SYNCHRONIZED DYNAMIC A4 HTML SHEET VIEW */}
          {viewMode === "html" && (
            <div
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                transform: `scale(${zoomScale / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.2s ease-out",
              }}
              className="space-y-8 py-4 flex flex-col items-center w-full"
            >
              {pageLayouts.map((page) => (
                <div key={page.pageNumber} className="relative">
                  <div className="absolute -top-6 left-0 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Page {page.pageNumber} of {pageLayouts.length}
                  </div>
                  <div
                    style={{ width: "794px", minHeight: "1123px", padding: "36px 40px" }}
                    className="bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-sm leading-relaxed relative space-y-3"
                  >
                    {page.pageNumber === 1 ? (
                      <>
                        {renderOfficialHeader()}
                        {renderMetadataBox()}
                      </>
                    ) : (
                      renderSecondaryHeader(page.pageNumber)
                    )}

                    {page.sections.map((secId) => (
                      <React.Fragment key={secId}>
                        {secId === "sec1" && renderSection1()}
                        {secId === "sec2" && renderSection2(false)}
                        {secId === "sec3" && renderSection3()}
                        {secId === "sec4" && renderSection4()}
                        {secId === "sec5" && renderSection5(false)}
                        {secId === "sec6" && renderSection6()}
                      </React.Fragment>
                    ))}

                    {renderPageFooter(page.pageNumber, pageLayouts.length)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. HIDDEN DOM CONTAINER FOR DYNAMIC SECTION MEASUREMENT     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div
        ref={measureContainerRef}
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          width: "794px",
          fontFamily: "'Times New Roman', Times, serif",
          padding: "36px 40px",
          boxSizing: "border-box",
          visibility: "hidden",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <div data-sec="header">{renderOfficialHeader()}</div>
        <div data-sec="meta">{renderMetadataBox()}</div>
        <div data-sec="sec1">{renderSection1()}</div>
        <div data-sec="sec2">{renderSection2(true)}</div>
        <div data-sec="sec3">{renderSection3()}</div>
        <div data-sec="sec4">{renderSection4()}</div>
        <div data-sec="sec5">{renderSection5(true)}</div>
        <div data-sec="sec6">{renderSection6()}</div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. DYNAMIC PAGES CONTAINER FOR JSPDF CANVAS CAPTURE         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="pdf-print-container" aria-hidden="true">
        {pageLayouts.map((page, idx) => (
          <div
            key={page.pageNumber}
            ref={(el) => {
              dynamicPageRefs.current[idx] = el;
            }}
            style={{
              fontFamily: "'Times New Roman', Times, serif",
              backgroundColor: "#ffffff",
              width: "794px",
              height: "1123px",
              padding: "36px 40px",
              boxSizing: "border-box",
              position: "relative",
            }}
            className="pdf-sheet pdf-print-page bg-white text-slate-900 leading-relaxed"
          >
            <div className="space-y-3">
              {page.pageNumber === 1 ? (
                <>
                  {renderOfficialHeader()}
                  {renderMetadataBox()}
                </>
              ) : (
                renderSecondaryHeader(page.pageNumber)
              )}

              {page.sections.map((secId) => (
                <React.Fragment key={secId}>
                  {secId === "sec1" && renderSection1()}
                  {secId === "sec2" && renderSection2(false)}
                  {secId === "sec3" && renderSection3()}
                  {secId === "sec4" && renderSection4()}
                  {secId === "sec5" && renderSection5(false)}
                  {secId === "sec6" && renderSection6()}
                </React.Fragment>
              ))}
            </div>
            {renderPageFooter(page.pageNumber, pageLayouts.length)}
          </div>
        ))}
      </div>
    </div>
  );
};
