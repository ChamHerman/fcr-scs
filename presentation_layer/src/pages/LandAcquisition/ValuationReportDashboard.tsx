import * as Lucide from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import "../../style.css";
import "./valuation_report.css";


type Report = {
  id: string;
  caseId: string;
  caseTitle: string;
  valuer: string;
  valuationDate: string;
  method: string;
  recommendedCompensation: string;
  status: "Pending Review" | "Approved" | "Rejected" | "Under Revision";
  statusClass: "pending" | "approved" | "rejected" | "review";
};

const mockReports: Report[] = [
  {
    id: "REP-001",
    caseId: "LAC-2026-07-0024",
    caseTitle: "Kampung Baru Land Acquisition",
    valuer: "Ahmad Faizal",
    valuationDate: "24 Jul 2026",
    method: "Comparison Method",
    recommendedCompensation: "RM 2,200,000",
    status: "Pending Review",
    statusClass: "pending",
  },
  {
    id: "REP-002",
    caseId: "LAC-2026-07-0023",
    caseTitle: "Taman Mewah Phase 2",
    valuer: "Nurul Huda",
    valuationDate: "23 Jul 2026",
    method: "Income Capitalization",
    recommendedCompensation: "RM 1,850,000",
    status: "Pending Review",
    statusClass: "pending",
  },
  {
    id: "REP-003",
    caseId: "LAC-2026-07-0022",
    caseTitle: "Kampung Sungai Pinang",
    valuer: "Raj Kumar",
    valuationDate: "22 Jul 2026",
    method: "Cost Approach",
    recommendedCompensation: "RM 3,100,000",
    status: "Approved",
    statusClass: "approved",
  },
  {
    id: "REP-004",
    caseId: "LAC-2026-07-0021",
    caseTitle: "Desa Harmoni Relocation",
    valuer: "Sarah Tan",
    valuationDate: "21 Jul 2026",
    method: "Residual Method",
    recommendedCompensation: "RM 4,500,000",
    status: "Rejected",
    statusClass: "rejected",
  },
  {
    id: "REP-005",
    caseId: "LAC-2026-07-0020",
    caseTitle: "Taman Mutiara Extension",
    valuer: "Ahmad Faizal",
    valuationDate: "20 Jul 2026",
    method: "Comparison Method",
    recommendedCompensation: "RM 1,200,000",
    status: "Under Revision",
    statusClass: "review",
  },
];

const statusLabels: Record<string, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  review: "Under Revision",
};

export const ValuationReportList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filtered = mockReports.filter(
    (r) =>
      (r.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.caseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.valuer.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "" || r.status === statusFilter),
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleView = (reportId: string) => {
    navigate(`/case/valuation/review`, { state: { reportId } });
  };

  const handleCreate = () => {
    navigate('/case/valuation/create');
  };

  const stats = [
    { label: "Total Reports", value: mockReports.length, icon: <Lucide.FileText size={16} className="inline mr-1" /> },
    {
      label: "Pending Review",
      value: mockReports.filter((r) => r.status === "Pending Review").length,
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
      label: "Under Revision",
      value: mockReports.filter((r) => r.status === "Under Revision").length,
      icon: <Lucide.RefreshCw size={16} className="inline mr-1" />,
    },
  ];

  return (
    <div className="valuation-report-dashboard">
          <div className="topbar" style={{ marginBottom: "20px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Valuation Reports</h1>
              <div className="sub">
                Review and manage all submitted valuation reports
              </div>
            </div>
            <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="date-badge"><Lucide.Calendar size={16} className="inline mr-1" /> 24 Jul 2026</span>
              <button className="btn-primary" onClick={handleCreate}><Lucide.Plus size={16} className="inline mr-1" /> Create Report</button>
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
                placeholder="Search by case ID, title, or valuer..."
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
                <option value="Pending Review">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Under Revision">Under Revision</option>
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
                    <th>Valuer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Action</th>
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
                      <td>{r.valuer}</td>
                      <td>{r.valuationDate}</td>
                      <td>
                        <span className={`status-badge ${r.statusClass}`}>
                          <span className="dot"></span> {r.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-view"
                          onClick={() => handleView(r.id)}
                        >
                          <Eye
                            size={14}
                            style={{ display: "inline", marginRight: "4px" }}
                          />{" "}
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
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
            FCR-SCS · Valuation Report Dashboard · For Administrators
          </div>
        </div>
  );
};
