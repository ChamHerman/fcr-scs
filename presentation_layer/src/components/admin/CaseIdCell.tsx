import React from 'react';
import { CopyButton } from '../ui/CopyButton';

export interface CaseIdCellProps {
  caseId: string;
  /** Opens the row's detail modal directly. */
  onView: () => void;
}

/**
 * Case ID cell shared by every payment/blockchain list (DESIGN.md — Case ID
 * cells are clickable and copyable): clicking the ID opens the detail modal,
 * and a copy icon sits beside it.
 */
export const CaseIdCell: React.FC<CaseIdCellProps> = ({ caseId, onView }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView();
    }
  };

  return (
    <span className="case-id-wrap">
      <span
        className="case-id"
        role="button"
        tabIndex={0}
        onClick={onView}
        onKeyDown={handleKeyDown}
      >
        {caseId}
      </span>
      <CopyButton value={caseId} />
    </span>
  );
};
