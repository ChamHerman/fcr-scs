import React from 'react';
import { Activity, TrendingUp, Database, Cpu } from 'lucide-react';
import '../../style.css';
import './predictionDashboard.css';

export const RetrainAIModel: React.FC = () => {
  const metrics = [
    { label: 'Mean Absolute Error', value: 'RM 8,450', icon: <Activity size={16} /> },
    { label: 'Prediction Accuracy', value: '92.4%', icon: <TrendingUp size={16} /> },
    { label: 'Training Samples', value: '14,280', icon: <Database size={16} /> },
    { label: 'Model Version', value: 'v3.1.2', icon: <Cpu size={16} /> },
  ];

  return (
    <div className="pd-page">
      <div className="pd-shell">
        <div className="pd-card" style={{ padding: 24 }}>
          <div className="pd-header">
            <div>
              <h1 className="pd-title">Retrain AI Model</h1>
              <p className="pd-subtitle">Coordinate model updates with fresh valuation datasets and monitor model quality.</p>
            </div>
            <span className="pd-badge">Admin console</span>
          </div>

          <div className="pd-grid-two" style={{ marginBottom: 16 }}>
            {metrics.map((metric) => (
              <div className="pd-metric-card" key={metric.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563eb' }}>
                  {metric.icon}
                  <span className="pd-metric-title">{metric.label}</span>
                </div>
                <div className="pd-metric-value" style={{ marginTop: 8 }}>{metric.value}</div>
              </div>
            ))}
          </div>

          <div className="pd-compare-card">
            <div className="pd-label">Select dataset</div>
            <select className="pd-select" style={{ marginTop: 8 }}>
              <option>Q3 2026 valuation samples</option>
              <option>Q2 2026 valuation samples</option>
              <option>Government override dataset</option>
            </select>

            <div className="pd-cta-row">
              <button className="pd-btn-primary">Initiate Model Retraining</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
