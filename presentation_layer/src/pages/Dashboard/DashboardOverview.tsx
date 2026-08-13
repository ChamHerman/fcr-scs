import React from 'react';
import { MD3Card, MD3Button, MD3BlurBackground } from '../MD3Components';
import { ShieldCheck, Clock, UserCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  // Mock data for the dashboard
  const userRole = '';
  const userName = '';
  const lastLogin = '';

  return (
    <div className="p-6 md:p-8 min-h-screen relative z-0">
      <MD3BlurBackground />
      
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h1 className="text-4xl font-medium text-md-on-surface mb-2">Welcome, {userName}</h1>
            <div className="flex items-center text-md-on-surface-variant">
              <ShieldCheck size={18} className="mr-2 text-md-primary" />
              <span>Role: {userRole}</span>
              <span className="mx-3">•</span>
              <Clock size={18} className="mr-2 text-md-tertiary" />
              <span>Last Login: {lastLogin}</span>
            </div>
          </div>
          
          <div className="mt-6 md:mt-0 flex gap-4">
            <MD3Button variant="outlined" icon={<Settings size={18} />}>
              Settings
            </MD3Button>
            <MD3Button variant="tonal" icon={<UserCircle size={18} />} onClick={() => navigate('/admin/profile')}>
              Profile
            </MD3Button>
          </div>
        </div>

        {/* Quick Actions & Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <MD3Card elevation={1} interactive className="group relative overflow-hidden" onClick={() => navigate('/admin/users')}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-md-primary/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
            <h3 className="text-xl font-medium mb-2">User Administration</h3>
            <p className="text-md-on-surface-variant mb-6">Manage system accounts, assign roles, and toggle access.</p>
            <MD3Button variant="text" className="-ml-4 mt-auto">Go to Users</MD3Button>
          </MD3Card>

          <MD3Card elevation={1} interactive className="group relative overflow-hidden" onClick={() => navigate('/admin/audit-logs')}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-md-tertiary/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
            <h3 className="text-xl font-medium mb-2">System Audit Logs</h3>
            <p className="text-md-on-surface-variant mb-6">View and export real-time system activities and user actions.</p>
            <MD3Button variant="text" className="-ml-4 mt-auto">View Logs</MD3Button>
          </MD3Card>
          
          <MD3Card elevation={1} interactive className="group relative overflow-hidden" onClick={() => navigate('/admin/alerts')}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-md-secondary-container rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
            <h3 className="text-xl font-medium mb-2">Alert Monitoring</h3>
            <p className="text-md-on-surface-variant mb-6">Review system anomalies and operational process deadlines.</p>
            <MD3Button variant="text" className="-ml-4 mt-auto">Check Alerts</MD3Button>
          </MD3Card>
          
        </div>

      </div>
    </div>
  );
};

export default DashboardOverview;
