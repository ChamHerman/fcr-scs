import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { MemberLayout } from './components/layout/MemberLayout';
import { AdminIdentityProvider } from './context/AdminIdentityContext';
import { WalletGate } from './components/admin/WalletGate';

import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ContactUs } from './pages/ContactUs';
import { DesignSystem } from './pages/DesignSystem/DesignSystem';

import { Login } from './pages/Login/Login';
import { Register } from './pages/Login/Register';
import { ForgotPassword } from './pages/Login/ForgotPassword';
import { ResetPassword } from './pages/Login/ResetPassword';
import { AccountActivation } from './pages/Login/AccountActivation';
import { Unauthorized } from './pages/Login/Unauthorized';

import { DashboardOverview } from './pages/Dashboard/DashboardOverview';
import { UserProfile } from './pages/Dashboard/UserProfile';
import { UserAdministration } from './pages/Dashboard/UserAdministration';
import { RoleManagement } from './pages/Dashboard/RoleManagement';

import { AuditLogs } from './pages/Audit/AuditLogs';
import { AlertMonitoring } from './pages/Audit/AlertMonitoring';
import { SystemReports } from './pages/Audit/SystemReports';
import PaymentSubmitBankDetails from './pages/Payment/SubmitBankDetails';
import TrackPaymentStatus from './pages/Payment/TrackPaymentStatus';
import BankPortal from './pages/Bank/BankPortal';

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
import { MemberDashboard } from './pages/Member/MemberDashboard';
import { MemberOfferLetter } from './pages/Member/MemberOfferLetter';
import SubmitBankDetails from './pages/Member/SubmitBankDetails';
import MemberPaymentStatus from './pages/Member/MemberPaymentStatus';
import VerifyAuditTrail from './pages/Member/VerifyAuditTrail';
import { MemberSettings } from './pages/Member/MemberSettings';
import { CaseManagementDashboard } from './pages/LandAcquisition/CaseDashboard';
import { CaseCreate } from './pages/LandAcquisition/CaseCreate';
import { CaseEdit } from './pages/LandAcquisition/CaseEdit';
import { CaseView } from './pages/LandAcquisition/CaseDetails';
import { CaseAssignment } from './pages/LandAcquisition/CaseAssignment';
import { ValuationCreate } from './pages/LandAcquisition/ValuationCreate';
import { ValuationReview } from './pages/LandAcquisition/ValuationReview';
import { ValuationDashboard } from './pages/LandAcquisition/ValuationDashboard';
import { CompensationCreate } from './pages/Compensation/CompensationCreate';
import { CompensationApproval } from './pages/Compensation/CompensationReview';
import { CompensationDashboard } from './pages/Compensation/CompensationDashboard';
import { OfferDashboard } from './pages/Compensation/OfferDashboard';
import { OfferLetterDetail } from './pages/Compensation/OfferLetterReview';
import { ObjectionList } from './pages/Compensation/ObjectionDashboard';
import { ObjectionCreate } from './pages/Compensation/ObjectionCreate';
import { ObjectionReview } from './pages/Compensation/ObjectionReview';
import { Placeholder } from './pages/Placeholder';
import { RetrainAIModel } from './pages/PredictionDashboard/RetrainAIModel';
import { GenerateAIValuation } from './pages/PredictionDashboard/GenerateAIValuation';
import { GenerateReports } from './pages/Reports/GenerateReports';
import { ViewReports } from './pages/Reports/ViewReports';
import { ScheduleReportsGeneration } from './pages/Reports/ScheduleReportsGeneration';
import { ReportsDashboard } from './pages/Reports/ReportsDashboard';
import { SettingsPage } from './pages/Settings/SettingsPage';

function App() {
  return (
    <AuthProvider>
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
            <Route path="/bank-portal" element={<BankPortal />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/activate" element={<AccountActivation />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          {/* Admin Routes - Protected */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminIdentityProvider><AdminLayout /></AdminIdentityProvider>}>
              <Route index element={<DashboardOverview />} />
              <Route path="land-acquisition" element={<CaseManagementDashboard />} />

              {/* Case Management */}
              <Route path="case" element={<CaseManagementDashboard />} />
              <Route path="case/register" element={<CaseCreate />} />
              <Route path="case/edit" element={<CaseEdit />} />
              <Route path="case/:caseId/edit" element={<CaseEdit />} />
              <Route path="case/details" element={<CaseView />} />
              <Route path="case/details/:caseId" element={<CaseView />} />
              <Route path="case/assign" element={<CaseAssignment />} />
              <Route path="case/valuation" element={<ValuationDashboard />} />
              <Route path="case/valuation/create" element={<ValuationCreate />} />
              <Route path="case/valuation/review" element={<ValuationReview />} />

              {/* Compensation Management */}
              <Route path="compensation" element={<CompensationDashboard />} />
              <Route path="compensation/report" element={<CompensationDashboard />} />
              <Route path="compensation/report/create" element={<CompensationCreate />} />
              <Route path="compensation/generator" element={<CompensationCreate />} />
              <Route path="compensation/report/review" element={<CompensationApproval />} />
              <Route path="compensation/review" element={<CompensationApproval />} />
              <Route path="compensation/offer" element={<OfferDashboard />} />
              <Route path="compensation/offer/review" element={<OfferLetterDetail />} />
              <Route path="compensation/objection" element={<ObjectionList />} />
              <Route path="compensation/objection/create" element={<ObjectionCreate />} />
              <Route path="compensation/objection/review" element={<ObjectionReview />} />
              <Route path="compensation/objection/review/:objectionId" element={<ObjectionReview />} />


              {/* Dashboard & User Management */}
              <Route path="profile" element={<UserProfile />} />
              <Route path="users" element={<UserAdministration />} />
              <Route path="role-management" element={<RoleManagement />} />

              {/* System Audit & Monitoring */}
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="alerts" element={<AlertMonitoring />} />
              <Route path="system-reports" element={<SystemReports />} />

              {/* Placeholder Admin Routes */}
              <Route path="valuers" element={<Placeholder title="Valuers Management" />} />
              <Route path="forms" element={<Placeholder title="Forms & Templates" />} />
              
              {/* Reporting Routes */}
              <Route path="reports" element={<ReportsDashboard />} />
              <Route path="reports/case-status" element={<ReportsDashboard reportCategory="Case Status" />} />
              <Route path="reports/payment" element={<ReportsDashboard reportCategory="Payment" />} />
              <Route path="reports/blockchain-audit" element={<ReportsDashboard reportCategory="Blockchain Audit" />} />
              <Route path="reports/generate" element={<GenerateReports />} />
              <Route path="reports/view/:reportId" element={<ViewReports />} />
              <Route path="reports/schedule" element={<ScheduleReportsGeneration />} />
              <Route path="prediction" element={<GenerateAIValuation />} />
              <Route path="prediction/retrain" element={<RetrainAIModel />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* Payment Routes */}
              <Route path="payment">
                <Route index element={<PaymentDashboard />} />
                <Route path="initiate" element={<InitiateTransfer />} />
                <Route path="pending" element={<PendingAuthorisations />} />
                <Route path="failed" element={<FailedTransactions />} />
              </Route>

              {/* Blockchain Routes — gated on the authorised admin wallet being connected in MetaMask */}
              <Route path="blockchain">
                <Route index element={<WalletGate><BlockchainDashboard /></WalletGate>} />
                <Route path="publish" element={<WalletGate><PublishLedger /></WalletGate>} />
                <Route path="void" element={<WalletGate><VoidLedger /></WalletGate>} />
              </Route>
            </Route>
          </Route>

          {/* Member Routes - Protected */}
          <Route element={<ProtectedRoute allowedRoles={['member', 'admin']} />}>
            <Route path="/member" element={<MemberLayout />}>
              <Route index element={<MemberDashboard />} />
              <Route path="offer-letter" element={<MemberOfferLetter />} />
              <Route path="offer-letter/:offerId" element={<MemberOfferLetter />} />
              <Route path="bank-details" element={<SubmitBankDetails />} />
              <Route path="payment-status" element={<MemberPaymentStatus />} />
              <Route path="verify-audit" element={<VerifyAuditTrail />} />
              <Route path="settings" element={<MemberSettings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
