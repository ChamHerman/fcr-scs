import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart3, Clock, Download, PieChart } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type ReportItem = {
  id: string;
  title: string;
  type: string;
  location: string;
  generatedAt: string;
  status: string;
  owner: string;
  totalCompensation: string;
  pendingReview: string;
  approvalRate: string;
  summary: string;
  breakdown: Array<{ label: string; value: string }>;
};

const REPORT_DATA: ReportItem[] = [
  {
    id: 'RPT-1042',
    title: 'Compensation Summary',
    type: 'Overview',
    location: 'Selangor / Petaling',
    generatedAt: '24 Jul 2026',
    status: 'Completed',
    owner: 'Operations Team',
    totalCompensation: 'RM 1.24M',
    pendingReview: '12 cases',
    approvalRate: '94%',
    summary: 'High-volume compensation pipeline with strong approval throughput.',
    breakdown: [
      { label: 'Approved cases', value: '184' },
      { label: 'Pending review', value: '29' },
      { label: 'Average processing', value: '3.2 days' },
      { label: 'Disbursement', value: 'RM 4.8M' }
    ]
  },
  {
    id: 'RPT-1041',
    title: 'Asset Valuation',
    type: 'Valuation',
    location: 'Johor / Johor Bahru',
    generatedAt: '20 Jul 2026',
    status: 'Pending',
    owner: 'Valuation Unit',
    totalCompensation: 'RM 890K',
    pendingReview: '7 cases',
    approvalRate: '88%',
    summary: 'Valuation review is still awaiting committee confirmation.',
    breakdown: [
      { label: 'Approved cases', value: '71' },
      { label: 'Pending review', value: '18' },
      { label: 'Average processing', value: '4.1 days' },
      { label: 'Disbursement', value: 'RM 2.3M' }
    ]
  },
  {
    id: 'RPT-1039',
    title: 'Blockchain Audit',
    type: 'Compliance',
    location: 'Kuala Lumpur / Setiawangsa',
    generatedAt: '18 Jul 2026',
    status: 'Completed',
    owner: 'Audit Office',
    totalCompensation: 'RM 650K',
    pendingReview: '5 cases',
    approvalRate: '97%',
    summary: 'Ledger integrity checks passed with no discrepancies this cycle.',
    breakdown: [
      { label: 'Approved cases', value: '152' },
      { label: 'Pending review', value: '11' },
      { label: 'Average processing', value: '2.7 days' },
      { label: 'Disbursement', value: 'RM 1.9M' }
    ]
  }
];

const getStoredReports = (): ReportItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedReports = window.localStorage.getItem('generated_reports');
    return storedReports ? JSON.parse(storedReports) : [];
  } catch {
    return [];
  }
};

const StatCard: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div className="bg-md-surface-container rounded-xl p-5 shadow-sm transition-all duration-300 ease-md-bouncy hover:shadow-md hover:scale-[1.01]">
    <div className="text-[13px] font-medium text-md-on-surface-variant tracking-wide">{label}</div>
    <div className="text-2xl font-bold mt-1 tracking-tight">{value}</div>
    <div className="text-xs text-md-on-surface-variant mt-1.5">{sub}</div>
  </div>
);

export const ViewReports: React.FC = () => {
  useDocumentTitle('View Report');
  const { reportId } = useParams();
  const navigate = useNavigate();
  const allReports = [...REPORT_DATA, ...getStoredReports()];
  const selectedReport = allReports.find((report) => report.id === reportId);

  useEffect(() => {
    if (reportId && !selectedReport) {
      navigate('/admin/reports');
    }
  }, [reportId, selectedReport, navigate]);

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">View Reports</h1>
            <span className="px-2 py-1 rounded-lg bg-md-primary/15 text-md-primary font-bold text-xs">
              {selectedReport ? selectedReport.type : 'Report'}
            </span>
          </div>
          <p className="text-md-on-surface-variant mt-1 max-w-2xl">
            Review the overview for each report and open a detailed breakdown for any record.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-md-on-surface-variant px-3.5 py-2 rounded-full bg-md-surface-container shadow-sm">
          <Clock size={16} />
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {!selectedReport ? (
        <div className="bg-md-surface-container rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <BarChart3 size={24} className="text-md-on-surface-variant" />
            <div>
              <h2 className="text-lg font-semibold">Report not found</h2>
              <p className="text-sm text-md-on-surface-variant">Please go back and select a valid report.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total compensation" value={selectedReport.totalCompensation} sub="Live summary" />
            <StatCard label="Pending review" value={selectedReport.pendingReview} sub="Awaiting action" />
            <StatCard label="Approval rate" value={selectedReport.approvalRate} sub="Above target" />
            <StatCard label="Generated" value={selectedReport.generatedAt} sub="Latest cycle" />
          </div>

          <div className="bg-md-surface-container rounded-xl p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold">{selectedReport.title}</h2>
                <p className="text-sm text-md-on-surface-variant mt-0.5">{selectedReport.summary}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2 pr-3 text-xs font-semibold ${selectedReport.status === 'Completed' ? 'bg-[#e6f4ea] text-[#1e7b4a]' : 'bg-[#fef7e0] text-[#8d6e00]'}`}>
                <span className={`w-2 h-2 rounded-full ${selectedReport.status === 'Completed' ? 'bg-[#1e7b4a]' : 'bg-[#8d6e00]'}`} />
                {selectedReport.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
              {selectedReport.breakdown.map((item) => (
                <StatCard key={item.label} label={item.label} value={item.value} sub="Live summary" />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <SearchInput containerClassName="flex-1 min-w-[220px]" value={`Owner: ${selectedReport.owner}`} readOnly onChange={() => {}} />
              <Button variant="tonal" size="sm">
                <Download size={14} />
                Download report
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ViewReports;
