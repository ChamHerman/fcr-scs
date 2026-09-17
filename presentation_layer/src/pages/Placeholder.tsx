import React from 'react';
import { Wrench } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const Placeholder: React.FC<{ title: string }> = ({ title }) => {
  useDocumentTitle(title);
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
      <Wrench className="w-12 h-12 mb-4 text-md-primary" />
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p>This module is currently under construction. Please check back later.</p>
    </div>
  );
};
