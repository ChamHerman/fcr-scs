import React, { useState } from 'react';
import { CalendarRange, Mail, Repeat } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export const ScheduleReportsGeneration: React.FC = () => {
  useDocumentTitle('Schedule Reports');
  const [template, setTemplate] = useState('Compensation summary');
  const [frequency, setFrequency] = useState('Weekly');
  const [email, setEmail] = useState('operations@agency.gov');

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <PageHeader
        title="Schedule Reports Generation"
        subtitle="Define automatic report delivery for your team and stakeholders."
      />

      <div className="bg-md-surface-container rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Delivery Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Report template"
            value={template}
            onChange={setTemplate}
            options={[
              { value: 'Compensation summary', label: 'Compensation summary' },
              { value: 'Valuation performance', label: 'Valuation performance' },
              { value: 'Executive overview', label: 'Executive overview' },
            ]}
          />
          <Select
            label="Frequency"
            value={frequency}
            onChange={setFrequency}
            options={[
              { value: 'Daily', label: 'Daily' },
              { value: 'Weekly', label: 'Weekly' },
              { value: 'Monthly', label: 'Monthly' },
            ]}
          />
          <div className="md:col-span-2">
            <Input
              label="Recipient email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-3.5 text-xs font-semibold bg-[#e6f4ea] text-[#1e7b4a]">
            <span className="w-2 h-2 rounded-full bg-[#1e7b4a]" />
            Validated
          </span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-md-on-surface-variant">
              <CalendarRange size={16} />
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <Button variant="filled">
              <Mail size={14} />
              Save Schedule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleReportsGeneration;
