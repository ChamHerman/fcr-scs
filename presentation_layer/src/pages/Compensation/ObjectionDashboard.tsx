import * as Lucide from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import "../../style.css";
import "./objection.css";

type Objection = {
  id: string;
  caseId: string;
  caseTitle: string;
  submittedBy: string;
  submittedDate: string;
  type: "Form N" | "Additional Evidence";
  status: "Submitted" | "Under Review" | "Approved" | "Rejected";
  statusClass: "submitted" | "review" | "approved" | "rejected";
};

const mockObjections: Objection[] = [
  {
    id: "OBJ-2026-001",
    caseId: "LAC-2026-07-0024",
    caseTitle: "Kampung Baru Land Acquisition",
    submittedBy: "Ahmad Bin Abdullah",
    submittedDate: "22 Jul 2026",
    type: "Form N",
    status: "Under Review",
    statusClass: "review",
  },
  {
    id: "OBJ-2026-002",
    caseId: "LAC-2026-07-0023",
    caseTitle: "Taman Mewah Phase 2",
    submittedBy: "Siti Binti Hassan",
    submittedDate: "21 Jul 2026",
    type: "Additional Evidence",
    status: "Submitted",
    statusClass: "submitted",
  },
  {
    id: "OBJ-2026-003",
    caseId: "LAC-2026-07-0021",
    caseTitle: "Desa Harmoni Relocation",
    submittedBy: "Raja Abdullah",
    submittedDate: "19 Jul 2026",
    type: "Form N",
    status: "Approved",
    statusClass: "approved",
  },
  {
    id: "OBJ-2026-004",
    caseId: "LAC-2026-07-0020",
    caseTitle: "Taman Mutiara Extension",
    submittedBy: "Lim Mei Ling",
    submittedDate: "18 Jul 2026",
    type: "Form N",
    status: "Rejected",
    statusClass: "rejected",
  },
  {
    id: "OBJ-2026-005",
    caseId: "LAC-2026-07-0019",
    caseTitle: "Kampung Melayu Acquisition",
    submittedBy: "Mohd Zaki",
    submittedDate: "23 Jul 2026",
    type: "Additional Evidence",
    status: "Under Review",
    statusClass: "review",
  },
];

export const ObjectionList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filtered = mockObjections.filter(
    (o) =>
      (o.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.caseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.submittedBy.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "" || o.status === statusFilter),
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleView = (id: string) => {
    navigate('/compensation/objection/review', { state: { objectionId: id } });
  };

  const handleCreate = () => {
    navigate('/compensation/objection/create');
  };

  const stats = [
    { label: "Total Objections", value: mockObjections.length, icon: <Lucide.FileText size={16} className="inline mr-1" /> },
    {
      label: "Submitted",
      value: mockObjections.filter((o) => o.status === "Submitted").length,
      icon: <Lucide.Mail size={16} className="inline mr-1" />,
    },
    {
      label: "Under Review",
      value: mockObjections.filter((o) => o.status === "Under Review").length,
      icon: <Lucide.Hourglass size={16} className="inline mr-1" />,
    },
    {
      label: "Approved",
      value: mockObjections.filter((o) => o.status === "Approved").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Rejected",
      value: mockObjections.filter((o) => o.status === "Rejected").length,
      icon: <Lucide.XCircle size={16} className="inline mr-1" />,
    },
  ];

  return (
    <div className="objection-dashboard">
      <div className="topbar" style={{ marginBottom: "20px" }}>
        <div className="topbar-left">
          <h1 style={{ marginBottom: 0 }}>Objection Management</h1>
          <div className="sub">
            Review and manage Form N objections and additional evidence
          </div>
        </div>
        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="date-badge"><Lucide.Calendar size={16} className="inline mr-1" /> 24 Jul 2026</span>
          <button className="btn-primary" onClick={handleCreate}>Submit Objection</button>
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
            placeholder="Search by case ID, title, or submitter..."
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
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select>
            <option value="">All Types</option>
            <option value="Form N">Form N</option>
            <option value="Additional Evidence">Additional Evidence</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Objection ID</th>
                <th>Case ID</th>
                <th>Case Title</th>
                <th>Submitted By</th>
                <th>Date</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span className="case-id">{o.id}</span>
                  </td>
                  <td>{o.caseId}</td>
                  <td className="case-title">{o.caseTitle}</td>
                  <td>{o.submittedBy}</td>
                  <td>{o.submittedDate}</td>
                  <td>{o.type}</td>
                  <td>
                    <span className={`status-badge ${o.statusClass}`}>
                      <span className="dot"></span> {o.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="btn-action view"
                      onClick={() => handleView(o.id)}
                    >
                      <Eye
                        size={14}
                        style={{ display: "inline", marginRight: "4px" }}
                      />{" "}
                      Review
                    </button>
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
                    No objections found
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
        FCR-SCS · Objection Management · For Government Officers
      </div>
    </div>
  );
};
