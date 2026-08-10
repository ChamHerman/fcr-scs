import React, { useState } from 'react';
import { MD3Card, MD3Button } from '../MD3Components';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

export const AlertMonitoring: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);

  const handleAcknowledge = (id: number) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, status: 'acknowledged' } : alert
    ));
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-medium text-md-on-surface mb-2">Alert Monitoring</h1>
        <p className="text-md-on-surface-variant">Review and acknowledge operational deadlines and security anomalies.</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button className="px-4 py-2 rounded-full bg-md-secondary-container text-md-on-secondary-container text-sm font-medium">All Alerts</button>
        <button className="px-4 py-2 rounded-full text-md-on-surface-variant hover:bg-md-on-surface/5 text-sm font-medium">Unacknowledged</button>
        <button className="px-4 py-2 rounded-full text-md-on-surface-variant hover:bg-md-on-surface/5 text-sm font-medium">Deadlines</button>
      </div>

      <div className="space-y-4">
        {alerts.length > 0 ? alerts.map((alert) => (
          <MD3Card 
            key={alert.id} 
            elevation={1} 
            className={`group flex flex-col md:flex-row items-start md:items-center gap-6 ${alert.status === 'acknowledged' ? 'opacity-60' : ''}`}
          >
            <div className={`p-4 rounded-full flex-shrink-0 ${
              alert.urgency === 'High' ? 'bg-md-error/10 text-md-error' : 
              alert.urgency === 'Medium' ? 'bg-md-warning/10 text-md-warning' : 
              'bg-md-primary/10 text-md-primary'
            }`}>
              <AlertCircle size={24} />
            </div>
            
            <div className="flex-grow">
              <div className="flex items-center gap-3 mb-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-sm ${
                  alert.urgency === 'High' ? 'bg-md-error text-md-on-error' : 
                  alert.urgency === 'Medium' ? 'bg-md-warning text-md-on-warning' : 
                  'bg-md-primary text-md-on-primary'
                }`}>
                  {alert.urgency}
                </span>
                <span className="text-sm font-medium text-md-on-surface-variant">{alert.type}</span>
              </div>
              <h3 className="text-lg font-medium text-md-on-surface mb-1">{alert.title}</h3>
              <div className="flex flex-wrap gap-4 text-sm text-md-on-surface-variant">
                <span className="flex items-center"><Clock size={14} className="mr-1" /> {alert.timestamp}</span>
                <span>Recipient: {alert.recipient}</span>
              </div>
            </div>

            <div className="flex-shrink-0 w-full md:w-auto mt-4 md:mt-0">
              {alert.status === 'unacknowledged' ? (
                <MD3Button 
                  variant="outlined" 
                  onClick={() => handleAcknowledge(alert.id)}
                  className="w-full md:w-auto opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Acknowledge
                </MD3Button>
              ) : (
                <div className="flex items-center justify-center text-md-success px-4">
                  <CheckCircle2 size={20} className="mr-2" />
                  <span className="text-sm font-medium">Acknowledged</span>
                </div>
              )}
            </div>
          </MD3Card>
        )) : (
          <MD3Card elevation={0} className="border border-md-outline border-dashed text-center py-12">
            <CheckCircle2 size={48} className="mx-auto text-md-success/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active Alerts</h3>
            <p className="text-md-on-surface-variant">All systems are operating normally.</p>
          </MD3Card>
        )}
      </div>
    </div>
  );
};

export default AlertMonitoring;
