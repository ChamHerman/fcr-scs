import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, FileText } from 'lucide-react';
import '../../style.css';
import './compensation.css';
import { Sidebar } from '../Shared';

// Types
type AcquisitionCase = {
  id: string;
  title: string;
  project: string;
  owner: string;
  landTitle: string;
  status: string;
};

type ValuationReport = {
  valuationMethod: string;
  marketValue: number;
  recommendedCompensation: number;
  landValue: number;
  buildingValue: number;
  cropValue: number;
};

type Owner = {
  name: string;
  ic: string;
  address: string;
  phone: string;
};

type CompensationComponents = {
  landValue: number;
  buildingValue: number;
  cropValue: number;
  businessDisruption: number;
  disturbanceCompensation: number;
  relocationAllowance: number;
  otherEligible: number;
};

// Mock data
const mockCases: AcquisitionCase[] = [
  { id: 'LAC-2026-07-0024', title: 'Kampung Baru Land Acquisition', project: 'KL Sentral Redevelopment', owner: 'Ahmad Bin Abdullah', landTitle: 'PN 12345', status: 'Valuation Approved' },
  { id: 'LAC-2026-07-0023', title: 'Taman Mewah Phase 2', project: 'Transportation Development', owner: 'Siti Binti Hassan', landTitle: 'PN 12344', status: 'Valuation Approved' },
  { id: 'LAC-2026-07-0022', title: 'Kampung Sungai Pinang', project: 'Public Amenities', owner: 'Raja Abdullah', landTitle: 'PN 12343', status: 'Valuation In Progress' },
];

const mockValuationReport: ValuationReport = {
  valuationMethod: 'Comparison Method',
  marketValue: 1800000,
  recommendedCompensation: 2200000,
  landValue: 1500000,
  buildingValue: 200000,
  cropValue: 50000,
};

const mockOwner: Owner = {
  name: 'Ahmad Bin Abdullah',
  ic: '750101-10-5678',
  address: 'No. 45, Jalan Kampung Baru, 50300 Kuala Lumpur',
  phone: '012-3456789',
};

const mockAIAmount = 2100000; // AI predicted amount from database

export const CompensationReportGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [caseData, setCaseData] = useState<AcquisitionCase | null>(null);
  const [valuationReport, setValuationReport] = useState<ValuationReport | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [components, setComponents] = useState<CompensationComponents>({
    landValue: 0,
    buildingValue: 0,
    cropValue: 0,
    businessDisruption: 0,
    disturbanceCompensation: 0,
    relocationAllowance: 0,
    otherEligible: 0,
  });
  const [aiPredicted] = useState(mockAIAmount);
  const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningAction, setWarningAction] = useState<'review' | 'cancel' | null>(null);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<string>('');

  // Load case data when selected
  useEffect(() => {
    if (selectedCaseId) {
      const found = mockCases.find(c => c.id === selectedCaseId);
      if (found) {
        setCaseData(found);
        // Simulate fetching valuation report and owner
        setValuationReport(mockValuationReport);
        setOwner(mockOwner);
        // Pre-fill components from valuation report
        setComponents({
          landValue: mockValuationReport.landValue,
          buildingValue: mockValuationReport.buildingValue,
          cropValue: mockValuationReport.cropValue,
          businessDisruption: 0,
          disturbanceCompensation: 0,
          relocationAllowance: 0,
          otherEligible: 0,
        });
        setCalculatedTotal(null);
        setShowSummary(false);
        setGeneratedReportId(null);
        setStatusUpdate('');
      }
    } else {
      setCaseData(null);
      setValuationReport(null);
      setOwner(null);
      setComponents({ landValue: 0, buildingValue: 0, cropValue: 0, businessDisruption: 0, disturbanceCompensation: 0, relocationAllowance: 0, otherEligible: 0 });
      setCalculatedTotal(null);
      setShowSummary(false);
    }
  }, [selectedCaseId]);

  const handleComponentChange = (field: keyof CompensationComponents, value: string) => {
    const num = parseFloat(value) || 0;
    setComponents(prev => ({ ...prev, [field]: num }));
    // Reset calculated total when components change
    if (calculatedTotal !== null) {
      setCalculatedTotal(null);
      setShowSummary(false);
    }
  };

  const calculateTotal = () => {
    setIsCalculating(true);
    // Sum all components (C3)
    const total = components.landValue + components.buildingValue + components.cropValue +
                  components.businessDisruption + components.disturbanceCompensation +
                  components.relocationAllowance + components.otherEligible;
    setCalculatedTotal(total);
    setShowSummary(true);
    setIsCalculating(false);

    // Compare with AI (FR-CM-007)
    const diff = Math.abs(total - aiPredicted);
    const percent = aiPredicted > 0 ? (diff / aiPredicted) * 100 : 0;
    if (percent > 20) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  };

  const handleWarningReview = () => {
    // A1.2: User clicks review -> back to BF-7 (edit components)
    setShowWarning(false);
    setWarningAction('review');
    // Just close the modal and let user edit
  };

  const handleWarningCancel = () => {
    // A1-1: Cancel -> update status to "Pending Compensation Approval" (C2) and back to BF-13
    setShowWarning(false);
    setWarningAction('cancel');
    setStatusUpdate('Pending Compensation Approval');
    // Simulate status update
    alert('⚠️ Case status updated to "Pending Compensation Approval" (C2).');
    // Use case ends (BF-13)
  };

  const generateReport = () => {
    if (calculatedTotal === null) return;
    setIsGenerating(true);
    // Simulate report generation
    setTimeout(() => {
      const reportId = `CMP-${Date.now().toString().slice(-6)}`;
      setGeneratedReportId(reportId);

      // Determine status based on amount (A2)
      let status = 'Compensation Approved'; // C1
      if (calculatedTotal >= 1000000) {
        status = 'Pending Compensation Approval'; // C2
        // A2.1: Send notification to Government Administrator (simulated)
        alert('📨 Notification sent to Government Administrator for review (A2).');
      }

      setStatusUpdate(status);
      // Update case status (FR-CM-011)
      alert(`✅ Report generated!\nReport ID: ${reportId}\nTotal Compensation: RM ${calculatedTotal.toLocaleString()}\nStatus: ${status}`);

      // Store report (FR-CM-009) - simulated
      console.log('Report stored:', { reportId, caseId: selectedCaseId, total: calculatedTotal, status });
      setIsGenerating(false);
    }, 1500);
  };

  const handleGenerateClick = () => {
    if (calculatedTotal === null) {
      alert('Please calculate compensation first.');
      return;
    }
    // If warning is active, we should not allow generation until resolved.
    // The flow says if difference >20% they must review or cancel. So we prevent generation.
    if (showWarning) {
      alert('Please review the warning first. Either review the components or cancel.');
      return;
    }
    generateReport();
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return `RM ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      {/* Warning Modal (A1) */}
      {showWarning && (
        <div className="compensation-generator">
          <div className="warning-modal-overlay" onClick={() => {}}>
            <div className="warning-modal" onClick={(e) => e.stopPropagation()}>
              <div className="icon">⚠️</div>
              <h3>Difference Exceeds 20%</h3>
              <p>
                The calculated compensation amount differs from the AI predicted value by more than 20%.
                Please review the components or cancel.
              </p>
              <div className="modal-actions">
                <button className="btn-review" onClick={handleWarningReview}>Review Components (A1.3)</button>
                <button className="btn-cancel" onClick={handleWarningCancel}>Cancel (A1-1)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen" style={{ background: '#f8f5fa', color: '#1c1b1f' }}>
        <Sidebar />

        <main className="main blur-shape-bg">
          <div className="compensation-generator">
            <div className="topbar" style={{ marginBottom: '20px' }}>
              <div className="topbar-left">
                <h1 style={{ marginBottom: 0 }}>Compensation Report Generator</h1>
                <div className="sub">Create compensation reports for acquisition cases</div>
              </div>
              <div className="topbar-right">
                <span className="date-badge">📅 24 Jul 2026</span>
                <div className="avatar">AO</div>
              </div>
            </div>

            {/* Case Selector */}
            <div className="case-selector">
              <label htmlFor="caseSelect">Select Acquisition Case:</label>
              <select id="caseSelect" value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)}>
                <option value="">— Choose a case —</option>
                {mockCases.map(c => (
                  <option key={c.id} value={c.id}>{c.id} – {c.title}</option>
                ))}
              </select>
            </div>

            {caseData && valuationReport && owner ? (
              <div className="layout">
                {/* Left Panel: Case & Owner Info, Valuation Report Summary */}
                <div className="left-panel">
                  <div className="info-card">
                    <div className="card-title">📋 Case Information</div>
                    <div className="detail-row">
                      <div className="item"><span className="label">Case ID</span><span className="value">{caseData.id}</span></div>
                      <div className="item"><span className="label">Title</span><span className="value">{caseData.title}</span></div>
                      <div className="item"><span className="label">Project</span><span className="value">{caseData.project}</span></div>
                      <div className="item"><span className="label">Status</span><span className="value">{caseData.status}</span></div>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="card-title">👤 Owner Information</div>
                    <div className="detail-row">
                      <div className="item"><span className="label">Name</span><span className="value">{owner.name}</span></div>
                      <div className="item"><span className="label">IC</span><span className="value">{owner.ic}</span></div>
                      <div className="item" style={{ flex: '1 1 100%' }}><span className="label">Address</span><span className="value">{owner.address}</span></div>
                      <div className="item"><span className="label">Phone</span><span className="value">{owner.phone}</span></div>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="card-title">📊 Valuation Report Summary</div>
                    <div className="detail-row">
                      <div className="item"><span className="label">Method</span><span className="value">{valuationReport.valuationMethod}</span></div>
                      <div className="item"><span className="label">Market Value</span><span className="value">{formatCurrency(valuationReport.marketValue)}</span></div>
                      <div className="item"><span className="label">Recommended Compensation</span><span className="value">{formatCurrency(valuationReport.recommendedCompensation)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Compensation Form & Summary */}
                <div className="right-panel">
                  <div className="form-card">
                    <div className="form-title">Compensation Components</div>
                    <div className="form-subtitle">Enter or edit the compensation amounts (FR-CM-002, FR-CM-006)</div>

                    <div className="comp-grid">
                      <div className="comp-group">
                        <label htmlFor="landValue">Land Value <span className="required">*</span></label>
                        <input id="landValue" type="number" value={components.landValue} onChange={(e) => handleComponentChange('landValue', e.target.value)} />
                        <div className="helper">Pre-filled from valuation</div>
                      </div>
                      <div className="comp-group">
                        <label htmlFor="buildingValue">Building/Structure Value <span className="required">*</span></label>
                        <input id="buildingValue" type="number" value={components.buildingValue} onChange={(e) => handleComponentChange('buildingValue', e.target.value)} />
                      </div>
                      <div className="comp-group">
                        <label htmlFor="cropValue">Crop/Plantation Value <span className="required">*</span></label>
                        <input id="cropValue" type="number" value={components.cropValue} onChange={(e) => handleComponentChange('cropValue', e.target.value)} />
                      </div>
                      <div className="comp-group">
                        <label htmlFor="businessDisruption">Business Disruption</label>
                        <input id="businessDisruption" type="number" value={components.businessDisruption} onChange={(e) => handleComponentChange('businessDisruption', e.target.value)} />
                      </div>
                      <div className="comp-group">
                        <label htmlFor="disturbance">Disturbance Compensation</label>
                        <input id="disturbance" type="number" value={components.disturbanceCompensation} onChange={(e) => handleComponentChange('disturbanceCompensation', e.target.value)} />
                      </div>
                      <div className="comp-group">
                        <label htmlFor="relocation">Relocation Allowance</label>
                        <input id="relocation" type="number" value={components.relocationAllowance} onChange={(e) => handleComponentChange('relocationAllowance', e.target.value)} />
                      </div>
                      <div className="comp-group" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="otherEligible">Other Eligible Items (Special Damages)</label>
                        <input id="otherEligible" type="number" value={components.otherEligible} onChange={(e) => handleComponentChange('otherEligible', e.target.value)} />
                      </div>
                    </div>

                    <div className="actions">
                      <button className="btn-calc" onClick={calculateTotal} disabled={isCalculating}>
                        <Calculator size={18} /> {isCalculating ? 'Calculating...' : 'Calculate Compensation'}
                      </button>
                      <button className="btn-generate" onClick={handleGenerateClick} disabled={isGenerating || calculatedTotal === null}>
                        <FileText size={18} /> {isGenerating ? 'Generating...' : 'Generate Compensation Report'}
                      </button>
                    </div>
                  </div>

                  {/* Summary (FR-CM-005) */}
                  {showSummary && calculatedTotal !== null && (
                    <div className="summary-card">
                      <div className="summary-title">📊 Compensation Summary</div>
                      <div className="summary-grid">
                        <div className="summary-item"><span className="label">Land Value</span><span className="value">{formatCurrency(components.landValue)}</span></div>
                        <div className="summary-item"><span className="label">Building/Structure</span><span className="value">{formatCurrency(components.buildingValue)}</span></div>
                        <div className="summary-item"><span className="label">Crop/Plantation</span><span className="value">{formatCurrency(components.cropValue)}</span></div>
                        <div className="summary-item"><span className="label">Business Disruption</span><span className="value">{formatCurrency(components.businessDisruption)}</span></div>
                        <div className="summary-item"><span className="label">Disturbance Compensation</span><span className="value">{formatCurrency(components.disturbanceCompensation)}</span></div>
                        <div className="summary-item"><span className="label">Relocation Allowance</span><span className="value">{formatCurrency(components.relocationAllowance)}</span></div>
                        <div className="summary-item"><span className="label">Other Eligible</span><span className="value">{formatCurrency(components.otherEligible)}</span></div>
                      </div>
                      <div className="summary-total">
                        <span>Total Compensation (C3)</span>
                        <span>{formatCurrency(calculatedTotal)}</span>
                      </div>

                      {/* AI Comparison (FR-CM-007) */}
                      <div className="ai-comparison">
                        <span className="ai-label">🤖 AI Predicted Amount:</span>
                        <span className="ai-value">{formatCurrency(aiPredicted)}</span>
                        {!showWarning ? (
                          <span className="ok">✅ Within acceptable range</span>
                        ) : (
                          <span className="warning">⚠️ Difference exceeds 20%</span>
                        )}
                      </div>

                      {generatedReportId && (
                        <div style={{ marginTop: '12px', padding: '12px', background: 'var(--md-success)', borderRadius: 'var(--radius-md)', color: 'var(--md-success-text)', fontWeight: 500 }}>
                          ✅ Report {generatedReportId} generated. Status: {statusUpdate}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : selectedCaseId ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--md-on-surface-variant)' }}>Loading case data...</div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--md-on-surface-variant)', opacity: 0.6 }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👈</div>
                <h4 style={{ fontWeight: 600, color: 'var(--md-on-surface)', opacity: 0.8 }}>Select a case to begin</h4>
                <p style={{ fontSize: '14px' }}>Choose an acquisition case from the dropdown above.</p>
              </div>
            )}

            <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--md-on-surface-variant)', opacity: 0.6, textAlign: 'center', borderTop: '1px solid rgba(121,116,126,0.08)', paddingTop: '18px' }}>
              FCR-SCS · Compensation Module · For Administrators
            </div>
          </div>
        </main>
      </div>
    </>
  );
};