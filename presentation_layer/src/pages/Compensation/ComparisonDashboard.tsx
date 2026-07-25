import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, GitCompare } from "lucide-react";
import "../../style.css";
import "./comparison.css";
import { Sidebar } from "../Shared";

type SavedComparison = {
  id: string;
  case1Id: string;
  case1Title: string;
  case2Id: string;
  case2Title: string;
  savedDate: string;
  savedBy: string;
};

const mockSavedComparisons: SavedComparison[] = [
  {
    id: "CMP-001",
    case1Id: "LAC-2026-07-0024",
    case1Title: "Kampung Baru Land Acquisition",
    case2Id: "LAC-2026-07-0023",
    case2Title: "Taman Mewah Phase 2",
    savedDate: "23 Jul 2026",
    savedBy: "Administrator (AO)",
  },
  {
    id: "CMP-002",
    case1Id: "LAC-2026-07-0022",
    case1Title: "Kampung Sungai Pinang",
    case2Id: "LAC-2026-07-0024",
    case2Title: "Kampung Baru Land Acquisition",
    savedDate: "22 Jul 2026",
    savedBy: "Administrator (AO)",
  },
];

export const CompensationComparisonList: React.FC = () => {
  const navigate = useNavigate();
  const [savedComparisons] = useState<SavedComparison[]>(mockSavedComparisons);

  const handleNewComparison = () => {
    navigate('/compensation/compare/create');
  };

  const handleLoadComparison = (comparison: SavedComparison) => {
    navigate('/compensation/compare/create', {
      state: { case1Id: comparison.case1Id, case2Id: comparison.case2Id, viewMode: true, comparisonId: comparison.id },
    });
  };

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "#f8f5fa", color: "#1c1b1f" }}
    >
      <Sidebar />

      <main className="main blur-shape-bg">
        <div className="comparison-dashboard">
          <div className="topbar" style={{ marginBottom: "20px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Compensation Comparison</h1>
              <div className="sub">
                Compare compensation details between two cases (FR-CM-031)
              </div>
            </div>
            <div className="topbar-right">
              <span className="date-badge">📅 24 Jul 2026</span>
              <div className="avatar">AO</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "20px",
            }}
          >
            <button className="btn-new" onClick={handleNewComparison}>
              <Plus size={18} /> New Comparison
            </button>
          </div>

          <div className="saved-list">
            <div className="list-title">Saved Comparisons</div>
            {savedComparisons.length === 0 ? (
              <div className="empty-state">No saved comparisons yet.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Comparison ID</th>
                    <th>Case 1</th>
                    <th>Case 2</th>
                    <th>Saved Date</th>
                    <th>Saved By</th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {savedComparisons.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="case-id">{s.id}</span>
                      </td>
                      <td>{s.case1Title}</td>
                      <td>{s.case2Title}</td>
                      <td>{s.savedDate}</td>
                      <td>{s.savedBy}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-view-comp"
                          onClick={() => handleLoadComparison(s)}
                        >
                          <GitCompare
                            size={14}
                            style={{ display: "inline", marginRight: "4px" }}
                          />{" "}
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            FCR-SCS · Compensation Comparison · For Government Officers
          </div>
        </div>
      </main>
    </div>
  );
};
