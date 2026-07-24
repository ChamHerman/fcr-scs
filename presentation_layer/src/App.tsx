import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { MemberLayout } from './components/layout/MemberLayout';

import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ContactUs } from './pages/ContactUs';

// Mock components for existing pages
import { CaseManagement } from './pages/LandAcquisition/MainPage';

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

        {/* Admin Routes - Protected */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<CaseManagement />} />
            <Route path="land-acquisition" element={<CaseManagement />} />
            
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
