import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { MemberLayout } from './components/layout/MemberLayout';
import { AdminIdentityProvider } from './context/AdminIdentityContext';

import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ContactUs } from './pages/ContactUs';
import { DesignSystem } from './pages/DesignSystem/DesignSystem';

import { Login } from './pages/Login/Login';
import { Register } from './pages/Login/Register';
import { ForgotPassword } from './pages/Login/ForgotPassword';

import { DashboardOverview } from './pages/Dashboard/DashboardOverview';
import { UserProfile } from './pages/Dashboard/UserProfile';
import { UserAdministration } from './pages/Dashboard/UserAdministration';

import { AuditLogs } from './pages/Audit/AuditLogs';
import { AlertMonitoring } from './pages/Audit/AlertMonitoring';
import { SystemReports } from './pages/Audit/SystemReports';
import PaymentSubmitBankDetails from './pages/Payment/SubmitBankDetails';
import TrackPaymentStatus from './pages/Payment/TrackPaymentStatus';

// Import Smart Contract & Blockchain Pages
import { BlockchainDashboard } from './pages/SmartContract/BlockchainDashboard';
import { PublishLedger } from './pages/SmartContract/PublishLedger';
import { VoidLedger } from './pages/SmartContract/VoidLedger';
import SmartContractVerifyAuditTrail from './pages/SmartContract/VerifyAuditTrail';

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
import { CaseEdit } from './pages/LandAcquisition/CaseEdit';
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
import { Placeholder } from './pages/Placeholder';
import { ProcessAIValuation } from './pages/PredictionDashboard/ProcessAIValuation';
import { ReviewAIValuation } from './pages/PredictionDashboard/ReviewAIValuation';
import { RetrainAIModel } from './pages/PredictionDashboard/RetrainAIModel';
import { ViewValuationResults } from './pages/PredictionDashboard/ViewValuationResults';
import { PredictionDashboard } from './pages/PredictionDashboard/PredictionDashboard';
import { ViewValuationHistory } from './pages/PredictionDashboard/ViewValuationHistory';
import { GenerateReports } from './pages/Reports/GenerateReports';
import { ViewReports } from './pages/Reports/ViewReports';
import { ScheduleReportsGeneration } from './pages/Reports/ScheduleReportsGeneration';
import { ReportsDashboard } from './pages/Reports/ReportsDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/design-system" element={<DesignSystem />} />
          <Route path="/submit-bank-details" element={<PaymentSubmitBankDetails />} />
          <Route path="/verify-audit-trail" element={<SmartContractVerifyAuditTrail />} />
          <Route path="/track-payment" element={<TrackPaymentStatus />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/unauthorized" element={<div>Unauthorized Access. You do not have permission to view this page.</div>} />
        {/* Admin Routes - Protected */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminIdentityProvider><AdminLayout /></AdminIdentityProvider>}>
            <Route index element={<DashboardOverview />} />
            <Route path="land-acquisition" element={<CaseManagementDashboard />} />

            {/* Case Management */}
            <Route path="case" element={<CaseManagementDashboard />} />
            <Route path="case/register" element={<CaseRegistration />} />
            <Route path="case/edit" element={<CaseEdit />} />
            <Route path="case/:caseId/edit" element={<CaseEdit />} />
            <Route path="case/details" element={<CaseView />} />
            <Route path="case/details/:caseId" element={<CaseView />} />
            <Route path="case/assign" element={<CaseAssignment />} />
            <Route path="case/valuation" element={<ValuationReportList />} />
            <Route path="case/valuation/create" element={<ValuationReportGenerator />} />
            <Route path="case/valuation/review" element={<ValuationReportReview />} />

            {/* Compensation Management */}
            <Route path="compensation" element={<CompensationReportList />} />
            <Route path="compensation/report" element={<CompensationReportList />} />
            <Route path="compensation/report/create" element={<CompensationReportGenerator />} />
            <Route path="compensation/generator" element={<CompensationReportGenerator />} />
            <Route path="compensation/report/review" element={<CompensationApproval />} />
            <Route path="compensation/review" element={<CompensationApproval />} />
            <Route path="compensation/compare" element={<CompensationComparisonList />} />
            <Route path="compensation/compare/create" element={<CompensationComparisonCreate />} />
            <Route path="compensation/offer" element={<OfferLetterDashboard />} />
            <Route path="compensation/offer/review" element={<OfferLetterDetail />} />
            <Route path="compensation/objection" element={<ObjectionList />} />
            <Route path="compensation/objection/create" element={<CreateObjection />} />
            <Route path="compensation/objection/review" element={<ObjectionReview />} />
            <Route path="compensation/objection/review/:objectionId" element={<ObjectionReview />} />


            {/* Dashboard & User Management */}
            <Route path="profile" element={<UserProfile />} />
            <Route path="users" element={<UserAdministration />} />

            {/* System Audit & Monitoring */}
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="alerts" element={<AlertMonitoring />} />
            <Route path="reports" element={<SystemReports />} />

            {/* Placeholder Admin Routes */}
            <Route path="valuers" element={<Placeholder title="Valuers Management" />} />
            <Route path="forms" element={<Placeholder title="Forms & Templates" />} />
            <Route path="reports" element={<ReportsDashboard />} />
            <Route path="reports/generate" element={<GenerateReports />} />
            <Route path="reports/view/:reportId" element={<ViewReports />} />
            <Route path="reports/schedule" element={<ScheduleReportsGeneration />} />
            <Route path="prediction" element={<PredictionDashboard />} />
            <Route path="prediction/process" element={<ProcessAIValuation />} />
            <Route path="prediction/review" element={<ReviewAIValuation />} />
            <Route path="prediction/retrain" element={<RetrainAIModel />} />
            <Route path="prediction/results" element={<ViewValuationResults />} />
            <Route path="prediction/history" element={<ViewValuationHistory />} />
            <Route path="prediction/history" element={<ViewValuationHistory />} />
            <Route path="settings" element={<Placeholder title="System Settings" />} />

            {/* Payment Routes */}
            <Route path="payment">
              <Route index element={<PaymentDashboard />} />
              <Route path="initiate" element={<InitiateTransfer />} />
              <Route path="pending" element={<PendingAuthorisations />} />
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
