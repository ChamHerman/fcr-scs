import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as Lucide from "lucide-react";
import "../../style.css";
import "./compensation.css";

type ReportItem = {
  id: string;
  caseId: string;
  caseTitle: string;
  owner: string;
  totalAmount: number;
  status: string;
  statusClass: string;
  generatedDate: string;
  offerLetterGenerated: boolean;
};

const mockReports: ReportItem[] = [
  {
    id: "CR-2026-001",
    caseId: "LA-2026-001",
    caseTitle: "Kampung Baru Land Acquisition for Highway Expansion",
    owner: "Ahmad Bin Ibrahim",
    totalAmount: 1478750,
    status: "Approved",
    statusClass: "approved",
    generatedDate: "20 Jul 2026",
    offerLetterGenerated: true,
  },
  {
    id: "CR-2026-002",
    caseId: "LA-2026-002",
    caseTitle: "Sitiawan Lot 402 Railway Alignment Project",
    owner: "Chung Wei Ming",
    totalAmount: 920000,
    status: "Approved",
    statusClass: "approved",
    generatedDate: "21 Jul 2026",
    offerLetterGenerated: false,
  },
  {
    id: "CR-2026-003",
    caseId: "LA-2026-003",
    caseTitle: "Gombak Land Acquisition for River Mitigation",
    owner: "M. Ramasamy",
    totalAmount: 640000,
    status: "Pending Approval",
    statusClass: "pending",
    generatedDate: "22 Jul 2026",
    offerLetterGenerated: false,
  },
  {
    id: "CR-2026-004",
    caseId: "LA-2026-004",
    caseTitle: "Petaling Jaya Industrial Park Extension",
    owner: "Siti Fatimah Binti Ismail",
    totalAmount: 2150000,
    status: "Approved",
    statusClass: "approved",
    generatedDate: "19 Jul 2026",
    offerLetterGenerated: true,
  },
  {
    id: "CR-2026-005",
    caseId: "LA-2026-005",
    caseTitle: "Klang Port Access Road Upgrade",
    owner: "Tan Sri Lee Kim Yew",
    totalAmount: 3400000,
    status: "Rejected",
    statusClass: "rejected",
    generatedDate: "15 Jul 2026",
    offerLetterGenerated: false,
  },
  {
    id: "CR-2026-006",
    caseId: "LA-2026-006",
    caseTitle: "Rawang Bypass Connection Lot 112",
    owner: "K. Subramaniam",
    totalAmount: 810000,
    status: "Pending Approval",
    statusClass: "pending",
    generatedDate: "18 Jul 2026",
    offerLetterGenerated: false,
  },
];

export const CompensationReportList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filtered = mockReports.filter(
    (r) =>
      (r.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.caseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.owner.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "" || r.status === statusFilter),
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleView = (reportId: string) => {
    navigate('/compensation/report/review', { state: { reportId } });
  };

  const handleCreate = () => {
    navigate('/compensation/report/create');
  };

  const handleGenerateOffer = (reportId: string) => {
    alert(`Compensation offer letter generated for report ${reportId}.`);
  };

  const stats = [
    { label: "Total Reports", value: mockReports.length, icon: <Lucide.FileText size={16} className="inline mr-1" /> },
    {
      label: "Pending Approval",
      value: mockReports.filter((r) => r.status === "Pending Approval").length,
      icon: <Lucide.Hourglass size={16} className="inline mr-1" />,
    },
    {
      label: "Approved",
      value: mockReports.filter((r) => r.status === "Approved").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Rejected",
      value: mockReports.filter((r) => r.status === "Rejected").length,
      icon: <Lucide.XCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Offer Generated",
      value: mockReports.filter((r) => r.offerLetterGenerated).length,
      icon: <Lucide.FileText size={16} className="inline mr-1" />,
    },
  ];

  const formatCurrency = (val: number) => `RM ${val.toLocaleString()}`;

  return (
    <div className="compensation-dashboard">
      <div className="topbar" style={{ marginBottom: "20px" }}>
        <div className="topbar-left">
          <h1 style={{ marginBottom: 0 }}>Compensation Reports</h1>
          <div className="sub">
            Manage compensation reports and generate offer letters
          </div>
        </div>
        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="date-badge"><Lucide.Calendar size={16} className="inline mr-1" /> 24 Jul 2026</span>
          <button className="btn-primary" onClick={handleCreate}>Create Report</button>
          <div className="avatar">AO</div>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-label">{s.label}</div>
            <div className="stat-number">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <span className="search-icon"><Lucide.Search size={16} /></span>
          <input
            type="text"
            placeholder="Search by case ID, title, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Offer Generated">Offer Generated</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Case ID</th>
                <th>Case Title</th>
                <th>Owner</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="case-id">{r.id}</span>
                  </td>
                  <td>{r.caseId}</td>
                  <td className="case-title">{r.caseTitle}</td>
                  <td>{r.owner}</td>
                  <td>
                    <strong>{formatCurrency(r.totalAmount)}</strong>
                  </td>
                  <td>
                    <span className={`status-badge ${r.statusClass}`}>
                      <span className="dot"></span> {r.status}
                    </span>
                  </td>
                  <td>{r.generatedDate}</td>
                  <td style={{ textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        className="btn-action view"
                        onClick={() => handleView(r.id)}
                      >
                        <Eye
                          size={14}
                          style={{ display: "inline", marginRight: "4px" }}
                        />{" "}
                        View
                      </button>
                      {r.status === "Approved" &&
                        !r.offerLetterGenerated && (
                          <button
                            className="btn-action letter"
                            onClick={() => handleGenerateOffer(r.id)}
                          >
                            <FileText
                              size={14}
                              style={{
                                display: "inline",
                                marginRight: "4px",
                              }}
                            />{" "}
                            Generate Offer
                          </button>
                        )}
                      {r.offerLetterGenerated && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--md-success-text)",
                            fontWeight: 600,
                          }}
                        >
                          <Lucide.CheckCircle size={16} className="inline mr-1" /> Letter Generated
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "32px",
                      color: "var(--md-on-surface-variant)",
                      opacity: 0.6,
                    }}
                  >
                    No reports found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <div className="info">
              Showing {(currentPage - 1) * itemsPerPage + 1}–
              {Math.min(currentPage * itemsPerPage, filtered.length)} of{" "}
              {filtered.length}
            </div>
            <div className="pages">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    className={p === currentPage ? "active" : ""}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "24px",
          fontSize: "13px",
          color: "var(--md-on-surface-variant)",
          opacity: 0.6,
          textAlign: "center",
          borderTop: "1px solid rgba(121,116,126,0.08)",
          paddingTop: "18px",
        }}
      >
        FCR-SCS · Compensation Report Dashboard · For Administrators
      </div>
    </div>
  );
};
