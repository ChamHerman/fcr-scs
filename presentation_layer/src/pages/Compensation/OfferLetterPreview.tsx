import React, { useState, useRef } from "react";
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

export const OfferLetterPreview: React.FC<OfferLetterPreviewProps> = ({ offer }) => {
  const { notify } = useNotification();
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Dedicated off-screen page references for 3-Page Download export
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const page3Ref = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 10, 70));
  const handleResetZoom = () => setZoomScale(100);

  const handleDownload = async () => {
    if (!page1Ref.current || !page2Ref.current || !page3Ref.current || !offer) return;
    setDownloadingPdf(true);
    try {
      const pages = [page1Ref.current, page2Ref.current, page3Ref.current];

      // A4 portrait in mm: 210mm x 297mm
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        // Capture exact 794 x 1123 px container at 2x scale
        const canvas = await html2canvas(pageEl, {
          scale: 2, // 2x scale for sharp text and crisp borders
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
        // Exact 1:1 fit onto 210mm x 297mm A4 page
        pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
      }

      const safeFilename = `Form_H_Offer_Letter_${offer.offerReferenceNo || offer.id}.pdf`.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );
      pdf.save(safeFilename);

      notify({
        type: "success",
        title: "Download Complete",
        message: `Form H PDF (3 pages) saved as ${safeFilename}`,
      });
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      notify({
        type: "error",
        title: "Download Failed",
        message: "Failed to generate PDF. Please try again.",
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
  const renderSection1 = () => (
    <div className="py-3 border-b border-slate-200 space-y-2">
      <h3 className="text-[17px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
        <span>1. RECIPIENT / REGISTERED LAND OWNER INFORMATION</span>
      </h3>

      {offer.isMultiOwner ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[15px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold text-left">
                <th className="p-2 border border-slate-300 text-[15px] font-bold">No.</th>
                <th className="p-2 border border-slate-300 text-[15px] font-bold">Owner Name</th>
                <th className="p-2 border border-slate-300 text-[15px] font-bold">NRIC / Passport</th>
                <th className="p-2 border border-slate-300 text-[15px] font-bold">Shareholding</th>
                <th className="p-2 border border-slate-300 text-[15px] font-bold">Response Status</th>
              </tr>
            </thead>
            <tbody>
              {offer.owners.map((ow, idx) => (
                <tr key={ow.ownerId} className="hover:bg-slate-50 text-slate-600 text-[15px]">
                  <td className="p-2 border border-slate-300 text-center text-[15px]">{idx + 1}</td>
                  <td className="p-2 border border-slate-300 font-bold text-slate-900 text-[15px]">{ow.name}</td>
                  <td className="p-2 border border-slate-300 text-[15px]">{ow.nric}</td>
                  <td className="p-2 border border-slate-300 text-[15px]">{ow.sharePercentage || "—"}</td>
                  <td className="p-2 border border-slate-300 text-[15px]">
                    <span
                      className={`px-2 py-0.5 rounded text-[13px] font-semibold ${
                        ow.status === "ACCEPTED"
                          ? "bg-green-100 text-green-800"
                          : ow.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {ow.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[15px] bg-slate-50 p-3 rounded border border-slate-200">
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Registered Land Owner:</span>
            <span className="text-[15px] text-slate-600">{offer.ownerName}</span>
          </div>
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">NRIC / Passport No.:</span>
            <span className="text-[15px] text-slate-600">{offer.ownerIc}</span>
          </div>
          <div className="md:col-span-2">
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Registered Address:</span>
            <span className="text-[15px] text-slate-600">{offer.ownerAddress}</span>
          </div>
        </div>
      )}
    </div>
  );

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
    <div className="py-3 border-b border-slate-200 space-y-2.5">
      <h3 className="text-[17px] font-bold uppercase tracking-wider text-slate-900">
        3. COMPENSATION AND AWARD BREAKDOWN
      </h3>

      <table className="w-full text-[15px] border-collapse border border-slate-300">
        <thead>
          <tr className="bg-slate-100 text-slate-900 font-bold">
            <th className="p-2 border border-slate-300 text-left text-[15px] font-bold">Itemized Component Description</th>
            <th className="p-2 border border-slate-300 text-right w-48 text-[15px] font-bold">Awarded Amount (RM)</th>
          </tr>
        </thead>
        <tbody>
          {offer.components.landValue > 0 && (
            <tr>
              <td className="p-2 border border-slate-300 text-slate-900 text-[15px] font-bold">Land Value Compensation</td>
              <td className="p-2 border border-slate-300 text-right text-slate-600 text-[15px]">
                {formatCurrencyRM(offer.components.landValue)}
              </td>
            </tr>
          )}
          {offer.components.buildingValue > 0 && (
            <tr>
              <td className="p-2 border border-slate-300 text-slate-900 text-[15px] font-bold">Building and Structure Value</td>
              <td className="p-2 border border-slate-300 text-right text-slate-600 text-[15px]">
                {formatCurrencyRM(offer.components.buildingValue)}
              </td>
            </tr>
          )}
          {offer.components.cropValue > 0 && (
            <tr>
              <td className="p-2 border border-slate-300 text-slate-900 text-[15px] font-bold">Crop and Plantation Value</td>
              <td className="p-2 border border-slate-300 text-right text-slate-600 text-[15px]">
                {formatCurrencyRM(offer.components.cropValue)}
              </td>
            </tr>
          )}
          {offer.components.businessDisruption > 0 && (
            <tr>
              <td className="p-2 border border-slate-300 text-slate-900 text-[15px] font-bold">Business Disruption</td>
              <td className="p-2 border border-slate-300 text-right text-slate-600 text-[15px]">
                {formatCurrencyRM(offer.components.businessDisruption)}
              </td>
            </tr>
          )}
          {offer.components.disturbanceCompensation > 0 && (
            <tr>
              <td className="p-2 border border-slate-300 text-slate-900 text-[15px] font-bold">Disturbance Compensation</td>
              <td className="p-2 border border-slate-300 text-right text-slate-600 text-[15px]">
                {formatCurrencyRM(offer.components.disturbanceCompensation)}
              </td>
            </tr>
          )}
          {offer.components.relocationAllowance > 0 && (
            <tr>
              <td className="p-2 border border-slate-300 text-slate-900 text-[15px] font-bold">Relocation Allowance</td>
              <td className="p-2 border border-slate-300 text-right text-slate-600 text-[15px]">
                {formatCurrencyRM(offer.components.relocationAllowance)}
              </td>
            </tr>
          )}
          {offer.components.otherEligible > 0 && (
            <tr>
              <td className="p-2 border border-slate-300 text-slate-900 text-[15px] font-bold">Other Eligible Items (Special Damages)</td>
              <td className="p-2 border border-slate-300 text-right text-slate-600 text-[15px]">
                {formatCurrencyRM(offer.components.otherEligible)}
              </td>
            </tr>
          )}
          <tr className="bg-slate-50 font-bold">
            <td className="p-2.5 border border-slate-300 uppercase tracking-wide text-slate-900 text-[15px] font-bold">
              TOTAL COMPENSATION AWARDED
            </td>
            <td className="p-2.5 border border-slate-300 text-right text-slate-950 font-bold text-[15px]">
              {formatCurrencyRM(offer.totalCompensation)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Valuation Benchmark References */}
      <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[15px] space-y-1.5">
        <div className="text-[15px] font-bold text-slate-900 uppercase tracking-wider">
          Valuation Assessment Reference Benchmarks
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5 text-[15px]">
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Market Value</span>
            <span className="text-[15px] text-slate-600 block">{formatCurrencyRM(offer.valuationReferences.marketValue)}</span>
          </div>
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">AI Value</span>
            <span className="text-[15px] text-slate-600 block">
              {offer.valuationReferences.aiValuationPrice
                ? formatCurrencyRM(offer.valuationReferences.aiValuationPrice)
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Recommended Value</span>
            <span className="text-[15px] text-slate-600 block">
              {formatCurrencyRM(offer.valuationReferences.recommendedCompensation)}
            </span>
          </div>
          <div>
            <span className="text-[15px] font-bold text-slate-900 block mb-0.5">Approved Compensation</span>
            <span className="text-[15px] text-slate-600 block">
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

      <div className="space-y-2 pt-0.5">
        {/* Option 1 */}
        <div
          style={{
            display: "table",
            width: "100%",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            padding: "8px 12px",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
          }}
        >
          <div
            style={{
              display: "table-cell",
              verticalAlign: "middle",
              width: "28px",
              textAlign: "left",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: "2px solid #1e293b",
                textAlign: "center",
                lineHeight: "16px",
                fontSize: "13px",
                fontWeight: "bold",
                verticalAlign: "middle",
              }}
            >
              {offer.status === "Accepted" ? "✓" : ""}
            </span>
          </div>
          <div
            style={{
              display: "table-cell",
              verticalAlign: "middle",
              fontSize: "15px",
              lineHeight: "1.4",
              color: "#0f172a",
              paddingLeft: "8px",
            }}
          >
            <strong style={{ fontWeight: "bold", color: "#0f172a" }}>I ACCEPT</strong>{" "}
            <span style={{ color: "#475569" }}>
              the offer of compensation as awarded in full and final settlement.
            </span>
          </div>
        </div>

        {/* Option 2 */}
        <div
          style={{
            display: "table",
            width: "100%",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            padding: "8px 12px",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
          }}
        >
          <div
            style={{
              display: "table-cell",
              verticalAlign: "middle",
              width: "28px",
              textAlign: "left",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: "2px solid #1e293b",
                textAlign: "center",
                lineHeight: "16px",
                fontSize: "13px",
                fontWeight: "bold",
                verticalAlign: "middle",
              }}
            >
              {offer.status === "Accepted Under Protest" ? "✓" : ""}
            </span>
          </div>
          <div
            style={{
              display: "table-cell",
              verticalAlign: "middle",
              fontSize: "15px",
              lineHeight: "1.4",
              color: "#0f172a",
              paddingLeft: "8px",
            }}
          >
            <strong style={{ fontWeight: "bold", color: "#0f172a" }}>I ACCEPT</strong>{" "}
            <span style={{ color: "#475569" }}>the offer of compensation </span>
            <strong style={{ fontWeight: "bold", color: "#0f172a" }}>UNDER PROTEST</strong>{" "}
            <span style={{ color: "#475569" }}>
              and reserve the right to refer the matter to Court under Section 37.
            </span>
          </div>
        </div>

        {/* Option 3 */}
        <div
          style={{
            display: "table",
            width: "100%",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            padding: "8px 12px",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
          }}
        >
          <div
            style={{
              display: "table-cell",
              verticalAlign: "middle",
              width: "28px",
              textAlign: "left",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: "2px solid #1e293b",
                textAlign: "center",
                lineHeight: "16px",
                fontSize: "13px",
                fontWeight: "bold",
                verticalAlign: "middle",
              }}
            >
              {offer.status === "Rejected" ? "✓" : ""}
            </span>
          </div>
          <div
            style={{
              display: "table-cell",
              verticalAlign: "middle",
              fontSize: "15px",
              lineHeight: "1.4",
              color: "#0f172a",
              paddingLeft: "8px",
            }}
          >
            <strong style={{ fontWeight: "bold", color: "#0f172a" }}>I DO NOT ACCEPT</strong>{" "}
            <span style={{ color: "#475569" }}>the offer of compensation awarded.</span>
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
    <div className="pdf-viewer-container mt-6 space-y-4">
      {/* PDF Toolbar */}
      <div className="pdf-toolbar flex justify-between items-center bg-md-surface-container rounded-xl p-3.5 border border-md-outline/15 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-2 text-md-on-surface font-semibold text-sm">
          <FileText size={18} className="text-md-primary" />
          <span>Form H: Notice of Award and Offer of Compensation</span>
        </div>

        <div className="flex items-center gap-2">
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

          {/* Zoom Controls (Desktop only, hidden when collapsed) */}
          {!isCollapsed && (
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

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MOBILE HELPER CARD (Preview removed on mobile screens)      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="md:hidden bg-md-surface-container rounded-xl p-4 border border-md-outline/15 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-md-on-surface font-semibold text-sm">
          <FileText size={18} className="text-md-primary" />
          <span>Form H PDF Ready</span>
        </div>
        <p className="text-xs text-md-on-surface-variant leading-relaxed">
          Document preview is hidden on mobile screens. Download the official 3-page Form H PDF below to view the full document.
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
      {/* DESKTOP COLLAPSED STATE PLACEHOLDER                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      {isCollapsed && (
        <div className="hidden md:flex items-center justify-between bg-md-surface-container-low rounded-xl p-4 border border-md-outline/15">
          <div className="flex items-center gap-2.5 text-sm text-md-on-surface">
            <FileText size={18} className="text-md-primary" />
            <span>Form H PDF Preview is currently collapsed.</span>
          </div>
          <Button
            variant="tonal"
            size="sm"
            onClick={() => setIsCollapsed(false)}
          >
            <Eye size={14} /> Show Preview
          </Button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. VISIBLE ON-SCREEN PREVIEW: SINGLE CONTINUOUS PAGE (DESKTOP)*/}
      {/* ──────────────────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div className="pdf-preview-wrapper hidden md:flex overflow-x-auto p-4 sm:p-8 bg-slate-900/10 dark:bg-slate-950/40 rounded-2xl border border-md-outline/10 flex-col items-center">
          <div
            style={{
              fontFamily: "'Times New Roman', Times, serif",
              transform: `scale(${zoomScale / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.2s ease-out",
            }}
            className="pdf-sheet pdf-preview-sheet bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-sm p-8 sm:p-12 max-w-4xl w-full leading-relaxed space-y-4"
          >
            {/* Header */}
            {renderOfficialHeader()}

            {/* Metadata */}
            {renderMetadataBox()}

            {/* Section 1 */}
            {renderSection1()}

            {/* Section 2 */}
            {renderSection2(true)}

            {/* Section 3 */}
            {renderSection3()}

            {/* Section 4 */}
            {renderSection4()}

            {/* Section 5 */}
            {renderSection5(true)}

            {/* Section 6 */}
            {renderSection6()}

            {/* Preview Footer */}
            <div className="text-center text-[13px] text-slate-500 pt-6 border-t border-slate-200">
              Form H · Notice of Award and Offer of Compensation · Land Acquisition Act 1960
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. DEDICATED 3-PAGE TEMPLATE FOR DOWNLOAD (EXACT 794x1123px)  */}
      {/* Page 1: Section 1, 2                                         */}
      {/* Page 2: Section 3, 4, 5                                      */}
      {/* Page 3: Section 6                                            */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="pdf-print-container" aria-hidden="true">
        {/* DOWNLOAD PAGE 1: Section 1, 2 */}
        <div
          ref={page1Ref}
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            backgroundColor: "#ffffff",
            width: "794px",
            height: "1123px",
            padding: "36px 40px",
            boxSizing: "border-box",
            position: "relative",
          }}
          className="pdf-sheet pdf-print-page pdf-download-page-1 bg-white text-slate-900 leading-relaxed"
        >
          <div className="space-y-3">
            {renderOfficialHeader()}
            {renderMetadataBox()}
            {renderSection1()}
            {renderSection2(false)}
          </div>
          {renderPageFooter(1, 3)}
        </div>

        {/* DOWNLOAD PAGE 2: Section 3, 4, 5 */}
        <div
          ref={page2Ref}
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            backgroundColor: "#ffffff",
            width: "794px",
            height: "1123px",
            padding: "36px 40px",
            boxSizing: "border-box",
            position: "relative",
          }}
          className="pdf-sheet pdf-print-page pdf-download-page-2 bg-white text-slate-900 leading-relaxed"
        >
          <div className="space-y-3">
            {renderSecondaryHeader(2)}
            {renderSection3()}
            {renderSection4()}
            {renderSection5(false)}
          </div>
          {renderPageFooter(2, 3)}
        </div>

        {/* DOWNLOAD PAGE 3: Section 6 */}
        <div
          ref={page3Ref}
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            backgroundColor: "#ffffff",
            width: "794px",
            height: "1123px",
            padding: "36px 40px",
            boxSizing: "border-box",
            position: "relative",
          }}
          className="pdf-sheet pdf-print-page pdf-download-page-3 bg-white text-slate-900 leading-relaxed"
        >
          <div className="space-y-3">
            {renderSecondaryHeader(3)}
            {renderSection6()}
          </div>
          {renderPageFooter(3, 3)}
        </div>
      </div>
    </div>
  );
};
