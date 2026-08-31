import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  Eye, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Layers, 
  ExternalLink,
  HelpCircle,
  Sparkles,
  Smartphone,
  Tablet,
  Monitor,
  X,
  FileCheck2,
  ArrowRight,
  Printer,
  ChevronDown,
  ChevronUp,
  Landmark,
  UserCheck,
  Bell,
  Share2,
  Check,
  AlertTriangle,
  Info,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface WorkflowStep {
  id: number;
  title: string;
  subtitle: string;
  date: string;
  status: 'completed' | 'current' | 'upcoming';
  description: string;
  badgeText: string;
  actionText?: string;
  details?: { label: string; value: string }[];
}

export const MemberDashboard: React.FC = () => {
  // Device Preview Simulation Mode ('responsive' | 'pc' | 'tablet' | 'mobile')
  const [deviceMode, setDeviceMode] = useState<'responsive' | 'pc' | 'tablet' | 'mobile'>('responsive');
  
  // State for Offer Letter Modal
  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'doc' | 'breakdown' | 'legal'>('doc');
  
  // Accordion state for mobile/tablet workflow steps
  const [expandedStep, setExpandedStep] = useState<number | null>(3); // Step 3 expanded by default
  
  // Active Tab for details
  const [activeTab, setActiveTab] = useState<'workflow' | 'offer' | 'documents' | 'officer'>('workflow');

  // Case Mock Data
  const caseData = {
    caseNo: 'CAS-2024-0089',
    gazetteNo: 'W.P. No. 4482/2024',
    project: 'MRT3 Circle Line - Sentul West Station Link',
    lotNumber: 'Lot 452, Seksyen 88A',
    mukim: 'Mukim Batu',
    district: 'Daerah Kuala Lumpur',
    state: 'Wilayah Persekutuan Kuala Lumpur',
    landArea: '4,850 sq.ft (450.5 sqm)',
    landUse: 'Residential (Single-Storey Terrace)',
    titleNo: 'GRN 58291',
    claimantName: 'Ahmad bin Abdullah & Siti Aminah binti Razak',
    claimantNric: '720514-14-5321 / 750820-14-5890',
    shareRatio: '100% Joint Tenancy',
    caseStatus: 'Offer Issued (Form G/H)',
    offerStatusBadge: 'Action Required',
    totalCompensation: 685400.0,
    offerIssueDate: '24 Aug 2024',
    offerExpiryDate: '07 Sep 2024 (14 Days Validity)',
    daysRemaining: 7,
    assignedOfficer: {
      name: 'Puan Norhazlin binti Ismail',
      designation: 'Senior Land Administrator (Enquiry Officer)',
      department: 'Department of Lands and Mines WP Kuala Lumpur (JKPTG)',
      phone: '+603-2610 3300 (Ext. 412)',
      email: 'norhazlin.ismail@jkptg.gov.my',
      office: 'Tingkat 2, Wisma Tanah, Jalan Tuanku Abdul Halim, 50574 Kuala Lumpur',
      officeHours: 'Mon - Fri: 8:30 AM - 4:30 PM'
    }
  };

  // Workflow Stages
  const workflowSteps: WorkflowStep[] = [
    {
      id: 1,
      title: 'Notice of Acquisition (Sec. 4 & 8)',
      subtitle: 'Gazette Declaration & Land Freezing',
      date: '15 Jan 2024',
      status: 'completed',
      badgeText: 'Completed',
      description: 'Official declaration published under Section 8 of the Land Acquisition Act 1960. Public inquiry notice Form E served to registered owners.',
      details: [
        { label: 'Gazette No.', value: 'W.P. Gaz. 4482/2024' },
        { label: 'Gazette Date', value: '15 Jan 2024' },
        { label: 'Form E Served', value: '28 Jan 2024' }
      ]
    },
    {
      id: 2,
      title: 'Joint Site Inspection & Valuation',
      subtitle: 'JPPH Assessment of Land & Property',
      date: '12 Apr 2024',
      status: 'completed',
      badgeText: 'Completed',
      description: 'Physical valuation conducted on-site by JPPH and registered private valuers to determine statutory market value and damages.',
      details: [
        { label: 'Valuation Dept', value: 'JPPH Kuala Lumpur' },
        { label: 'Inspection Date', value: '12 Apr 2024' },
        { label: 'Report Ref', value: 'JPPH/KL/V/2024/0912' }
      ]
    },
    {
      id: 3,
      title: 'Offer Letter Issuance (Form G/H)',
      subtitle: 'Compensation Award Package Ready',
      date: '24 Aug 2024',
      status: 'current',
      badgeText: 'Action Required',
      actionText: 'Review Form G',
      description: 'Official Notice of Award (Form G) has been served. Claimant has 14 calendar days to review, accept, or appeal the compensation amount.',
      details: [
        { label: 'Award Ref', value: 'PTG/KL/ACQ/2024/G-089' },
        { label: 'Total Award', value: 'RM 685,400.00' },
        { label: 'Deadline', value: '07 Sep 2024 (7 days left)' }
      ]
    },
    {
      id: 4,
      title: 'Claimant Response & Decision',
      subtitle: 'Award Acceptance or Form N Objection',
      date: 'Pending Response',
      status: 'upcoming',
      badgeText: 'Upcoming',
      description: 'Submit signed Form G acceptance alongside verified bank payout details OR file a Form N appeal within 6 weeks for High Court reassessment.',
      details: [
        { label: 'Accept Option', value: 'Direct electronic payout' },
        { label: 'Dispute Option', value: 'Form N to High Court with 2 Assessors' }
      ]
    },
    {
      id: 5,
      title: 'Electronic Payment & Settlement',
      subtitle: 'Smart Contract & Multi-Sig Payout',
      date: 'Est. Sep 2024',
      status: 'upcoming',
      badgeText: 'Upcoming',
      description: 'Compensation transferred directly to verified bank account with blockchain-backed cryptographic audit trail receipt.',
      details: [
        { label: 'Disbursement', value: 'Direct Bank Transfer / GIRO' },
        { label: 'Ledger Audit', value: 'Smart Contract Verified' }
      ]
    },
    {
      id: 6,
      title: 'Vacant Possession & Relocation',
      subtitle: 'Property Handover & Support Desk',
      date: 'Est. Oct - Nov 2024',
      status: 'upcoming',
      badgeText: 'Final Step',
      description: 'Handover of keys and physical vacant possession. MRT Corp community desk provides moving and utility transfer assistance.',
      details: [
        { label: 'Grace Period', value: '30 - 60 Days Post-Payout' },
        { label: 'Assistance', value: 'Relocation & Moving Support Team' }
      ]
    }
  ];

  // Compensation Breakdown Items
  const compensationItems = [
    { item: 'Land Market Value (4,850 sq.ft @ RM 98/sq.ft)', amount: 475300.0, category: 'Land Asset', percent: '69.3%' },
    { item: 'Single-Storey Residential Structure & Fixtures', amount: 135000.0, category: 'Structure', percent: '19.7%' },
    { item: 'Perimeter Wall, Covered Porch & Driveway', amount: 22500.0, category: 'Improvements', percent: '3.3%' },
    { item: 'Injurious Affection & Severance Statutory Loss', amount: 18600.0, category: 'Statutory', percent: '2.7%' },
    { item: 'Disturbance Allowance & Relocation Transport', amount: 20000.0, category: 'Relocation', percent: '2.9%' },
    { item: 'Statutory Valuation & Legal Reimbursement', amount: 14000.0, category: 'Fees', percent: '2.1%' }
  ];

  // Document Checklist Mock
  const documentChecklist = [
    { title: 'Original Land Title Grant (GRN 58291)', status: 'Verified', date: '10 Feb 2024', badge: 'bg-emerald-100 text-emerald-800' },
    { title: 'Copy of MyKad / Identification (Both Owners)', status: 'Verified', date: '10 Feb 2024', badge: 'bg-emerald-100 text-emerald-800' },
    { title: 'Official Form E (Notice of Enquiry Attendance)', status: 'Submitted', date: '15 Mar 2024', badge: 'bg-emerald-100 text-emerald-800' },
    { title: 'Form G (Award of Compensation Acceptance)', status: 'Action Needed', date: 'Pending Signature', badge: 'bg-amber-100 text-amber-800' },
    { title: 'Bank Account Confirmation / Statement', status: 'Required', date: 'Needed for Payout', badge: 'bg-blue-100 text-blue-800' }
  ];

  // Format Currency
  const formatRM = (val: number) => {
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-16 font-sans antialiased">
      {/* ------------------------------------------------------------- */}
      {/* TOP BREAKPOINT SIMULATOR BAR (FOR EASY REVIEWING ACROSS DEVICES) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 text-slate-100 px-3 py-2 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="p-1 bg-violet-600 rounded text-white inline-flex">
              <Sparkles className="w-3 h-3" />
            </span>
            <span className="font-semibold text-slate-200">Displaced Member Portal</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setDeviceMode('responsive')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                deviceMode === 'responsive' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Auto
            </button>
            <button
              onClick={() => setDeviceMode('pc')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                deviceMode === 'pc' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span className="hidden sm:inline">PC</span>
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                deviceMode === 'tablet' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tablet className="w-3 h-3" />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                deviceMode === 'mobile' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Mobile Phone</span>
            </button>
          </div>
        </div>
      </div>

      {/* Frame wrapper for Device Switcher simulation */}
      <div className={`transition-all duration-300 mx-auto ${
        deviceMode === 'pc' ? 'max-w-6xl mt-4 border border-slate-300 rounded-3xl shadow-2xl bg-white overflow-hidden p-6' :
        deviceMode === 'tablet' ? 'max-w-2xl mt-4 border-4 border-slate-700 rounded-3xl shadow-2xl bg-white overflow-hidden p-4' :
        deviceMode === 'mobile' ? 'max-w-sm mt-4 border-[6px] border-slate-800 rounded-[44px] shadow-2xl bg-slate-50 overflow-hidden p-3.5' :
        'max-w-7xl px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6'
      }`}>

        {/* ------------------------------------------------------------- */}
        {/* MOBILE TOP BAR (App-like header for mobile view) */}
        {/* ------------------------------------------------------------- */}
        <div className="flex items-center justify-between py-2 px-1 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-violet-200">
              AB
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium leading-none">Affected Landowner</div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate max-w-[170px] sm:max-w-none">
                {caseData.claimantName.split('&')[0].trim()}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <Check className="w-3 h-3" /> Verified Owner
            </span>
            <button
              onClick={() => setActiveTab('officer')}
              className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 relative shadow-sm"
              title="Notifications / Contact"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MOBILE HERO CARD - REDESIGNED FOR IMPACT & TOUCH ACCESSIBILITY */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-gradient-to-br from-violet-950 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden mb-4 border border-violet-800/40">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-violet-500/25 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-44 h-44 bg-indigo-500/25 rounded-full blur-2xl pointer-events-none" />

          {/* Lot & Case Header */}
          <div className="relative z-10 flex items-start justify-between gap-2 mb-3">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/30 text-violet-200 border border-violet-400/30 uppercase tracking-wider">
                {caseData.caseNo}
              </span>
              <h1 className="text-base sm:text-xl font-extrabold text-white mt-1.5 tracking-tight">
                {caseData.lotNumber}
              </h1>
              <p className="text-slate-300 text-xs flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-violet-400 shrink-0" />
                <span>{caseData.mukim}, {caseData.state}</span>
              </p>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0 animate-pulse">
              <Clock className="w-3 h-3" />
              {caseData.daysRemaining} Days Left
            </span>
          </div>

          {/* Total Compensation Display */}
          <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 my-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-violet-200">
                Awarded Compensation (Form G)
              </span>
              <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full">
                JPPH Approved
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 tracking-tight">
              {formatRM(caseData.totalCompensation)}
            </div>
            <p className="text-[10px] text-slate-300 mt-1 flex items-center justify-between">
              <span>{caseData.landArea} • {caseData.landUse}</span>
              <span className="text-violet-200 font-medium">Stage 3 of 6</span>
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="relative z-10 grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                setModalTab('doc');
                setShowOfferModal(true);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-violet-900/50 flex items-center justify-center gap-1.5 transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Offer Letter</span>
            </button>

            <Link
              to="/member/bank-details"
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all text-center"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Accept & Payout</span>
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MOBILE QUICK ACTION ICONS ROW (4-PILL SHORTCUTS) */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button
            onClick={() => {
              setModalTab('doc');
              setShowOfferModal(true);
            }}
            className="flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm active:bg-violet-50 hover:border-violet-300 transition text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-1">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-800">Form G</span>
            <span className="text-[9px] text-slate-400">Offer Letter</span>
          </button>

          <Link
            to="/member/bank-details"
            className="flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm active:bg-violet-50 hover:border-violet-300 transition text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
              <Landmark className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-800">Bank Setup</span>
            <span className="text-[9px] text-slate-400">Direct Payout</span>
          </Link>

          <button
            onClick={() => setActiveTab('offer')}
            className="flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm active:bg-violet-50 hover:border-violet-300 transition text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-1">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-800">Breakdown</span>
            <span className="text-[9px] text-slate-400">Valuation</span>
          </button>

          <button
            onClick={() => setActiveTab('officer')}
            className="flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm active:bg-violet-50 hover:border-violet-300 transition text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-1">
              <Phone className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-800">Officer</span>
            <span className="text-[9px] text-slate-400">Direct Line</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* HORIZONTAL MILESTONE MINI-BAR (MOBILE AT-A-GLANCE STATUS) */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm mb-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-2">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-violet-600" />
              Acquisition Progress
            </span>
            <span className="text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full text-[10px]">
              Stage 3 of 6 (50%)
            </span>
          </div>

          {/* 6 Step Segmented Bar */}
          <div className="grid grid-cols-6 gap-1 mb-2">
            <div className="h-2 rounded-full bg-emerald-500" title="1. Notice of Acquisition (Done)" />
            <div className="h-2 rounded-full bg-emerald-500" title="2. Site Valuation (Done)" />
            <div className="h-2 rounded-full bg-violet-600 animate-pulse" title="3. Offer Letter (Active)" />
            <div className="h-2 rounded-full bg-slate-200" title="4. Decision" />
            <div className="h-2 rounded-full bg-slate-200" title="5. Payment" />
            <div className="h-2 rounded-full bg-slate-200" title="6. Handover" />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span className="text-emerald-700 font-semibold">1. Notice & Valuation ✓</span>
            <span className="text-violet-700 font-bold">3. Form G Offer ⚡</span>
            <span>6. Handover ⏳</span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECTION TABS (MOBILE OPTIMIZED PILL SELECTOR) */}
        {/* ------------------------------------------------------------- */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl mb-4 text-xs font-semibold overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'workflow'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Workflow</span>
          </button>

          <button
            onClick={() => setActiveTab('offer')}
            className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'offer'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Valuation</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'documents'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Forms</span>
          </button>

          <button
            onClick={() => setActiveTab('officer')}
            className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'officer'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Officer</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: WORKFLOW TIMELINE (MOBILE CARDS ACCORDION) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'workflow' && (
          <div className="space-y-3">
            {workflowSteps.map((step) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current';
              const isExpanded = expandedStep === step.id;

              return (
                <div
                  key={step.id}
                  className={`rounded-2xl transition-all border overflow-hidden ${
                    isCurrent
                      ? 'bg-violet-50/70 border-violet-400 shadow-md ring-2 ring-violet-200'
                      : isCompleted
                      ? 'bg-white border-slate-200 shadow-sm'
                      : 'bg-white/80 border-slate-200 opacity-85'
                  }`}
                >
                  {/* Step Header Tap Target */}
                  <div
                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                    className="p-3.5 flex items-start gap-3 cursor-pointer select-none active:bg-slate-50"
                  >
                    {/* Circle Badge */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isCurrent
                          ? 'bg-violet-600 text-white shadow-sm ring-4 ring-violet-200 animate-pulse'
                          : 'bg-slate-200 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                    </div>

                    {/* Step Titles */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isCurrent
                              ? 'bg-violet-200 text-violet-900 font-extrabold'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {step.badgeText}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {step.date}
                        </span>
                      </div>

                      <h3 className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-violet-950' : 'text-slate-900'}`}>
                        {step.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate">{step.subtitle}</p>
                    </div>

                    {/* Accordion Chevron */}
                    <div className="text-slate-400 p-1 shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded Step Body */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-600 border-t border-slate-200/70 space-y-2.5">
                      <p className="text-[11px] leading-relaxed pt-1">{step.description}</p>

                      {step.details && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 grid grid-cols-1 gap-1.5">
                          {step.details.map((d, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-400 font-medium">{d.label}:</span>
                              <span className="font-bold text-slate-800">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Current Actionable Buttons */}
                      {isCurrent && (
                        <div className="flex flex-col gap-2 pt-1">
                          <button
                            onClick={() => {
                              setModalTab('doc');
                              setShowOfferModal(true);
                            }}
                            className="w-full py-2.5 px-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview Official Form G Letter</span>
                          </button>
                          <Link
                            to="/member/bank-details"
                            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-center transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Submit Bank Account For Payout</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: COMPENSATION BREAKDOWN (MOBILE TACTILE CARDS) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'offer' && (
          <div className="space-y-3">
            {/* Total Award Pill */}
            <div className="bg-emerald-950 text-white rounded-2xl p-4 border border-emerald-700 shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Total Statutory Award
                  </span>
                  <div className="text-2xl font-black text-emerald-300 mt-0.5">
                    {formatRM(caseData.totalCompensation)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setModalTab('breakdown');
                    setShowOfferModal(true);
                  }}
                  className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 shadow"
                >
                  <Eye className="w-3 h-3" />
                  <span>Full Letter</span>
                </button>
              </div>
              <p className="text-[10px] text-emerald-200/80 mt-1">
                Assessed under Land Acquisition Act 1960 [First Schedule].
              </p>
            </div>

            {/* Itemized Cards */}
            <div className="space-y-2">
              {compensationItems.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {item.item}
                    </span>
                    <span className="text-xs font-black text-emerald-700 shrink-0">
                      {formatRM(item.amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      {item.category}
                    </span>
                    <span className="font-semibold text-slate-500">
                      {item.percent} of total
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Accept Callout */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Accept Compensation Award</h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Direct payout into your registered bank account within 14 working days.
                  </p>
                </div>
              </div>
              <Link
                to="/member/bank-details"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm text-center"
              >
                <span>Proceed to Accept & Add Bank</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: DOCUMENTS CHECKLIST */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'documents' && (
          <div className="space-y-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 mb-0.5">Case Documents & Forms</h3>
              <p className="text-[11px] text-slate-500 mb-3">Statutory filings and verification status.</p>

              <div className="space-y-2">
                {documentChecklist.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-600 shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-semibold text-slate-800 truncate">{doc.title}</h4>
                        <p className="text-[10px] text-slate-400">{doc.date}</p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${doc.badge}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: OFFICER & DIRECT ASSISTANCE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'officer' && (
          <div className="space-y-3">
            {/* Officer Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-base font-extrabold flex items-center justify-center shadow-md">
                  NI
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{caseData.assignedOfficer.name}</h3>
                  <p className="text-[11px] text-violet-700 font-semibold">{caseData.assignedOfficer.designation}</p>
                  <p className="text-[10px] text-slate-500">JKPTG Kuala Lumpur</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <a
                  href={`tel:${caseData.assignedOfficer.phone.replace(/[^0-9+]/g, '')}`}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-violet-50 rounded-xl text-slate-700 border border-slate-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-violet-600" />
                    <span>{caseData.assignedOfficer.phone}</span>
                  </div>
                  <span className="text-[10px] font-bold text-violet-600">Call Now</span>
                </a>

                <a
                  href={`mailto:${caseData.assignedOfficer.email}`}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-violet-50 rounded-xl text-slate-700 border border-slate-200 transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <span className="truncate">{caseData.assignedOfficer.email}</span>
                  </div>
                  <span className="text-[10px] font-bold text-violet-600 shrink-0">Email</span>
                </a>
              </div>
            </div>

            {/* Rights Card */}
            <div className="bg-violet-50 p-4 rounded-2xl border border-violet-200 text-xs text-violet-950 space-y-2">
              <h4 className="font-bold flex items-center gap-1.5 text-violet-900">
                <ShieldCheck className="w-4 h-4 text-violet-600" />
                Proprietor Rights & Form N Inquiries
              </h4>
              <p className="text-[11px] text-violet-800 leading-relaxed">
                You are protected under Section 37 of the Land Acquisition Act 1960. You may appeal the award valuation within 6 weeks or request free legal counsel.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 hover:underline pt-1"
              >
                <span>Speak with Legal Aid Advisor</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MOBILE STICKY FLOATING ACTION BAR (THUMB CONVENIENCE) */}
        {/* ------------------------------------------------------------- */}
        <div className="fixed bottom-14 md:hidden left-3 right-3 z-30 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md text-white rounded-2xl p-2.5 px-3.5 shadow-2xl border border-slate-700 flex items-center justify-between gap-3">
            <div>
              <span className="text-[9px] text-violet-300 font-bold uppercase tracking-wider block">Award Total</span>
              <span className="text-sm font-extrabold text-emerald-400">{formatRM(caseData.totalCompensation)}</span>
            </div>

            <button
              onClick={() => {
                setModalTab('doc');
                setShowOfferModal(true);
              }}
              className="py-2 px-3.5 bg-violet-600 active:bg-violet-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-violet-900/40 shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Review Form G</span>
            </button>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE BOTTOM SHEET MODAL: OFFICIAL FORM G OFFER LETTER */}
      {/* ------------------------------------------------------------- */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-[32px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 border border-slate-200">
            
            {/* Mobile Sheet Drag Handle */}
            <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-600 text-white">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold leading-tight">Notice of Award - Form G</h3>
                  <p className="text-[10px] text-slate-400">Land Acquisition Act 1960 [Sec. 14]</p>
                </div>
              </div>
              <button
                onClick={() => setShowOfferModal(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Mini Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-[11px] font-bold">
              <button
                onClick={() => setModalTab('doc')}
                className={`flex-1 py-2 text-center border-b-2 transition ${
                  modalTab === 'doc' ? 'border-violet-600 text-violet-700 bg-white' : 'border-transparent text-slate-500'
                }`}
              >
                Official Form G
              </button>
              <button
                onClick={() => setModalTab('breakdown')}
                className={`flex-1 py-2 text-center border-b-2 transition ${
                  modalTab === 'breakdown' ? 'border-violet-600 text-violet-700 bg-white' : 'border-transparent text-slate-500'
                }`}
              >
                Award Breakdown
              </button>
              <button
                onClick={() => setModalTab('legal')}
                className={`flex-1 py-2 text-center border-b-2 transition ${
                  modalTab === 'legal' ? 'border-violet-600 text-violet-700 bg-white' : 'border-transparent text-slate-500'
                }`}
              >
                Legal Terms
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {modalTab === 'doc' && (
                <div className="space-y-4">
                  {/* Government Stamp */}
                  <div className="text-center pb-3 border-b border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                      KERAJAAN MALAYSIA
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      PEJABAT PENGARAH TANAH DAN GALIAN W.P. KL
                    </div>
                    <div className="text-[11px] font-semibold text-violet-800 mt-1">
                      BORANG G - PERAKUAN AWARD DAN PAMPASAN
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rujukan:</span>
                      <span className="font-bold text-slate-800">{caseData.caseNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">No. Hakmilik & Lot:</span>
                      <span className="font-bold text-slate-800">{caseData.titleNo} ({caseData.lotNumber})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pemilik Berdaftar:</span>
                      <span className="font-bold text-slate-800">{caseData.claimantName.split('&')[0].trim()}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1">
                      <span className="text-slate-600 font-bold">Jumlah Tawaran:</span>
                      <span className="font-extrabold text-emerald-700 text-xs">{formatRM(caseData.totalCompensation)}</span>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'breakdown' && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs">Jadual Pecahan Bayaran Pampasan:</h4>
                  {compensationItems.map((item, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-[11px]">
                      <span className="text-slate-700">{item.item}</span>
                      <span className="font-bold text-slate-900 shrink-0 ml-2">{formatRM(item.amount)}</span>
                    </div>
                  ))}
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between font-bold text-xs text-emerald-900">
                    <span>JUMLAH BESAR:</span>
                    <span>{formatRM(caseData.totalCompensation)}</span>
                  </div>
                </div>
              )}

              {modalTab === 'legal' && (
                <div className="space-y-2.5 text-[11px] text-slate-600 leading-relaxed bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                  <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Peringatan Hak Tuan Punya Tanah
                  </h4>
                  <p>
                    1. Penerimaan tanpa bantahan membolehkan bayaran dibuat serta-merta ke akaun bank anda.
                  </p>
                  <p>
                    2. Sekiranya tidak bersetuju dengan pampasan, anda boleh memfailkan Borang N (Seksyen 37) dalam tempoh 6 minggu untuk semakan Mahkamah Tinggi.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={() => alert('Downloaded Form G PDF.')}
                className="p-2.5 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl bg-white flex items-center gap-1 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  Close
                </button>
                <Link
                  to="/member/bank-details"
                  onClick={() => setShowOfferModal(false)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accept Award</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
