import React from 'react';
import { CopyButton } from '../ui/CopyButton';

export interface CaseIdCellProps {
  caseId: string;
}

/**
 * Case ID cell shared by every payment/blockchain list: the ID is displayed as
 * plain text with a copy icon beside it — clicking anywhere on the row opens
 * the detail modal (row-level onClick).
 */
export const CaseIdCell: React.FC<CaseIdCellProps> = ({ caseId }) => (
  <span className="case-id-wrap">
    <span className="case-id">{caseId}</span>
    <CopyButton value={caseId} />
  </span>
);
