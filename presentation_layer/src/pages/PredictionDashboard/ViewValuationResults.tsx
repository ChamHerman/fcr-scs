import React from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import '../../style.css';
import './predictionDashboard.css';

const rows = [
  { classification: 'Residential', marketValue: 'RM 1,320,000', confidence: 88 },
  { classification: 'Commercial', marketValue: 'RM 460,000', confidence: 74 },
  { classification: 'Agricultural', marketValue: 'RM 180,000', confidence: 91 },
];

export const ViewValuationResults: React.FC = () => {
  return (
    <div className="pd-page">
      <div className="pd-shell">
        <div className="pd-card" style={{ padding: 24 }}>
          <div className="pd-header">
            <div>
              <h1 className="pd-title">View Valuation Results</h1>
              <p className="pd-subtitle">Review the latest AI processed valuation report with supporting imagery.</p>
            </div>
            <span className="pd-badge">Case REF: AI-2026-0042</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <FileText size={16} color="#2563eb" />
            <strong>Asset imagery</strong>
          </div>
          <div className="pd-gallery">
            {[1, 2, 3].map((item) => (
              <div className="pd-gallery-item" key={item}>
                <span>Property image {item} • Watermarked</span>
              </div>
            ))}
          </div>

          <table className="pd-table">
            <thead>
              <tr>
                <th>Asset classification</th>
                <th>Estimated market value</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.classification}>
                  <td>{row.classification}</td>
                  <td>{row.marketValue}</td>
                  <td>
                    <div className="pd-progress">
                      <span style={{ width: `${row.confidence}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
