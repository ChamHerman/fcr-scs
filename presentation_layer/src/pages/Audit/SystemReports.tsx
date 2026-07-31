import React from 'react';
import { MD3Card, MD3Button, MD3Input } from '../MD3Components';
import { Activity, Server, Clock, DownloadCloud } from 'lucide-react';

export const SystemReports: React.FC = () => {

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Report generation initiated. You will be notified when it is ready.');
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-medium text-md-on-surface mb-2">System Reports</h1>
        <p className="text-md-on-surface-variant">Generate and review performance metrics and compliance logs.</p>
      </div>

      {/* Overview Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <MD3Card elevation={1} className="flex items-center gap-6">
          <div className="w-14 h-14 bg-md-primary/10 rounded-2xl flex items-center justify-center text-md-primary">
            <Activity size={28} />
          </div>
          <div>
            <p className="text-sm text-md-on-surface-variant mb-1">System Health</p>
            <p className="text-2xl font-medium">Good</p>
          </div>
        </MD3Card>

        <MD3Card elevation={1} className="flex items-center gap-6">
          <div className="w-14 h-14 bg-md-secondary-container rounded-2xl flex items-center justify-center text-md-on-secondary-container">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-sm text-md-on-surface-variant mb-1">Uptime</p>
            <p className="text-2xl font-medium">99.99%</p>
          </div>
        </MD3Card>

        <MD3Card elevation={1} className="flex items-center gap-6">
          <div className="w-14 h-14 bg-md-tertiary/10 rounded-2xl flex items-center justify-center text-md-tertiary">
            <Server size={28} />
          </div>
          <div>
            <p className="text-sm text-md-on-surface-variant mb-1">Avg Response</p>
            <p className="text-2xl font-medium">124ms</p>
          </div>
        </MD3Card>
      </div>

      {/* Report Generation Form */}
      <div className="max-w-2xl">
        <h2 className="text-xl font-medium mb-6">Generate New Report</h2>
        <MD3Card elevation={2}>
          <form onSubmit={handleGenerateReport} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-md-on-surface">Report Type</label>
              <select className="w-full h-14 px-4 bg-md-surface-container-low rounded-t-xl border-b-2 border-md-outline outline-none focus:border-md-primary transition-colors">
                <option>System Performance Report</option>
                <option>Periodic Audit Summary</option>
                <option>Regulatory Compliance Log</option>
                <option>Backup Status Report</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <MD3Input label="Start Date" type="date" required />
              <MD3Input label="End Date" type="date" required />
            </div>

            <MD3Button type="submit" icon={<DownloadCloud size={18} />} className="w-full mt-4">
              Generate Report
            </MD3Button>
          </form>
        </MD3Card>
      </div>

    </div>
  );
};

export default SystemReports;
