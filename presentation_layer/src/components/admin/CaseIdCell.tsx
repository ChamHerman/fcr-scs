import React from 'react';
import { CopyButton } from '../ui/CopyButton';

export interface CaseIdCellProps {
  caseId: string;
  onClick?: (caseId: string) => void;
}

/**
 * Case ID cell shared by every payment/blockchain list: when an onClick handler
 * is supplied, clicking the ID opens the case details modal without bubbling
 * to the row click.
 */
export const CaseIdCell: React.FC<CaseIdCellProps> = ({ caseId, onClick }) => (
  <span className="case-id-wrap">
    {onClick ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(caseId);
        }}
        className="case-id text-xs font-bold font-mono text-md-primary hover:underline cursor-pointer bg-transparent border-none p-0 inline-flex items-center text-left"
        title="View Case Details"
      >
        {caseId}
      </button>
    ) : (
      <span className="case-id text-xs font-bold font-mono">{caseId}</span>
    )}
    <CopyButton value={caseId} />
  </span>
);
