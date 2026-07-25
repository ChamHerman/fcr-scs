import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { MemberLayout } from './components/layout/MemberLayout';

import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ContactUs } from './pages/ContactUs';

// Import Smart Contract & Blockchain Pages
import { BlockchainDashboard } from './pages/SmartContract/BlockchainDashboard';
import { PublishLedger } from './pages/SmartContract/PublishLedger';
import { VoidLedger } from './pages/SmartContract/VoidLedger';

// Import Admin Payment Pages
import PaymentDashboard from './pages/Payment/PaymentDashboard';
import InitiateTransfer from './pages/Payment/InitiateTransfer';
import PendingAuthorisations from './pages/Payment/PendingAuthorisations';
import FailedTransactions from './pages/Payment/FailedTransactions';

// Import Member Pages
import SubmitBankDetails from './pages/Member/SubmitBankDetails';
import MemberPaymentStatus from './pages/Member/MemberPaymentStatus';
import VerifyAuditTrail from './pages/Member/VerifyAuditTrail';
import { CaseManagementDashboard } from './pages/LandAcquisition/CaseDashboard';
import { CaseRegistration } from './pages/LandAcquisition/CaseRegistration';
import { CaseView } from './pages/LandAcquisition/CaseDetails';
import { CaseAssignment } from './pages/LandAcquisition/CaseAssignment';
import { ValuationReportGenerator } from './pages/LandAcquisition/ValuationReportGenerator';
import { ValuationReportReview } from './pages/LandAcquisition/ValuationReportReview';
import { ValuationReportList } from './pages/LandAcquisition/ValuationReportDashboard';
import { CompensationReportGenerator } from './pages/Compensation/CompensationReportGenerator';
import { CompensationApproval } from './pages/Compensation/CompensationReview';
import { CompensationReportList } from './pages/Compensation/CompensationReportList';
import { OfferLetterDashboard } from './pages/Compensation/OfferLetterDashboard';
import { OfferLetterDetail } from './pages/Compensation/OfferLetterReview';
import { ObjectionList } from './pages/Compensation/ObjectionDashboard';
import { CreateObjection } from './pages/Compensation/ObjectionCreation';
import { ObjectionReview } from './pages/Compensation/ObjectionReview';
import { CompensationComparisonCreate } from './pages/Compensation/ComparisonCreation';
import { CompensationComparisonList } from './pages/Compensation/ComparisonDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<ContactUs />} />
        </Route>
        <Route path="/login" element={<div>Login Page (Mock)</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized Access. You do not have permission to view this page.</div>} />
        {/* Case Management */}
        <Route path="case" element={<CaseManagementDashboard />} />
        <Route path="case/register" element={<CaseRegistration />} />
        <Route path="case/details" element={<CaseView />} />
        <Route path="case/assign" element={<CaseAssignment />} />
        <Route path="case/valuation/create" element={<ValuationReportGenerator />} />
        <Route path="case/valuation/review" element={<ValuationReportReview />} />
        <Route path="case/valuation" element={<ValuationReportList />} />

        {/* Compensation Management */}
        <Route path="compensation/report" element={<CompensationReportList />} />
        <Route path="compensation/report/create" element={<CompensationReportGenerator />} />
        <Route path="compensation/report/review" element={<CompensationApproval />} />
        <Route path="compensation/compare" element={<CompensationComparisonList />} />
        <Route path="compensation/compare/create" element={<CompensationComparisonCreate />} />
        <Route path="compensation/offer" element={<OfferLetterDashboard />} />
        <Route path="compensation/offer/review" element={<OfferLetterDetail />} />
        <Route path="compensation/objection" element={<ObjectionList />} />
        <Route path="compensation/objection/create" element={<CreateObjection />} />
        <Route path="compensation/objection/review" element={<ObjectionReview />} />


        {/* Admin Routes - Protected */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<CaseManagementDashboard />} />
            <Route path="land-acquisition" element={<CaseManagementDashboard />} />
            
            {/* Payment Routes */}
            <Route path="payments">
              <Route index element={<PaymentDashboard />} />
              <Route path="initiate" element={<InitiateTransfer />} />
              <Route path="authorisations" element={<PendingAuthorisations />} />
              <Route path="failed" element={<FailedTransactions />} />
            </Route>

            {/* Blockchain Routes */}
            <Route path="blockchain">
              <Route index element={<BlockchainDashboard />} />
              <Route path="publish" element={<PublishLedger />} />
              <Route path="void" element={<VoidLedger />} />
            </Route>
          </Route>
        </Route>

        {/* Member Routes - Protected */}
        <Route element={<ProtectedRoute allowedRoles={['member', 'admin']} />}>
          <Route path="/member" element={<MemberLayout />}>
            <Route index element={<div>Member Overview Placeholder</div>} />
            <Route path="bank-details" element={<SubmitBankDetails />} />
            <Route path="payment-status" element={<MemberPaymentStatus />} />
            <Route path="verify-audit" element={<VerifyAuditTrail />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
