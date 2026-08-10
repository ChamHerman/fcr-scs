import React, { useState } from 'react';
import { MD3Card, MD3Button, MD3Input } from '../MD3Components';
import { Search, Download, Filter, FileText } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-medium text-md-on-surface mb-2">Audit Logs</h1>
          <p className="text-md-on-surface-variant">Real-time system activity monitoring and compliance tracking.</p>
        </div>
        <div className="flex gap-4">
          <MD3Button variant="outlined" icon={<Download size={18} />}>
            Export CSV
          </MD3Button>
          <MD3Button variant="tonal" icon={<FileText size={18} />}>
            Export PDF
          </MD3Button>
        </div>
      </div>

      <MD3Card elevation={1} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <MD3Input label="Search user or reference..." />
          <MD3Input label="Date Range" type="date" />
          <MD3Input label="Activity Type" />
          <div className="flex gap-4">
            <MD3Button variant="outlined" className="h-14 flex-1" icon={<Filter size={18} />}>
              Filter
            </MD3Button>
            <MD3Button className="h-14 flex-1" icon={<Search size={18} />}>
              Search
            </MD3Button>
          </div>
        </div>
      </MD3Card>

      <MD3Card elevation={2} className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-md-outline/30 text-md-on-surface-variant text-sm font-medium bg-md-surface-container-low">
                <th className="p-4 pl-6">Timestamp</th>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Activity Type</th>
                <th className="p-4">Details</th>
                <th className="p-4 pr-6">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map((log, index) => (
                <tr key={index} className="border-b border-md-outline/10 hover:bg-md-surface-variant/10 transition-colors">
                  <td className="p-4 pl-6 font-medium">{log.timestamp}</td>
                  <td className="p-4">{log.user}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-md-secondary-container text-xs rounded-full">{log.role}</span></td>
                  <td className="p-4">{log.activity}</td>
                  <td className="p-4">{log.details}</td>
                  <td className="p-4 pr-6 text-sm text-md-on-surface-variant">{log.ip}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-md-on-surface-variant">
                    No audit logs found matching the current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </MD3Card>
    </div>
  );
};

export default AuditLogs;
