import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ContactUs } from './pages/ContactUs';
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
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="contact" element={<ContactUs />} />

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
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
