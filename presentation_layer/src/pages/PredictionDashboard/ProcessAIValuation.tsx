import React, { useMemo, useState } from 'react';
import { Camera, UploadCloud, Clock, BarChart3 } from 'lucide-react';
import '../../style.css';
import '../LandAcquisition/case_management.css';
import './predictionDashboard.css';

type UploadedImage = {
  name: string;
  gps: string;
  timestamp: string;
};

export const ProcessAIValuation: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([
    { name: 'front-elevation.jpg', gps: '3.1390, 101.6869', timestamp: '2026-07-31 08:12' },
    { name: 'rear-view.jpg', gps: '3.1391, 101.6870', timestamp: '2026-07-31 08:16' },
  ]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const nextImages = Array.from(files).slice(0, 4).map((file, index) => ({
      name: file.name,
      gps: index === 0 ? '3.1390, 101.6869' : '3.1392, 101.6871',
      timestamp: new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }),
    }));

    setImages((prev) => [...nextImages, ...prev].slice(0, 6));
  };

  const totalCount = useMemo(() => images.length, [images]);

  return (
    <div className="main">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Process AI Valuation</h1>
          <div className="sub">Upload property imagery and begin automated valuation processing.</div>
        </div>
        <div className="topbar-right">
          <div className="date-badge">
            <Clock size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div className="avatar">
            <BarChart3 size={20} />
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Images ready</div>
          <div className="stat-number">{totalCount}</div>
          <div className="stat-change">Ready for analysis</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Estimated confidence</div>
          <div className="stat-number">86%</div>
          <div className="stat-change">Based on samples</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next step</div>
          <div className="stat-number">Review</div>
          <div className="stat-change">Queue submission</div>
        </div>
      </div>

      <div
        className={`filter-bar ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFiles(event.dataTransfer.files);
        }}
        style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar" style={{ width: 42, height: 42 }}><Camera size={18} /></div>
          <div>
            <div style={{ fontWeight: 700 }}>Drag and drop images here</div>
            <div className="sub">High-resolution photos help improve AI valuation confidence.</div>
          </div>
        </div>
        <label className="btn-outline" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
          <UploadCloud size={16} style={{ display: 'inline', marginRight: 6 }} />
          Choose images
          <input type="file" multiple hidden onChange={(event) => handleFiles(event.target.files)} />
        </label>
      </div>

      <div className="action-bar">
        <div className="left">
          <span className="count">Uploaded images</span>
        </div>
        <div className="right">
          <button className="btn-outline">Reset</button>
          <button className="btn-primary">Process Valuation</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>GPS</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {images.map((image, index) => (
                <tr key={`${image.name}-${index}`}>
                  <td><span className="case-title">{image.name}</span></td>
                  <td>{image.gps}</td>
                  <td>{image.timestamp}</td>
                  <td><span className="status-badge approved"><span className="dot" />Ready</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
