import React, { useState } from 'react';
import { ArrowRightLeft, ShieldCheck } from 'lucide-react';
import '../../style.css';
import './predictionDashboard.css';

export const ReviewAIValuation: React.FC = () => {
  const [manualValue, setManualValue] = useState('1850000');
  const [justification, setJustification] = useState('Recent market transactions indicate a stronger demand in this locality.');

  return (
    <div className="pd-page">
      <div className="pd-shell">
        <div className="pd-card" style={{ padding: 24 }}>
          <div className="pd-header">
            <div>
              <h1 className="pd-title">Review AI Valuation</h1>
              <p className="pd-subtitle">Compare predicted values against manual government assessment inputs.</p>
            </div>
            <span className="pd-badge">Review mode</span>
          </div>

          <div className="pd-grid-two">
            <div className="pd-compare-card">
              <div className="pd-label">Predicted AI Value</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>RM 1,720,000</div>
              <div style={{ color: '#64748b', marginTop: 6 }}>Based on image and location model scoring</div>
            </div>
            <div className="pd-compare-card">
              <div className="pd-label">Manual Government Value</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>RM 1,850,000</div>
              <div style={{ marginTop: 10 }}>
                <span className="pd-diff-badge">+7.6% difference</span>
              </div>
            </div>
          </div>

          <div className="pd-grid-two" style={{ marginTop: 16 }}>
            <div className="pd-compare-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} color="#2563eb" />
                <strong>Override Review</strong>
              </div>
              <div className="pd-form-grid">
                <label>
                  <div className="pd-label">Manual price override</div>
                  <input className="pd-input" value={manualValue} onChange={(event) => setManualValue(event.target.value)} />
                </label>
                <label>
                  <div className="pd-label">Justification</div>
                  <textarea className="pd-textarea" value={justification} onChange={(event) => setJustification(event.target.value)} />
                </label>
              </div>
            </div>
            <div className="pd-compare-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowRightLeft size={16} color="#dc2626" />
                <strong>Difference Notes</strong>
              </div>
              <div className="pd-form-grid">
                <div className="pd-metric-card">
                  <div className="pd-metric-title">Variance</div>
                  <div className="pd-metric-value" style={{ fontSize: 22 }}>RM 130,000</div>
                </div>
                <div className="pd-metric-card">
                  <div className="pd-metric-title">Risk Flag</div>
                  <div className="pd-metric-value" style={{ fontSize: 22, color: '#dc2626' }}>High</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pd-cta-row">
            <button className="pd-btn-primary">Save Review</button>
          </div>
        </div>
      </div>
    </div>
  );
};
