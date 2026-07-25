import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "../../style.css";
import "./compensation.css";
import { Sidebar } from "../Shared";

type CompensationReport = {
  id: string;
  caseId: string;
  caseTitle: string;
  owner: string;
  totalAmount: number;
  status: "Pending Approval" | "Approved" | "Rejected" | "Offer Generated";
  statusClass: "pending" | "approved" | "rejected" | "review";
  generatedDate: string;
  offerLetterGenerated: boolean;
};

const mockReports: CompensationReport[] = [
  {
    id: "CMP-001",
    caseId: "LAC-2026-07-0024",
    caseTitle: "Kampung Baru Land Acquisition",
    owner: "Ahmad Bin Abdullah",
    totalAmount: 2200000,
    status: "Pending Approval",
    statusClass: "pending",
    generatedDate: "24 Jul 2026",
    offerLetterGenerated: false,
  },
  {
    id: "CMP-002",
    caseId: "LAC-2026-07-0023",
    caseTitle: "Taman Mewah Phase 2",
    owner: "Siti Binti Hassan",
    totalAmount: 1850000,
    status: "Pending Approval",
    statusClass: "pending",
    generatedDate: "23 Jul 2026",
    offerLetterGenerated: false,
  },
  {
    id: "CMP-003",
    caseId: "LAC-2026-07-0022",
    caseTitle: "Kampung Sungai Pinang",
    owner: "Raja Abdullah",
    totalAmount: 3100000,
    status: "Approved",
    statusClass: "approved",
    generatedDate: "22 Jul 2026",
    offerLetterGenerated: false,
  },
  {
    id: "CMP-004",
    caseId: "LAC-2026-07-0021",
    caseTitle: "Desa Harmoni Relocation",
    owner: "Zainal Abidin",
    totalAmount: 4500000,
    status: "Rejected",
    statusClass: "rejected",
    generatedDate: "21 Jul 2026",
    offerLetterGenerated: false,
  },
  {
    id: "CMP-005",
    caseId: "LAC-2026-07-0020",
    caseTitle: "Taman Mutiara Extension",
    owner: "Muthu Krishnan",
    totalAmount: 1200000,
    status: "Approved",
    statusClass: "approved",
    generatedDate: "20 Jul 2026",
    offerLetterGenerated: false,
  },
  {
    id: "CMP-006",
    caseId: "LAC-2026-07-0019",
    caseTitle: "Kampung Melayu Acquisition",
    owner: "Fatimah Binti Ali",
    totalAmount: 3800000,
    status: "Approved",
    statusClass: "approved",
    generatedDate: "19 Jul 2026",
    offerLetterGenerated: true,
  },
  {
    id: "CMP-007",
    caseId: "LAC-2026-07-0018",
    caseTitle: "Bukit Indah Land Parcel",
    owner: "Goh Soon Huat",
    totalAmount: 950000,
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
    alert(`📄 Compensation offer letter generated for report ${reportId}.`);
    // In real app, would update status to "Offer Generated" and generate PDF
  };

  const stats = [
    { label: "Total Reports", value: mockReports.length, icon: "📄" },
    {
      label: "Pending Approval",
      value: mockReports.filter((r) => r.status === "Pending Approval").length,
      icon: "⏳",
    },
    {
      label: "Approved",
      value: mockReports.filter((r) => r.status === "Approved").length,
      icon: "✅",
    },
    {
      label: "Rejected",
      value: mockReports.filter((r) => r.status === "Rejected").length,
      icon: "❌",
    },
    {
      label: "Offer Generated",
      value: mockReports.filter((r) => r.offerLetterGenerated).length,
      icon: "📃",
    },
  ];

  const formatCurrency = (val: number) => `RM ${val.toLocaleString()}`;

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "#f8f5fa", color: "#1c1b1f" }}
    >
      <Sidebar />

      <main className="main blur-shape-bg">
        <div className="compensation-dashboard">
          <div className="topbar" style={{ marginBottom: "20px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Compensation Reports</h1>
              <div className="sub">
                Manage compensation reports and generate offer letters
              </div>
            </div>
            <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="date-badge">📅 24 Jul 2026</span>
              <button className="btn-primary" onClick={handleCreate}>➕ Create Report</button>
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
              <span className="search-icon">🔍</span>
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
                              ✅ Letter Generated
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
      </main>
    </div>
  );
};
