import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import "../../style.css";
import "./case_management.css";
import { Sidebar } from "../Shared";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export const CaseManagementDashboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Static data – replace with your own state later
  const stats = [
    {
      label: "Total Cases",
      value: "347",
      change: "↑ 12% from last month",
      icon: "📁",
      trend: "up",
    },
    {
      label: "Active",
      value: "184",
      change: "↓ 3% from last month",
      icon: "⏳",
      trend: "down",
    },
    {
      label: "Completed",
      value: "128",
      change: "↑ 8% from last month",
      icon: "✅",
      trend: "up",
    },
    {
      label: "Pending Action",
      value: "35",
      change: "↑ 5% from last month",
      icon: "⏰",
      trend: "down",
    },
    {
      label: "Total Compensation",
      value: "RM 42.6M",
      change: "↑ 6% from last month",
      icon: "💰",
      trend: "up",
    },
  ];

  const cases = [
    {
      id: "LAC-2026-07-0024",
      title: "Kampung Baru Land Acquisition",
      status: "Case Registered",
      statusClass: "registered",
      date: "24 Jul 2026",
      project: "KL Sentral Redevelopment",
      landTitle: "PN 12345",
      valuer: "—",
    },
    {
      id: "LAC-2026-07-0023",
      title: "Taman Mewah Phase 2",
      status: "Valuer Assigned",
      statusClass: "valuation",
      date: "23 Jul 2026",
      project: "Transportation Development",
      landTitle: "PN 12344",
      valuer: "Azmi & Co.",
    },
    {
      id: "LAC-2026-07-0022",
      title: "Kampung Sungai Pinang",
      status: "Pending Compensation Approval",
      statusClass: "pending",
      date: "22 Jul 2026",
      project: "Public Amenities",
      landTitle: "PN 12343",
      valuer: "Valuer Rina",
    },
    {
      id: "LAC-2026-07-0021",
      title: "Desa Harmoni Relocation",
      status: "Compensation Approved",
      statusClass: "approved",
      date: "21 Jul 2026",
      project: "Urban Redevelopment",
      landTitle: "PN 12342",
      valuer: "Valuer Rina",
    },
    {
      id: "LAC-2026-07-0020",
      title: "Taman Mutiara Extension",
      status: "Offer Issued",
      statusClass: "offer",
      date: "20 Jul 2026",
      project: "Tourism Development",
      landTitle: "PN 12341",
      valuer: "Azmi & Co.",
    },
    {
      id: "LAC-2026-07-0019",
      title: "Kampung Melayu Acquisition",
      status: "Payment In Progress",
      statusClass: "payment",
      date: "19 Jul 2026",
      project: "Transportation Development",
      landTitle: "PN 12340",
      valuer: "Valuer Rina",
    },
    {
      id: "LAC-2026-07-0018",
      title: "Bukit Indah Land Parcel",
      status: "Valuation Rejected",
      statusClass: "rejected",
      date: "18 Jul 2026",
      project: "Urban Redevelopment",
      landTitle: "PN 12339",
      valuer: "Azmi & Co.",
    },
    {
      id: "LAC-2026-07-0017",
      title: "Kampung Tengah Relocation",
      status: "Case Closed",
      statusClass: "closed",
      date: "17 Jul 2026",
      project: "Public Amenities",
      landTitle: "PN 12338",
      valuer: "Valuer Rina",
    },
    {
      id: "LAC-2026-07-0016",
      title: "Taman Sari Acquisition",
      status: "Valuation In Progress",
      statusClass: "valuation",
      date: "16 Jul 2026",
      project: "Tourism Development",
      landTitle: "PN 12337",
      valuer: "Azmi & Co.",
    },
    {
      id: "LAC-2026-07-0015",
      title: "Kampung Seri Damai",
      status: "Pending Valuation Approval",
      statusClass: "pending",
      date: "15 Jul 2026",
      project: "Transportation Development",
      landTitle: "PN 12336",
      valuer: "Valuer Rina",
    },
  ];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          all: "(min-width: 0px)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as {
            reduceMotion: boolean;
          };
          if (reduceMotion) return;

          // Animate stats cards with stagger
          gsap.fromTo(
            ".stat-card",
            { y: 30, autoAlpha: 0 },
            {
              scrollTrigger: {
                trigger: ".stats-grid",
                start: "top 90%",
              },
              y: 0,
              autoAlpha: 1,
              duration: 0.6,
              stagger: 0.1,
              ease: "power3.out",
            },
          );

          // Animate table rows with stagger
          gsap.fromTo(
            ".case-row",
            { x: -20, autoAlpha: 0 },
            {
              scrollTrigger: {
                trigger: ".table-wrap",
                start: "top 85%",
              },
              x: 0,
              autoAlpha: 1,
              duration: 0.5,
              stagger: 0.08,
              ease: "power3.out",
            },
          );
        },
      );
    },
    { scope: containerRef },
  );

  return (
    <>
      <div
        ref={containerRef}
        className="flex min-h-screen"
        style={{ background: "#f8f5fa", color: "#1c1b1f" }}
      >
        {/* ====== SIDEBAR ====== */}
        <Sidebar />

        {/* ====== MAIN CONTENT ====== */}
        <main className="main blur-shape-bg">
          {/* Top Bar */}
          <div className="topbar">
            <div className="topbar-left">
              <h1>Case Management</h1>
              <div className="sub">
                Monitor and manage all land acquisition cases
              </div>
            </div>
            <div className="topbar-right">
              <span className="date-badge">📅 24 Jul 2026</span>
              <div className="avatar">AO</div>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            {stats.map((stat, idx) => (
              <div className="stat-card" key={idx}>
                <span className="stat-icon">{stat.icon}</span>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-number">{stat.value}</div>
                <span
                  className={`stat-change ${stat.trend === "down" ? "negative" : ""}`}
                >
                  {stat.change}
                </span>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by case ID, title, owner, project…"
                defaultValue="LAC-2026"
              />
            </div>
            <div className="filter-group">
              <select>
                <option value="">All Status</option>
                <option>Case Registered</option>
                <option>Valuer Assigned</option>
                <option>Valuation In Progress</option>
                <option>Pending Valuation Approval</option>
                <option>Valuation Approved</option>
                <option>Valuation Rejected</option>
                <option>Pending Compensation Approval</option>
                <option>Compensation Approved</option>
                <option>Compensation Rejected</option>
                <option>Offer Issued</option>
                <option>Offer Rejected</option>
                <option>Payment In Progress</option>
                <option>Payment Completed</option>
                <option>Case Closed</option>
              </select>
              <select>
                <option value="">All Project Types</option>
                <option>Public Amenities</option>
                <option>Transportation Development</option>
                <option>Urban Redevelopment</option>
                <option>Tourism Development</option>
                <option>Others</option>
              </select>
              <select>
                <option value="">Date Range</option>
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>Last 3 Months</option>
                <option>Custom</option>
              </select>
              <button className="btn-filter">Apply Filters</button>
              <button className="btn-clear">Clear</button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="action-bar">
            <div className="left">
              <span className="count">24</span> cases found
              <span style={{ opacity: 0.4, margin: "0 4px" }}>·</span>
              <span style={{ fontSize: "13px" }}>Showing 1–10 of 24</span>
            </div>
            <div className="right">
              <button className="btn-outline">📥 Export CSV</button>
              <button className="btn-outline">📄 Export PDF</button>
              <button className="btn-primary" onClick={() => navigate('/case/register')}>➕ New Case</button>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Case Title</th>
                    <th>Status</th>
                    <th>Registration Date</th>
                    <th>Project Name</th>
                    <th>Land Title No.</th>
                    <th>Assigned Valuer</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c, idx) => (
                    <tr
                      key={idx}
                      className="case-row"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate('/case/details', { state: { caseId: c.id } })}
                    >
                      <td>
                        <span className="case-id">{c.id}</span>
                      </td>
                      <td className="case-title">{c.title}</td>
                      <td>
                        <span className={`status-badge ${c.statusClass}`}>
                          <span className="dot"></span> {c.status}
                        </span>
                      </td>
                      <td>
                        <span className="meta-text">{c.date}</span>
                      </td>
                      <td>
                        <span className="meta-text">{c.project}</span>
                      </td>
                      <td>
                        <span className="meta-text">{c.landTitle}</span>
                      </td>
                      <td>
                        <span className="meta-text">
                          <strong>{c.valuer}</strong>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <div className="info">
                Showing <strong>1–10</strong> of <strong>24</strong> cases
              </div>
              <div className="pages">
                <button>‹</button>
                <button className="active">1</button>
                <button>2</button>
                <button>3</button>
                <button>›</button>
              </div>
            </div>
          </div>

          {/* Footer note */}
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
            FCR-SCS · Case Management Module · All data is for demonstration
            purposes.
          </div>
        </main>
      </div>
    </>
  );
};
