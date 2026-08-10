import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, FileText } from 'lucide-react';
import '../../style.css';
import '../LandAcquisition/case_management.css';
import './reports.css';
import { STATES } from './reportConstants';

type ReportFormValues = {
  category: string;
  location: string;
  startDate: string;
  endDate: string;
  state: string;
};

const initialFormValues: ReportFormValues = {
  category: 'Compensation overview',
  location: 'Petaling',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  state: 'Selangor'
};

export const GenerateReports: React.FC = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<ReportFormValues>(initialFormValues);

  const handleGenerateReport = () => {
    const reportId = `RPT-${Date.now().toString().slice(-4)}`;
    const generatedAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const newReport = {
      id: reportId,
      title: formValues.category,
      type: formValues.category,
      location: `${formValues.state} / ${formValues.location}`,
      generatedAt,
      status: 'Completed',
      owner: 'Operations Team',
      totalCompensation: 'RM 1.24M',
      pendingReview: '12 cases',
      approvalRate: '94%',
      summary: `Generated ${formValues.category.toLowerCase()} for ${formValues.location}, ${formValues.state}.`,
      breakdown: [
        { label: 'Approved cases', value: '184' },
        { label: 'Pending review', value: '29' },
        { label: 'Average processing', value: '3.2 days' },
        { label: 'Disbursement', value: 'RM 4.8M' }
      ],
      dateRange: `${new Date(formValues.startDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })} - ${new Date(formValues.endDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })}`
    };

    const existingReportsRaw = window.localStorage.getItem('generated_reports');
    const existingReports = existingReportsRaw ? JSON.parse(existingReportsRaw) : [];
    window.localStorage.setItem('generated_reports', JSON.stringify([newReport, ...existingReports]));

    navigate(`/admin/reports/view/${reportId}`);
  };

  const updateField = <K extends keyof ReportFormValues>(field: K, value: ReportFormValues[K]) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const locationOptions = useMemo(
    () => (STATES[formValues.state] ?? []),
    [formValues.state]
  );

  return (
    <div className="main">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Generate Reports</h1>
          <div className="sub">Create structured reporting requests for compensation and valuation analytics.</div>
        </div>
        <div className="topbar-right">
          <div className="date-badge">
            <FileText size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> Desktop form
          </div>
          <div className="avatar">
            <CalendarRange size={20} />
          </div>
        </div>
      </div>

      <div className="filter-bar report-form-panel">
        <div className="report-form-grid">
          <div className="report-form-row">
            <label>
              <span className="meta-text">Report category</span>
              <select
                className="filter-bar select"
                style={{ width: '100%', marginTop: 8 }}
                value={formValues.category}
                onChange={(event) => updateField('category', event.target.value)}
              >
                <option>Compensation overview</option>
                <option>Valuation review</option>
                <option>Operational summary</option>
              </select>
            </label>
            <label>
              <span className="meta-text">State</span>
              <select
                className="filter-bar select"
                style={{ width: '100%', marginTop: 8 }}
                value={formValues.state}
                onChange={(event) => updateField('state', event.target.value)}
              >
                {Object.keys(STATES).map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="report-form-row">
            <label>
              <span className="meta-text">Location</span>
              <select
                className="filter-bar select"
                style={{ width: '100%', marginTop: 8 }}
                value={formValues.location}
                onChange={(event) => updateField('location', event.target.value)}
              >
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="meta-text">Start date</span>
              <input
                className="report-input"
                type="date"
                value={formValues.startDate}
                onChange={(event) => updateField('startDate', event.target.value)}
                style={{ marginTop: 8 }}
              />
            </label>
          </div>

          <div className="report-form-row">
            <label>
              <span className="meta-text">End date</span>
              <input
                className="report-input"
                type="date"
                value={formValues.endDate}
                onChange={(event) => updateField('endDate', event.target.value)}
                style={{ marginTop: 8 }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <span className="count">Ready to generate report</span>
        </div>
        <div className="right">
          <button className="btn-primary" onClick={handleGenerateReport}>Generate Report</button>
        </div>
      </div>
    </div>
  );
};
