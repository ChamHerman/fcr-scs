import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, X, GitCompare } from 'lucide-react';
import '../../style.css';
import './comparison.css';
import { Sidebar } from '../Shared';

// Types
type CaseSummary = {
  id: string;
  title: string;
  project: string;
  owner: string;
  landTitle: string;
  status: string;
  registrationDate: string;
};

type CompensationDetail = {
  landValue: number;
  buildingValue: number;
  cropValue: number;
  businessDisruption: number;
  disturbanceCompensation: number;
  relocationAllowance: number;
  otherEligible: number;
  total: number;
};

type CaseFull = CaseSummary & {
  projectType: string;
  projectPurpose: string;
  projectBudget: string;
  fundingSource: string;
  landArea: string;
  landCategory: string;
  gps: string;
  ownerIc: string;
  ownerAddress: string;
  ownerPhone: string;
  valuationMethod: string;
  marketValue: number;
  recommendedCompensation: number;
  compensation: CompensationDetail;
};

type SavedComparison = {
  id: string;
  case1Id: string;
  case1Title: string;
  case2Id: string;
  case2Title: string;
  savedDate: string;
  savedBy: string;
};

// Mock data
const mockCases: CaseFull[] = [
  {
    id: 'LAC-2026-07-0024',
    title: 'Kampung Baru Land Acquisition',
    project: 'KL Sentral Redevelopment',
    projectType: 'Urban Redevelopment',
    projectPurpose: 'Mixed-use development',
    projectBudget: 'RM 45,000,000',
    fundingSource: 'Government',
    owner: 'Ahmad Bin Abdullah',
    ownerIc: '750101-10-5678',
    ownerAddress: 'No. 45, Jalan Kampung Baru, 50300 Kuala Lumpur',
    ownerPhone: '012-3456789',
    landTitle: 'PN 12345',
    landArea: '12.5',
    landCategory: 'Residential / Commercial',
    gps: '3.1390, 101.6869',
    status: 'Compensation Approved',
    registrationDate: '24 Jul 2026',
    valuationMethod: 'Comparison Method',
    marketValue: 1800000,
    recommendedCompensation: 2200000,
    compensation: {
      landValue: 1500000,
      buildingValue: 200000,
      cropValue: 50000,
      businessDisruption: 100000,
      disturbanceCompensation: 150000,
      relocationAllowance: 80000,
      otherEligible: 20000,
      total: 2200000,
    },
  },
  {
    id: 'LAC-2026-07-0023',
    title: 'Taman Mewah Phase 2',
    project: 'Transportation Development',
    projectType: 'Transportation Development',
    projectPurpose: 'Highway expansion',
    projectBudget: 'RM 120,000,000',
    fundingSource: 'Government & Private',
    owner: 'Siti Binti Hassan',
    ownerIc: '810202-08-1234',
    ownerAddress: 'No. 12, Taman Mewah, 43000 Kajang',
    ownerPhone: '019-8765432',
    landTitle: 'PN 12344',
    landArea: '8.2',
    landCategory: 'Agricultural',
    gps: '2.9850, 101.7890',
    status: 'Valuation Approved',
    registrationDate: '23 Jul 2026',
    valuationMethod: 'Income Capitalization',
    marketValue: 1500000,
    recommendedCompensation: 1850000,
    compensation: {
      landValue: 1200000,
      buildingValue: 150000,
      cropValue: 80000,
      businessDisruption: 50000,
      disturbanceCompensation: 80000,
      relocationAllowance: 60000,
      otherEligible: 0,
      total: 1850000,
    },
  },
  {
    id: 'LAC-2026-07-0022',
    title: 'Kampung Sungai Pinang',
    project: 'Public Amenities',
    projectType: 'Public Amenities',
    projectPurpose: 'Community hall',
    projectBudget: 'RM 15,000,000',
    fundingSource: 'Government',
    owner: 'Raja Abdullah',
    ownerIc: '901231-05-4321',
    ownerAddress: 'No. 8, Kampung Sungai Pinang, 48000 Rawang',
    ownerPhone: '013-9876543',
    landTitle: 'PN 12343',
    landArea: '5.0',
    landCategory: 'Residential',
    gps: '3.2100, 101.5600',
    status: 'Pending Compensation Approval',
    registrationDate: '22 Jul 2026',
    valuationMethod: 'Cost Approach',
    marketValue: 2800000,
    recommendedCompensation: 3100000,
    compensation: {
      landValue: 2500000,
      buildingValue: 300000,
      cropValue: 0,
      businessDisruption: 0,
      disturbanceCompensation: 100000,
      relocationAllowance: 200000,
      otherEligible: 0,
      total: 3100000,
    },
  },
];

const mockSavedComparisons: SavedComparison[] = [
  { id: 'CMP-001', case1Id: 'LAC-2026-07-0024', case1Title: 'Kampung Baru Land Acquisition', case2Id: 'LAC-2026-07-0023', case2Title: 'Taman Mewah Phase 2', savedDate: '23 Jul 2026', savedBy: 'Administrator (AO)' },
  { id: 'CMP-002', case1Id: 'LAC-2026-07-0022', case1Title: 'Kampung Sungai Pinang', case2Id: 'LAC-2026-07-0024', case2Title: 'Kampung Baru Land Acquisition', savedDate: '22 Jul 2026', savedBy: 'Administrator (AO)' },
];

const formatCurrency = (val: number) => `RM ${val.toLocaleString()}`;

export const CompensationComparisonCreate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCase1, setSelectedCase1] = useState<string>('');
  const [selectedCase2, setSelectedCase2] = useState<string>('');
  const [case1Data, setCase1Data] = useState<CaseFull | null>(null);
  const [case2Data, setCase2Data] = useState<CaseFull | null>(null);
  const [comparisonSaved, setComparisonSaved] = useState(false);
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>(mockSavedComparisons);

  // Load from route state if viewing saved comparison
  useEffect(() => {
    const state = location.state as { case1Id?: string; case2Id?: string } | null;
    if (state?.case1Id && state?.case2Id) {
      const c1 = mockCases.find(c => c.id === state.case1Id);
      const c2 = mockCases.find(c => c.id === state.case2Id);
      if (c1 && c2) {
        setCase1Data(c1);
        setCase2Data(c2);
        setSelectedCase1(c1.id);
        setSelectedCase2(c2.id);
      }
    }
  }, [location]);

  const handleCompare = () => {
    if (!selectedCase1 || !selectedCase2) return;
    if (selectedCase1 === selectedCase2) {
      alert('Please select two different cases.');
      return;
    }
    const c1 = mockCases.find(c => c.id === selectedCase1);
    const c2 = mockCases.find(c => c.id === selectedCase2);
    if (c1 && c2) {
      setCase1Data(c1);
      setCase2Data(c2);
    }
  };

  const handleSave = () => {
    if (!case1Data || !case2Data) return;
    const newComparison: SavedComparison = {
      id: `CMP-${Date.now().toString().slice(-6)}`,
      case1Id: case1Data.id,
      case1Title: case1Data.title,
      case2Id: case2Data.id,
      case2Title: case2Data.title,
      savedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      savedBy: 'Administrator (AO)',
    };
    setSavedComparisons(prev => [newComparison, ...prev]);
    setComparisonSaved(true);
    alert('Comparison saved successfully!');
  };

  const handleClose = () => {
    navigate('/compensation/compare');
  };

  const renderCaseSelector = (label: string, value: string, onChange: (val: string) => void, excludeId?: string) => (
    <div className="selector-group">
      <label htmlFor={label}>{label}</label>
      <select id={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Select a case —</option>
        {mockCases.map(c => (
          <option key={c.id} value={c.id} disabled={c.id === excludeId}>
            {c.id} – {c.title}
          </option>
        ))}
      </select>
    </div>
  );

  const renderComparisonColumns = () => {
    if (!case1Data || !case2Data) return null;

    const renderCaseColumn = (caseData: CaseFull, label: string) => (
      <div className="col">
        <div className="col-title">
          {label} <span className="case-id">({caseData.id})</span>
        </div>
        <div className="detail-row"><span className="label">Title</span><span className="value">{caseData.title}</span></div>
        <div className="detail-row"><span className="label">Project</span><span className="value">{caseData.project}</span></div>
        <div className="detail-row"><span className="label">Project Type</span><span className="value">{caseData.projectType}</span></div>
        <div className="detail-row"><span className="label">Status</span><span className="value">{caseData.status}</span></div>
        <div className="detail-row"><span className="label">Registration Date</span><span className="value">{caseData.registrationDate}</span></div>

        <div className="section">
          <div className="section-title">Owner Information</div>
          <div className="detail-row"><span className="label">Name</span><span className="value">{caseData.owner}</span></div>
          <div className="detail-row"><span className="label">IC</span><span className="value">{caseData.ownerIc}</span></div>
          <div className="detail-row"><span className="label">Phone</span><span className="value">{caseData.ownerPhone}</span></div>
          <div className="detail-row"><span className="label">Address</span><span className="value" style={{ fontSize: '13px' }}>{caseData.ownerAddress}</span></div>
        </div>

        <div className="section">
          <div className="section-title">Land Information</div>
          <div className="detail-row"><span className="label">Title</span><span className="value">{caseData.landTitle}</span></div>
          <div className="detail-row"><span className="label">Area (ha)</span><span className="value">{caseData.landArea}</span></div>
          <div className="detail-row"><span className="label">Category</span><span className="value">{caseData.landCategory}</span></div>
          <div className="detail-row"><span className="label">GPS</span><span className="value">{caseData.gps}</span></div>
        </div>

        <div className="section">
          <div className="section-title">Valuation Report</div>
          <div className="detail-row"><span className="label">Method</span><span className="value">{caseData.valuationMethod}</span></div>
          <div className="detail-row"><span className="label">Market Value</span><span className="value">{formatCurrency(caseData.marketValue)}</span></div>
          <div className="detail-row"><span className="label">Recommended Compensation</span><span className="value">{formatCurrency(caseData.recommendedCompensation)}</span></div>
        </div>

        <div className="section">
          <div className="section-title">Compensation Breakdown</div>
          <div className="comp-item"><span className="label">Land Value</span><span className="value">{formatCurrency(caseData.compensation.landValue)}</span></div>
          <div className="comp-item"><span className="label">Building Value</span><span className="value">{formatCurrency(caseData.compensation.buildingValue)}</span></div>
          <div className="comp-item"><span className="label">Crop Value</span><span className="value">{formatCurrency(caseData.compensation.cropValue)}</span></div>
          <div className="comp-item"><span className="label">Business Disruption</span><span className="value">{formatCurrency(caseData.compensation.businessDisruption)}</span></div>
          <div className="comp-item"><span className="label">Disturbance</span><span className="value">{formatCurrency(caseData.compensation.disturbanceCompensation)}</span></div>
          <div className="comp-item"><span className="label">Relocation</span><span className="value">{formatCurrency(caseData.compensation.relocationAllowance)}</span></div>
          <div className="comp-item"><span className="label">Other Eligible</span><span className="value">{formatCurrency(caseData.compensation.otherEligible)}</span></div>
          <div className="total-row">
            <span>Total Compensation</span>
            <span>{formatCurrency(caseData.compensation.total)}</span>
          </div>
        </div>
      </div>
    );

    return (
      <div className="comparison-grid">
        {renderCaseColumn(case1Data, 'Case A')}
        {renderCaseColumn(case2Data, 'Case B')}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#f8f5fa', color: '#1c1b1f' }}>
      <Sidebar />

      <main className="main blur-shape-bg">
        <div className="comparison-view">
          <div className="selector-panel">
            {renderCaseSelector('Select Case A', selectedCase1, setSelectedCase1, selectedCase2)}
            {renderCaseSelector('Select Case B', selectedCase2, setSelectedCase2, selectedCase1)}
            <div className="actions">
              <button className="btn-compare" onClick={handleCompare} disabled={!selectedCase1 || !selectedCase2}>
                <GitCompare size={18} /> Compare
              </button>
            </div>
          </div>

          {case1Data && case2Data ? (
            <div className="comparison-container">
              <div className="comparison-header">
                <h2>Comparison Result</h2>
                <div className="actions">
                  <button className="btn-close" onClick={handleClose}>
                    <X size={16} /> Close
                  </button>
                  <button className="btn-save" onClick={handleSave} disabled={comparisonSaved}>
                    <Save size={16} /> {comparisonSaved ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
              {renderComparisonColumns()}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👈</div>
              <h4>Select two cases to compare</h4>
              <p style={{ fontSize: '14px' }}>Choose Case A and Case B from the dropdowns above.</p>
            </div>
          )}

          <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--md-on-surface-variant)', opacity: 0.6, textAlign: 'center', borderTop: '1px solid rgba(121,116,126,0.08)', paddingTop: '18px' }}>
            FCR-SCS · Compensation Comparison · For Government Officers
          </div>
        </div>
      </main>
    </div>
  );
};