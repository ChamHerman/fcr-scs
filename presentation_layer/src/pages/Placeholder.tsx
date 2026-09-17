import React from 'react';
import { Wrench } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageHeader } from '../components/ui/PageHeader';

export const Placeholder: React.FC<{ title: string }> = ({ title }) => {
  useDocumentTitle(title);
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="This module is currently under construction."
      />
      <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 bg-md-surface-container rounded-2xl">
        <Wrench className="w-12 h-12 mb-4 text-md-primary" />
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p>Please check back later as this module is actively being developed.</p>
      </div>
    </div>
  );
};
