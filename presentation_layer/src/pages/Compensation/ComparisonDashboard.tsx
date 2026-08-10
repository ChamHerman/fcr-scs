import * as Lucide from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, GitCompare, Loader2 } from "lucide-react";
import { compensationApi } from "../../services/compensationApi";
import { landAcquisitionApi } from "../../services/landAcquisitionApi";
import "../../style.css";
import "./comparison.css";

export const CompensationComparisonList: React.FC = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase1, setSelectedCase1] = useState<string>("");
  const [selectedCase2, setSelectedCase2] = useState<string>("");
  const [comparisonResult, setComparisonResult] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [comparing, setComparing] = useState<boolean>(false);

  useEffect(() => {
    async function loadCases() {
      setLoading(true);
      try {
        const res = await landAcquisitionApi.getAllCases({ limit: 20 });
        const list = res.cases || [];
        setCases(list);
        if (list.length >= 2) {
          setSelectedCase1(list[0].caseId);
          setSelectedCase2(list[1].caseId);
        }
      } catch (err: any) {
        console.error("Failed to load cases for comparison:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, []);

  const handleRunComparison = async () => {
    if (!selectedCase1 || !selectedCase2) {
      alert("Please select two cases to compare.");
      return;
    }
    if (selectedCase1 === selectedCase2) {
      alert("Please select two different cases for comparison.");
      return;
    }

    setComparing(true);
    try {
      const res = await compensationApi.compareCases([selectedCase1, selectedCase2]);
      setComparisonResult(res.comparison || []);
    } catch (err: any) {
      console.error("Comparison failed:", err);
      alert(`Comparison Failed: ${err.message}`);
    } finally {
      setComparing(false);
    }
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    return "RM " + val.toLocaleString("en-MY", { minimumFractionDigits: 2 });
  };

  return (
    <div>
      <div className="main blur-shape-bg">
        <div className="comparison-dashboard">
          <div className="topbar" style={{ marginBottom: "20px" }}>
            <div className="topbar-left">
              <h1 style={{ marginBottom: 0 }}>Compensation Comparison</h1>
              <div className="sub">
                Side-by-side comparison of compensation packages across cases
              </div>
            </div>
            <div className="topbar-right">
              <span className="date-badge">
                <Lucide.Calendar size={16} className="inline mr-1" />
                {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              <div className="avatar">AO</div>
            </div>
          </div>

          <div className="report-card" style={{ background: "var(--md-surface-container)", padding: "24px", borderRadius: "16px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Select Cases for Side-by-Side Comparison</h3>
            
            {loading ? (
              <div style={{ padding: "20px", textAlign: "center" }}>
                <Loader2 size={24} className="inline animate-spin mr-2" /> Loading case choices...
              </div>
            ) : cases.length < 2 ? (
              <p style={{ opacity: 0.6 }}>At least 2 cases are required in the database to perform comparison.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "16px", alignItems: "end" }}>
                <div>
                  <label className="label">Case 1 *</label>
                  <select
                    value={selectedCase1}
                    onChange={(e) => setSelectedCase1(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--md-surface-container-low)" }}
                  >
                    {cases.map((c) => (
                      <option key={c.caseId} value={c.caseId}>
                        {c.caseTitle} ({c.caseId.slice(0, 8)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Case 2 *</label>
                  <select
                    value={selectedCase2}
                    onChange={(e) => setSelectedCase2(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--md-surface-container-low)" }}
                  >
                    {cases.map((c) => (
                      <option key={c.caseId} value={c.caseId}>
                        {c.caseTitle} ({c.caseId.slice(0, 8)})
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn-primary" onClick={handleRunComparison} disabled={comparing}>
                  {comparing ? <Loader2 size={16} className="inline animate-spin mr-1" /> : <GitCompare size={16} className="inline mr-1" />}
                  Compare Now
                </button>
              </div>
            )}
          </div>

          {comparisonResult && comparisonResult.length >= 2 && (
            <div className="table-wrap" style={{ marginTop: "24px" }}>
              <h3 style={{ padding: "16px 20px 0 20px", fontSize: "18px" }}>Comparison Results</h3>
              <div className="table-scroll" style={{ padding: "20px" }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "200px" }}>Metric</th>
                      <th>Case #1 ({comparisonResult[0].caseTitle})</th>
                      <th>Case #2 ({comparisonResult[1].caseTitle})</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Case ID</strong></td>
                      <td>{comparisonResult[0].caseId}</td>
                      <td>{comparisonResult[1].caseId}</td>
                    </tr>
                    <tr>
                      <td><strong>Project Name</strong></td>
                      <td>{comparisonResult[0].projectName}</td>
                      <td>{comparisonResult[1].projectName}</td>
                    </tr>
                    <tr>
                      <td><strong>Land Area</strong></td>
                      <td>{comparisonResult[0].landArea}</td>
                      <td>{comparisonResult[1].landArea}</td>
                    </tr>
                    <tr>
                      <td><strong>Valuation Method</strong></td>
                      <td>{comparisonResult[0].valuationMethod}</td>
                      <td>{comparisonResult[1].valuationMethod}</td>
                    </tr>
                    <tr>
                      <td><strong>Market Value</strong></td>
                      <td><strong>{formatCurrency(comparisonResult[0].marketValue)}</strong></td>
                      <td><strong>{formatCurrency(comparisonResult[1].marketValue)}</strong></td>
                    </tr>
                    <tr>
                      <td><strong>Total Compensation</strong></td>
                      <td><strong style={{ color: "var(--md-primary)" }}>{formatCurrency(comparisonResult[0].totalCompensation)}</strong></td>
                      <td><strong style={{ color: "var(--md-primary)" }}>{formatCurrency(comparisonResult[1].totalCompensation)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
