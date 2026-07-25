import * as Lucide from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import "../../style.css";
import "./offer_letter.css";

type OfferLetter = {
  id: string;
  caseId: string;
  caseTitle: string;
  ownerName: string;
  issueDate: string;
  expiryDate: string;
  compensationAmount: number;
  status: "Pending" | "Accepted" | "Rejected" | "Expired";
  statusClass: "pending" | "accepted" | "rejected" | "expired";
};

const mockOffers: OfferLetter[] = [
  {
    id: "OL-2026-001",
    caseId: "LAC-2026-07-0024",
    caseTitle: "Kampung Baru Land Acquisition",
    ownerName: "Ahmad Bin Abdullah",
    issueDate: "20 Jul 2026",
    expiryDate: "03 Aug 2026",
    compensationAmount: 2200000,
    status: "Pending",
    statusClass: "pending",
  },
  {
    id: "OL-2026-002",
    caseId: "LAC-2026-07-0023",
    caseTitle: "Taman Mewah Phase 2",
    ownerName: "Siti Binti Hassan",
    issueDate: "18 Jul 2026",
    expiryDate: "01 Aug 2026",
    compensationAmount: 1850000,
    status: "Accepted",
    statusClass: "accepted",
  },
  {
    id: "OL-2026-003",
    caseId: "LAC-2026-07-0021",
    caseTitle: "Desa Harmoni Relocation",
    ownerName: "Raja Abdullah",
    issueDate: "15 Jul 2026",
    expiryDate: "29 Jul 2026",
    compensationAmount: 4500000,
    status: "Rejected",
    statusClass: "rejected",
  },
  {
    id: "OL-2026-004",
    caseId: "LAC-2026-07-0020",
    caseTitle: "Taman Mutiara Extension",
    ownerName: "Lim Mei Ling",
    issueDate: "10 Jul 2026",
    expiryDate: "24 Jul 2026",
    compensationAmount: 1200000,
    status: "Expired",
    statusClass: "expired",
  },
  {
    id: "OL-2026-005",
    caseId: "LAC-2026-07-0019",
    caseTitle: "Kampung Melayu Acquisition",
    ownerName: "Mohd Zaki",
    issueDate: "22 Jul 2026",
    expiryDate: "05 Aug 2026",
    compensationAmount: 3100000,
    status: "Pending",
    statusClass: "pending",
  },
];

const formatCurrency = (val: number) => `RM ${val.toLocaleString()}`;

export const OfferLetterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filtered = mockOffers.filter(
    (o) =>
      (o.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.caseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.ownerName.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "" || o.status === statusFilter),
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleView = (offerId: string) => {
    navigate('/compensation/offer/review', { state: { offerId } });
  };

  const stats = [
    { label: "Total Offers", value: mockOffers.length, icon: <Lucide.FileText size={16} className="inline mr-1" /> },
    {
      label: "Pending",
      value: mockOffers.filter((o) => o.status === "Pending").length,
      icon: <Lucide.Hourglass size={16} className="inline mr-1" />,
    },
    {
      label: "Accepted",
      value: mockOffers.filter((o) => o.status === "Accepted").length,
      icon: <Lucide.CheckCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Rejected",
      value: mockOffers.filter((o) => o.status === "Rejected").length,
      icon: <Lucide.XCircle size={16} className="inline mr-1" />,
    },
    {
      label: "Expired",
      value: mockOffers.filter((o) => o.status === "Expired").length,
      icon: <Lucide.Clock size={16} className="inline mr-1" />,
    },
  ];

  return (
    <div className="offer-dashboard">
      <div className="topbar" style={{ marginBottom: "20px" }}>
        <div className="topbar-left">
          <h1 style={{ marginBottom: 0 }}>My Offer Letters</h1>
          <div className="sub">
            Review and respond to your compensation offers
          </div>
        </div>
        <div className="topbar-right">
          <span className="date-badge"><Lucide.Calendar size={16} className="inline mr-1" /> 24 Jul 2026</span>
          <div className="avatar">AB</div>
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
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Offer ID</th>
                <th>Case ID</th>
                <th>Case Title</th>
                <th>Owner</th>
                <th>Issue Date</th>
                <th>Amount</th>
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
                  <td>{o.ownerName}</td>
                  <td>{o.issueDate}</td>
                  <td>{formatCurrency(o.compensationAmount)}</td>
                  <td>
                    <span className={`status-badge ${o.statusClass}`}>
                      <span className="dot"></span> {o.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="btn-view"
                      onClick={() => handleView(o.id)}
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
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "32px",
                      color: "var(--md-on-surface-variant)",
                      opacity: 0.6,
                    }}
                  >
                    No offer letters found
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
        FCR-SCS · Offer Letter Dashboard · For Displaced Community Members
      </div>
    </div>
  );
};
