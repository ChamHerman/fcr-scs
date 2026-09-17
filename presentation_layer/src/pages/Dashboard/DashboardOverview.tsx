import React, { useState, useEffect } from 'react';
import { MD3Card, MD3Button, MD3BlurBackground } from '../MD3Components';
import {
  ShieldCheck,
  Clock,
  UserCircle,
  FolderPlus,
  FileCheck2,
  Scale,
  Activity,
  ArrowRight,
  Landmark,
  Briefcase,
  Bell,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user, allowedPages } = useAuth();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    activeCases: 0,
    totalCases: 0,
    pendingValuations: 0,
    totalValuations: 0,
    pendingCompensations: 0,
    totalCompensations: 0,
    activeObjections: 0,
    totalObjections: 0,
    systemUsers: 0,
    alertsToday: 0,
  });

  // Check if active user role is permitted for target path
  const canAccess = (targetPath: string) => {
    const activeRole = (user?.role || '').toUpperCase();
    if (activeRole === 'SYSTEM_ADMINISTRATOR' || (allowedPages && allowedPages.includes('*'))) {
      return true;
    }
    if (!allowedPages || allowedPages.length === 0) return false;
    return allowedPages.some((p) => {
      if (targetPath === '/admin/compensation') {
        return p === '/admin/compensation' || p.startsWith('/admin/compensation');
      }
      return p === targetPath || p.startsWith(targetPath + '/');
    });
  };

  const showKpiCases = canAccess('/admin/case');
  const showKpiValuation = canAccess('/admin/case/valuation');
  const showKpiCompensation = canAccess('/admin/compensation');
  const showKpiAlerts = canAccess('/admin/alerts');
  const visibleKpisCount = [showKpiCases, showKpiValuation, showKpiCompensation, showKpiAlerts].filter(Boolean).length;

  const showWorkflowCases = canAccess('/admin/case');
  const showWorkflowOffer = canAccess('/admin/compensation/offer');
  const showWorkflowObjection = canAccess('/admin/compensation/objection');
  const showWorkflowReports = canAccess('/admin/reports');
  const showWorkflowAudit = canAccess('/admin/audit-logs');
  const showWorkflowAlerts = canAccess('/admin/alerts');
  const visibleWorkflowsCount = [
    showWorkflowCases,
    showWorkflowOffer,
    showWorkflowObjection,
    showWorkflowReports,
    showWorkflowAudit,
    showWorkflowAlerts,
  ].filter(Boolean).length;

  // Malaysian Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-MY', {
          timeZone: 'Asia/Kuala_Lumpur',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-MY', {
          timeZone: 'Asia/Kuala_Lumpur',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live stats from backend services
  useEffect(() => {
    let isMounted = true;

    const fetchLiveStats = async () => {
      try {
        setLoading(true);
        let unifiedLoaded = false;

        // 1. Attempt unified dashboard stats endpoint
        try {
          const res = await api.get('/dashboard/stats');
          if (res?.data && typeof res.data.totalCases === 'number') {
            if (isMounted) {
              setStats({
                activeCases: res.data.activeCases ?? res.data.totalCases ?? 0,
                totalCases: res.data.totalCases ?? 0,
                pendingValuations: res.data.pendingValuations ?? 0,
                totalValuations: res.data.totalValuations ?? 0,
                pendingCompensations: res.data.pendingCompensations ?? 0,
                totalCompensations: res.data.totalCompensations ?? 0,
                activeObjections: res.data.activeObjections ?? 0,
                totalObjections: res.data.totalObjections ?? 0,
                systemUsers: res.data.systemUsers ?? 0,
                alertsToday: res.data.alertsToday ?? 0,
              });
              unifiedLoaded = true;
            }
          }
        } catch {
          // Gracefully fallback to domain endpoints
        }

        // 2. Resilient domain service queries
        if (!unifiedLoaded) {
          const [caseRes, valRes, compRes, objRes, alertRes, usersRes] = await Promise.allSettled([
            api.get('/land-acquisition/cases/stats'),
            api.get('/land-acquisition/valuation-reports'),
            api.get('/compensation/reports'),
            api.get('/compensation/objections'),
            api.get('/alerts/stats'),
            api.get('/users'),
          ]);

          if (isMounted) {
            const caseData = caseRes.status === 'fulfilled' ? caseRes.value.data : null;
            const valData = valRes.status === 'fulfilled' ? valRes.value.data : null;
            const compData = compRes.status === 'fulfilled' ? compRes.value.data : null;
            const objData = objRes.status === 'fulfilled' ? objRes.value.data : null;
            const alertData = alertRes.status === 'fulfilled' ? alertRes.value.data : null;
            const usersData = usersRes.status === 'fulfilled' ? usersRes.value.data : null;

            const valReports = Array.isArray(valData?.reports) ? valData.reports : [];
            const pendingVal = valReports.filter((r: any) => r.reportStatus === 'PENDING').length;

            const compReports = Array.isArray(compData?.reports) ? compData.reports : [];
            const pendingComp = compReports.filter((r: any) => r.status === 'PENDING').length;

            const objections = Array.isArray(objData?.objections) ? objData.objections : [];
            const pendingObj = objections.filter((o: any) => o.status === 'PENDING').length;

            setStats((prev) => ({
              totalCases: caseData?.totalCases ?? prev.totalCases,
              activeCases: caseData?.active ?? caseData?.totalCases ?? prev.activeCases,
              totalValuations: valData?.total ?? valReports.length ?? prev.totalValuations,
              pendingValuations: pendingVal || (caseData?.pendingAction ?? prev.pendingValuations),
              totalCompensations: compData?.total ?? compReports.length ?? prev.totalCompensations,
              pendingCompensations: pendingComp || prev.pendingCompensations,
              totalObjections: objData?.total ?? objections.length ?? prev.totalObjections,
              activeObjections: pendingObj || prev.activeObjections,
              systemUsers: usersData?.users?.length ?? (Array.isArray(usersData) ? usersData.length : prev.systemUsers),
              alertsToday: alertData?.unacknowledgedAlerts ?? alertData?.totalAlerts ?? prev.alertsToday,
            }));
          }
        }
      } catch (err) {
        console.error('[DashboardOverview] Error loading operational stats:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLiveStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const role = (user?.role || 'SYSTEM_ADMINISTRATOR').toUpperCase();
  const userName = user?.name || 'Authorized Officer';

  // Role Badge Helper
  const getRoleDisplay = () => {
    switch (role) {
      case 'SYSTEM_ADMINISTRATOR':
        return {
          title: 'System Administrator',
          icon: <ShieldCheck size={16} className="text-md-primary" />,
          badgeClass: 'bg-md-primary/10 text-md-primary border-md-primary/20',
          desc: 'System governance, security telemetry & access control management',
        };
      case 'GOVERNMENT_ADMINISTRATOR':
        return {
          title: 'Government Administrator',
          icon: <Landmark size={16} className="text-purple-600 dark:text-purple-400" />,
          badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
          desc: 'Executive land acquisition oversight, budget allocation & statutory compliance',
        };
      case 'GOVERNMENT_OFFICER':
        return {
          title: 'Government Case Officer',
          icon: <Briefcase size={16} className="text-teal-600 dark:text-teal-400" />,
          badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800',
          desc: 'Operational case management, valuer assignment & compensation review',
        };
      case 'LAND_VALUER':
        return {
          title: 'Registered Land Valuer',
          icon: <Scale size={16} className="text-amber-600 dark:text-amber-400" />,
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          desc: 'Professional land valuation, site inspection & statutory Form C submission',
        };
      default:
        return {
          title: role.replace(/_/g, ' '),
          icon: <ShieldCheck size={16} className="text-md-primary" />,
          badgeClass: 'bg-md-primary/10 text-md-primary border-md-primary/20',
          desc: 'Administrative portal access',
        };
    }
  };

  const roleInfo = getRoleDisplay();

  return (
    <div className="p-6 md:p-8 min-h-screen relative z-0">
      <MD3BlurBackground />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Executive Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-md-surface-container-low/90 border border-md-outline/20 backdrop-blur-md shadow-sm">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${roleInfo.badgeClass}`}>
                {roleInfo.icon}
                <span>{roleInfo.title}</span>
              </span>
              <span className="text-xs text-md-on-surface-variant font-medium">
                • Malaysia Land Acquisition Act 1960 (Act 486) Portal
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-md-on-surface tracking-tight">
              Welcome back, {userName}
            </h1>
            <p className="text-sm text-md-on-surface-variant mt-1">
              {roleInfo.desc}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Clock Widget */}
            <div className="px-4 py-2 rounded-xl bg-md-surface border border-md-outline/15 text-left sm:text-right">
              <div className="text-xs text-md-on-surface-variant flex items-center gap-1.5">
                <Clock size={13} className="text-md-primary" />
                <span>Kuala Lumpur (MYT)</span>
              </div>
              <div className="text-sm font-semibold text-md-on-surface font-mono">{currentTime || '09:00:00 AM'}</div>
              <div className="text-[11px] text-md-on-surface-variant">{currentDate}</div>
            </div>

            <div className="flex gap-2">
              <MD3Button
                variant="tonal"
                icon={<UserCircle size={16} />}
                onClick={() => navigate('/admin/profile')}
              >
                Profile
              </MD3Button>
            </div>
          </div>
        </div>

        {/* Operational KPI Metric Cards */}
        {visibleKpisCount > 0 && (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              visibleKpisCount >= 4
                ? 'lg:grid-cols-4'
                : visibleKpisCount === 3
                ? 'lg:grid-cols-3'
                : 'lg:grid-cols-2'
            } gap-5`}
          >
            {/* Card 1: Active Cases */}
            {showKpiCases && (
              <div
                onClick={() => navigate('/admin/case')}
                className="p-5 rounded-2xl bg-md-surface-container border border-md-outline/20 hover:border-md-primary/50 transition-all cursor-pointer group shadow-xs hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">
                    Acquisition Cases
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <FolderPlus size={18} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-md-on-surface">
                  {loading ? <span className="animate-pulse opacity-40">--</span> : stats.activeCases}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-md-outline/10 text-xs text-md-on-surface-variant">
                  <span>Under active processing</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-md-primary" />
                </div>
              </div>
            )}

            {/* Card 2: Valuation Assessments */}
            {showKpiValuation && (
              <div
                onClick={() => navigate('/admin/case/valuation')}
                className="p-5 rounded-2xl bg-md-surface-container border border-md-outline/20 hover:border-amber-500/50 transition-all cursor-pointer group shadow-xs hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">
                    Valuation Reports
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Scale size={18} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-md-on-surface">
                  {loading ? <span className="animate-pulse opacity-40">--</span> : stats.totalValuations}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-md-outline/10 text-xs text-md-on-surface-variant">
                  <span>{stats.pendingValuations} Form C {stats.pendingValuations === 1 ? 'assessment' : 'assessments'} pending</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-amber-600" />
                </div>
              </div>
            )}

            {/* Card 3: Compensation & Objections */}
            {showKpiCompensation && (
              <div
                onClick={() => navigate('/admin/compensation')}
                className="p-5 rounded-2xl bg-md-surface-container border border-md-outline/20 hover:border-purple-500/50 transition-all cursor-pointer group shadow-xs hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">
                    Compensation & Claims
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <FileCheck2 size={18} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-md-on-surface">
                  {loading ? <span className="animate-pulse opacity-40">--</span> : stats.totalCompensations}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-md-outline/10 text-xs text-md-on-surface-variant">
                  <span>{stats.activeObjections} Form N {stats.activeObjections === 1 ? 'objection' : 'objections'} filed</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-purple-600" />
                </div>
              </div>
            )}

            {/* Card 4: Governance & Alerts */}
            {showKpiAlerts && (
              <div
                onClick={() => navigate('/admin/alerts')}
                className="p-5 rounded-2xl bg-md-surface-container border border-md-outline/20 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-xs hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider">
                    System Alerts
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Bell size={18} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-md-on-surface">
                  {loading ? <span className="animate-pulse opacity-40">--</span> : stats.alertsToday}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-md-outline/10 text-xs text-md-on-surface-variant">
                  <span>Unacknowledged events</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-emerald-600" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Role-Contextual Quick Navigation Grid */}
        {visibleWorkflowsCount > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-md-on-surface">Operational Workflows & Modules</h2>
                <p className="text-xs text-md-on-surface-variant">
                  Direct access to statutory modules provisioned for your role
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Workflow 1: Land Acquisition Case Registry */}
              {showWorkflowCases && (
                <MD3Card
                  elevation={1}
                  interactive
                  className="group relative overflow-hidden p-6 hover:shadow-md transition-all border border-md-outline/20"
                  onClick={() => navigate('/admin/case')}
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                    <FolderPlus size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-md-on-surface mb-1.5">
                    Land Acquisition Cases
                  </h3>
                  <p className="text-xs text-md-on-surface-variant mb-5 leading-relaxed">
                    Register Section 4 & 8 gazettes, attach landowners, manage land lot parcels, and assign certified land valuers.
                  </p>
                  <div className="mt-auto flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 gap-1 group-hover:underline">
                    <span>Manage Cases</span>
                    <ArrowRight size={14} />
                  </div>
                </MD3Card>
              )}

              {/* Workflow 2: Valuation & Compensation Awards */}
              {showWorkflowOffer && (
                <MD3Card
                  elevation={1}
                  interactive
                  className="group relative overflow-hidden p-6 hover:shadow-md transition-all border border-md-outline/20"
                  onClick={() => navigate('/admin/compensation/offer')}
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                    <FileCheck2 size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-md-on-surface mb-1.5">
                    Compensation & Form H Offers
                  </h3>
                  <p className="text-xs text-md-on-surface-variant mb-5 leading-relaxed">
                    Review statutory compensation valuations, prepare formal Form H offer letters, and process landowner acceptances.
                  </p>
                  <div className="mt-auto flex items-center text-xs font-semibold text-purple-600 dark:text-purple-400 gap-1 group-hover:underline">
                    <span>Review Compensation</span>
                    <ArrowRight size={14} />
                  </div>
                </MD3Card>
              )}

              {/* Workflow 3: Form N Objections & Legal Review */}
              {showWorkflowObjection && (
                <MD3Card
                  elevation={1}
                  interactive
                  className="group relative overflow-hidden p-6 hover:shadow-md transition-all border border-md-outline/20"
                  onClick={() => navigate('/admin/compensation/objection')}
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                    <Scale size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-md-on-surface mb-1.5">
                    Form N Objections Registry
                  </h3>
                  <p className="text-xs text-md-on-surface-variant mb-5 leading-relaxed">
                    Examine landowner objection grounds, revise statutory compensation awards, and prepare High Court referral files.
                  </p>
                  <div className="mt-auto flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 gap-1 group-hover:underline">
                    <span>Examine Objections</span>
                    <ArrowRight size={14} />
                  </div>
                </MD3Card>
              )}

              {/* Workflow 4: Statutory Reports & Analytics */}
              {showWorkflowReports && (
                <MD3Card
                  elevation={1}
                  interactive
                  className="group relative overflow-hidden p-6 hover:shadow-md transition-all border border-md-outline/20"
                  onClick={() => navigate('/admin/reports')}
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-teal-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                  <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
                    <FileSpreadsheet size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-md-on-surface mb-1.5">
                    Statutory Reports & Audits
                  </h3>
                  <p className="text-xs text-md-on-surface-variant mb-5 leading-relaxed">
                    Generate scheduled and on-demand compensation expenditure breakdowns, case progression rates, and state metrics.
                  </p>
                  <div className="mt-auto flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400 gap-1 group-hover:underline">
                    <span>View Reports</span>
                    <ArrowRight size={14} />
                  </div>
                </MD3Card>
              )}

              {/* Workflow 5: Tamper-Proof Audit Trail */}
              {showWorkflowAudit && (
                <MD3Card
                  elevation={1}
                  interactive
                  className="group relative overflow-hidden p-6 hover:shadow-md transition-all border border-md-outline/20"
                  onClick={() => navigate('/admin/audit-logs')}
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
                    <Activity size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-md-on-surface mb-1.5">
                    Cryptographic Audit Logs
                  </h3>
                  <p className="text-xs text-md-on-surface-variant mb-5 leading-relaxed">
                    Inspect immutable system logs, session timestamps, Malaysian Standard Time entries, and security audit verifications.
                  </p>
                  <div className="mt-auto flex items-center text-xs font-semibold text-rose-600 dark:text-rose-400 gap-1 group-hover:underline">
                    <span>Audit Trail</span>
                    <ArrowRight size={14} />
                  </div>
                </MD3Card>
              )}

              {/* Workflow 6: Alerts & Routing Rules */}
              {showWorkflowAlerts && (
                <MD3Card
                  elevation={1}
                  interactive
                  className="group relative overflow-hidden p-6 hover:shadow-md transition-all border border-md-outline/20"
                  onClick={() => navigate('/admin/alerts')}
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                    <Bell size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-md-on-surface mb-1.5">
                    Alerts & Routing Rules
                  </h3>
                  <p className="text-xs text-md-on-surface-variant mb-5 leading-relaxed">
                    Configure contextual multi-role routing rules, monitor system anomalies, and verify statutory email dispatches.
                  </p>
                  <div className="mt-auto flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 gap-1 group-hover:underline">
                    <span>Alert Rules</span>
                    <ArrowRight size={14} />
                  </div>
                </MD3Card>
              )}

            </div>
          </div>
        )}

        {/* Operational Guidelines & Compliance Footer Card */}
        <div className="p-5 rounded-2xl bg-md-surface-container-low border border-md-outline/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-md-primary/10 text-md-primary flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold text-md-on-surface">
                Statutory Land Acquisition Compliance Protocol Active
              </div>
              <div className="text-xs text-md-on-surface-variant">
                All case milestones, valuer awards, and Form H statutory notices are automatically logged and timestamped.
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ledger Synchronized
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardOverview;

