import React, { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * The bank details submission form migrated into the member payment-status
 * page (rendered inline while the workflow sits at step 2). This legacy route
 * now forwards to it, preserving any ?caseId= target.
 */
export default function MemberSubmitBankDetails() {
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('caseId');

  useEffect(() => {
    // Nothing to retain — the form lives on /member/payment-status now.
  }, []);

  return <Navigate to={caseId ? `/member/payment-status?caseId=${encodeURIComponent(caseId)}` : '/member/payment-status'} replace />;
}
