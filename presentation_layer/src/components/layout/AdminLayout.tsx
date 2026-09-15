import React, { useRef, useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  LayoutDashboard,
  Map,
  CreditCard,
  Link as LinkIcon,
  Scale,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  Shield,
  FileText,
  PieChart,
  Settings,
  BarChart2,
  ClipboardList,
  Mail,
  FolderOpen,
  Moon,
  Sun,
  BrainCircuit,
  Sparkles,
  Send,
  PenLine,
  AlertTriangle,
  Upload,
  Ban,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, allowedPages, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('admin_theme') === 'dark';
  });

  const hasFinanceAccess = allowedPages.includes('*') || allowedPages.some(p => p.startsWith('/admin/payment') || p.startsWith('/admin/blockchain'));

  // Sidebar groups: expanded = route-pinned ∪ click-pinned ∪ hover-previewed.
  // Hover is a single source of truth, set on label-enter and cleared only when
  // the pointer leaves the nav (with a short grace delay). Per-section
  // mouseleave fired on every layout shift caused by the expand animation and
  // made groups oscillate open/closed forever.
  type GroupKey = 'landAcquisition' | 'compensation' | 'finance' | 'aiValuation' | 'reports' | 'userManagement';

  const GROUP_ROUTE_PATTERNS: Record<GroupKey, RegExp[]> = {
    landAcquisition: [/^\/admin\/case/, /^\/admin\/land-acquisition/],
    compensation: [/^\/admin\/compensation/],
    finance: [/^\/admin\/payment/, /^\/admin\/blockchain/],
    reports: [/^\/admin\/reports/],
    aiValuation: [/^\/admin\/prediction/],
    userManagement: [/^\/admin\/users/, /^\/admin\/role-management/],
  };

  const routePinnedGroup = useMemo<GroupKey | null>(() => {
    for (const [key, patterns] of Object.entries(GROUP_ROUTE_PATTERNS) as [GroupKey, RegExp[]][]) {
      if (patterns.some((re) => re.test(location.pathname))) return key;
    }
    return null;
  }, [location.pathname]);

  const [manualOpenGroups, setManualOpenGroups] = useState<Set<GroupKey>>(new Set());
  const [hoveredGroup, setHoveredGroup] = useState<GroupKey | null>(null);
  const hoverClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isCollapsed) {
      setHoveredGroup(null);
      setManualOpenGroups(new Set());
    }
  }, [isCollapsed]);

  const isGroupExpanded = (key: GroupKey) =>
    isCollapsed || key === routePinnedGroup || manualOpenGroups.has(key) || hoveredGroup === key;

  const cancelHoverClear = () => {
    if (hoverClearTimerRef.current) {
      clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }
  };

  const handleGroupEnter = (key: GroupKey) => {
    if (isCollapsed) return;
    cancelHoverClear();
    setHoveredGroup(key);
  };

  const toggleGroup = (key: GroupKey) => {
    if (isCollapsed) return;
    setManualOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const scheduleHoverClear = () => {
    cancelHoverClear();
    hoverClearTimerRef.current = setTimeout(() => {
      hoverClearTimerRef.current = null;
      setHoveredGroup(null);
    }, 160);
  };

  // GSAP dropdown expand: group items reveal top-to-bottom instead of popping
  // in instantly. First paint snaps without animation so route-pinned groups
  // don't flash the whole menu open before settling. The route-pinned group
  // never animates closed — the active page's group always stays shown.
  const navGroupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navGroupsMountedRef = useRef(false);

  useEffect(() => {
    const animate = navGroupsMountedRef.current;
    navGroupsMountedRef.current = true;
    const groupKeys: GroupKey[] = ['landAcquisition', 'compensation', 'finance', 'aiValuation', 'reports', 'userManagement'];

    if (isCollapsed) {
      // Collapsed sidebar shows every group's items inline — never clipped.
      Object.values(navGroupRefs.current).forEach((el) => {
        if (el) gsap.set(el, { height: 'auto', opacity: 1 });
      });
      return;
    }

    groupKeys.forEach((key) => {
      const el = navGroupRefs.current[key];
      if (!el) return;
      if (isGroupExpanded(key)) {
        if (animate) {
          gsap.to(el, { height: 'auto', opacity: 1, duration: 0.38, ease: 'power3.out', overwrite: 'auto' });
        } else {
          gsap.set(el, { height: 'auto', opacity: 1 });
        }
      } else if (animate && key !== routePinnedGroup) {
        gsap.to(el, { height: 0, opacity: 0, duration: 0.26, ease: 'power2.in', overwrite: 'auto' });
      } else if (!animate) {
        gsap.set(el, { height: 0, opacity: 0 });
      }
    });
  }, [hoveredGroup, manualOpenGroups, routePinnedGroup, isCollapsed]);


  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  const toggleTheme = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('admin_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('admin_theme', 'light');
      }
      return next;
    });
  };


  useGSAP(() => {
    // Smooth entry animation for the main content area
    gsap.fromTo('.admin-content',
      { autoAlpha: 0, y: 15 },
      { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  return (
    <>
      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: var(--md-background);
          color: var(--md-on-surface);
        }
        .admin-sidebar {
          width: ${isCollapsed ? '96px' : '280px'};
          background: var(--md-surface-container);
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(121,116,126,0.12);
          position: sticky;
          top: 0;
          height: 100vh;
          flex-shrink: 0;
          z-index: 10;
          transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
        }
        .admin-sidebar-header {
          position: relative;
          display: flex;
          flex-direction: ${isCollapsed ? 'column' : 'row'};
          align-items: center;
          justify-content: ${isCollapsed ? 'center' : 'space-between'};
          gap: ${isCollapsed ? '16px' : '0'};
          padding: 4px 4px 28px 4px;
        }
        .admin-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 20px;
          letter-spacing: -0.3px;
          color: var(--md-on-surface);
          overflow: hidden;
          white-space: nowrap;
        }
        .admin-sidebar-brand .brand-icon {
          width: 40px;
          height: 40px;
          background: var(--md-primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        .collapse-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--md-on-surface-variant);
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          border: 1px solid rgba(121,116,126,0.12);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          background: var(--md-background, var(--md-background));
        }
        .collapse-btn:hover {
          background: rgba(103,80,164,0.08);
        }
        .admin-sidebar-nav { flex:1; display:flex; flex-direction:column; gap:6px; overflow-y: auto; overflow-x: hidden; }
        .admin-sidebar-nav::-webkit-scrollbar { width: 4px; }
        .admin-sidebar-nav::-webkit-scrollbar-thumb { background: rgba(121,116,126,0.3); border-radius: 4px; }
        
        .nav-section {
          margin-bottom: 12px;
        }
        .nav-group-items {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: 2px;
        }
        .nav-divider {
          height: 1px;
          background: rgba(121,116,126,0.18);
          margin: 12px 14px;
          border-radius: 1px;
        }
        .nav-label {
          font-size: 11px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.6px; color: var(--md-on-surface-variant);
          padding:10px 12px 6px 12px; opacity:0.65;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
        }
        .nav-label:hover {
          opacity: 1;
        }
        .nav-item {
          display:flex; align-items:center; gap:14px; padding:9px 14px;
          border-radius: 12px; text-decoration:none;
          color: var(--md-on-surface-variant); font-weight:500; font-size:14px;
          transition: background 0.2s cubic-bezier(0.2, 0, 0, 1), color 0.2s;
          white-space: nowrap;
          justify-content: ${isCollapsed ? 'center' : 'flex-start'};
        }
        .nav-item:hover { 
          background:rgba(103,80,164,0.08); 
          color: var(--md-on-surface); 
        }
        .nav-item.active { 
          background: var(--md-secondary-container);
          color: var(--md-primary);
          font-weight:600; 
        }
        .nav-item .nav-icon { flex-shrink:0; opacity:0.7; }
        .nav-item.active .nav-icon { opacity:1; }
        
        .nav-item .nav-badge {
          display: ${isCollapsed ? 'none' : 'flex'};
          background: var(--md-primary);
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          margin-left: auto;
          align-items: center;
          justify-content: center;
        }

        .admin-main { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          overflow-x: hidden;
          position: relative;
        }
        
        .admin-main::before {
          content: "";
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: rgba(103, 80, 164, 0.06);
          filter: blur(80px);
          top: -200px;
          right: -200px;
          pointer-events: none;
          z-index: 0;
        }
        
        .admin-content {
          padding: 24px 32px 40px 32px;
          max-width: 1440px;
          width: 100%;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        @media (max-width: 768px) {
          .admin-layout { flex-direction: column; }
          .admin-sidebar {
            width: 100% !important; height: auto; position: relative; padding: 12px 16px;
            border-right: none; border-bottom: 1px solid rgba(121,116,126,0.12);
            flex-direction: row; flex-wrap: wrap; align-items: center; gap: 8px 16px;
          }
          .admin-sidebar-header { padding: 0; }
          .collapse-btn { display: none; }
          .admin-sidebar-brand span:not(.brand-icon) { display: inline; }
          .admin-sidebar-nav { flex-direction: row; flex-wrap: wrap; gap: 4px 8px; flex: 1; }
          .nav-section { margin: 0; display: flex; gap: 4px; flex-direction: row; }
          .nav-label { display: none; }
          .nav-divider { display: none; }
          .nav-item { padding: 6px 12px; font-size: 13px; gap: 8px; justify-content: center; }
          .admin-content { padding: 16px; }
        }
      `}</style>
      <div className="admin-layout" ref={containerRef}>
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-brand" style={{ display: isCollapsed ? 'none' : 'flex' }}>
              <div className="brand-icon">
                <Scale size={24} />
              </div>
              <span>FCR·SCS Admin</span>
            </div>
            {isCollapsed && (
              <div className="brand-icon" style={{
                width: 40, height: 40, background: 'var(--md-primary)', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0
              }}>
                <Scale size={24} />
              </div>
            )}
            <button
              className="collapse-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          <nav
            className="admin-sidebar-nav"
            onMouseLeave={scheduleHoverClear}
            onMouseEnter={cancelHoverClear}
          >
            <div className="nav-section">
              {!isCollapsed && <span className="nav-label">Main</span>}
              {(allowedPages.includes('*') || allowedPages.includes('/admin')) && (
                <NavLink to="/admin" end className="nav-item" title={isCollapsed ? "Dashboard" : ""}>
                  <LayoutDashboard size={22} className="nav-icon" />
                  {!isCollapsed && <span>Dashboard</span>}
                </NavLink>
              )}
            </div>

            <div className="nav-section">
              {!isCollapsed && (
                <div
                  className="nav-label"
                  onClick={() => toggleGroup('landAcquisition')}
                  onMouseEnter={() => handleGroupEnter('landAcquisition')}
                >
                  <span>Land Acquisition</span>
                  {isGroupExpanded('landAcquisition') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
              {isCollapsed && <div className="nav-divider" />}
              <div
                className="nav-group-items"
                ref={(el) => { navGroupRefs.current.landAcquisition = el; }}
              >
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/case')) && (
                    <NavLink to="/admin/case" end className="nav-item" title={isCollapsed ? "Cases" : ""}>
                      <Map size={22} className="nav-icon" />
                      {!isCollapsed && <span>Cases Dashboard</span>}
                    </NavLink>
                  )}
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/case/valuation')) && (
                    <NavLink to="/admin/case/valuation" className="nav-item" title={isCollapsed ? "Valuation" : ""}>
                      <BarChart2 size={22} className="nav-icon" />
                      {!isCollapsed && <span>Valuation</span>}
                    </NavLink>
                  )}
              </div>
            </div>

            <div className="nav-section">
              {!isCollapsed && (
                <div
                  className="nav-label"
                  onClick={() => toggleGroup('compensation')}
                  onMouseEnter={() => handleGroupEnter('compensation')}
                >
                  <span>Compensation</span>
                  {isGroupExpanded('compensation') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
              {isCollapsed && <div className="nav-divider" />}
              <div
                className="nav-group-items"
                ref={(el) => { navGroupRefs.current.compensation = el; }}
              >
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/compensation/report')) && (
                    <NavLink to="/admin/compensation/report" className="nav-item" title={isCollapsed ? "Report" : ""}>
                      <ClipboardList size={22} className="nav-icon" />
                      {!isCollapsed && <span>Report</span>}
                    </NavLink>
                  )}
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/compensation/offer')) && (
                    <NavLink to="/admin/compensation/offer" className="nav-item" title={isCollapsed ? "Offer" : ""}>
                      <Mail size={22} className="nav-icon" />
                      {!isCollapsed && <span>Offer</span>}
                    </NavLink>
                  )}
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/compensation/objection')) && (
                    <NavLink to="/admin/compensation/objection" className="nav-item" title={isCollapsed ? "Objection" : ""}>
                      <FolderOpen size={22} className="nav-icon" />
                      {!isCollapsed && <span>Objection</span>}
                    </NavLink>
                  )}
              </div>
            </div>

            {hasFinanceAccess && (
              <div className="nav-section">
                {!isCollapsed && (
                  <div
                    className="nav-label"
                    onClick={() => toggleGroup('finance')}
                    onMouseEnter={() => handleGroupEnter('finance')}
                  >
                    <span>Finance & Ledger</span>
                    {isGroupExpanded('finance') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                )}
                {isCollapsed && <div className="nav-divider" />}
                <div
                  className="nav-group-items"
                  ref={(el) => { navGroupRefs.current.finance = el; }}
                >
                    {(allowedPages.includes('*') || allowedPages.includes('/admin/payment')) && (
                      <NavLink to="/admin/payment" end className="nav-item" title={isCollapsed ? "Payments Overview" : ""}>
                        <CreditCard size={22} className="nav-icon" />
                        {!isCollapsed && <span>Payments Overview</span>}
                      </NavLink>
                    )}
                    {(allowedPages.includes('*') || allowedPages.includes('/admin/payment/initiate')) && (
                      <NavLink to="/admin/payment/initiate" className="nav-item" title={isCollapsed ? "Initiate" : ""}>
                        <Send size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                        {!isCollapsed && <span>Initiate</span>}
                      </NavLink>
                    )}
                    {(allowedPages.includes('*') || allowedPages.includes('/admin/payment/pending')) && (
                      <NavLink to="/admin/payment/pending" className="nav-item" title={isCollapsed ? "Pending Authorisations" : ""}>
                        <PenLine size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                        {!isCollapsed && <span>Pending Authorisations</span>}
                      </NavLink>
                    )}
                    {(allowedPages.includes('*') || allowedPages.includes('/admin/payment/failed')) && (
                      <NavLink to="/admin/payment/failed" className="nav-item" title={isCollapsed ? "Failed Transactions" : ""}>
                        <AlertTriangle size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                        {!isCollapsed && <span>Failed Transactions</span>}
                      </NavLink>
                    )}
                    {(allowedPages.includes('*') || allowedPages.includes('/admin/blockchain')) && (
                      <NavLink to="/admin/blockchain" end className="nav-item" title={isCollapsed ? "Blockchain Overview" : ""}>
                        <LinkIcon size={22} className="nav-icon" />
                        {!isCollapsed && <span>Blockchain Overview</span>}
                      </NavLink>
                    )}
                    {(allowedPages.includes('*') || allowedPages.includes('/admin/blockchain/publish')) && (
                      <NavLink to="/admin/blockchain/publish" className="nav-item" title={isCollapsed ? "Publish" : ""}>
                        <Upload size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                        {!isCollapsed && <span>Publish</span>}
                      </NavLink>
                    )}
                </div>
              </div>
            )}

            <div className="nav-section">
              {!isCollapsed && (
                <div
                  className="nav-label"
                  onClick={() => toggleGroup('aiValuation')}
                  onMouseEnter={() => handleGroupEnter('aiValuation')}
                  style={{ cursor: 'pointer' }}
                >
                  <span>AI Valuation</span>
                  {isGroupExpanded('aiValuation') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
              {isCollapsed && <div className="nav-divider" />}
              <div
                className="nav-group-items"
                ref={(el) => { navGroupRefs.current.aiValuation = el; }}
              >
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/prediction')) && (
                    <NavLink to="/admin/prediction" end className="nav-item" title={isCollapsed ? "Generate AI Valuation" : ""}>
                      <BrainCircuit size={22} className="nav-icon" />
                      {!isCollapsed && <span>Generate AI Valuation</span>}
                    </NavLink>
                  )}
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/prediction')) && (
                    <NavLink to="/admin/prediction/retrain" className="nav-item" title={isCollapsed ? "Retrain Model" : ""}>
                      <RefreshCw size={22} className="nav-icon" />
                      {!isCollapsed && <span>Retrain Model</span>}
                    </NavLink>
                  )}
              </div>
            </div>

            <div className="nav-section">
              {!isCollapsed && (
                <div
                  className="nav-label"
                  onClick={() => toggleGroup('reports')}
                  onMouseEnter={() => handleGroupEnter('reports')}
                  style={{ cursor: 'pointer' }}
                >
                  <span>Reporting</span>
                  {isGroupExpanded('reports') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
              {isCollapsed && <div className="nav-divider" />}
              <div
                className="nav-group-items"
                ref={(el) => { navGroupRefs.current.reports = el; }}
              >
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/reports')) && (
                    <NavLink to="/admin/reports" end className="nav-item" title={isCollapsed ? "Overview" : ""}>
                      <PieChart size={22} className="nav-icon" />
                      {!isCollapsed && <span>Overview</span>}
                    </NavLink>
                  )}
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/reports/case-status')) && (
                    <NavLink to="/admin/reports/case-status" className="nav-item" title={isCollapsed ? "Case Status" : ""}>
                      <FileText size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                      {!isCollapsed && <span>Case Status</span>}
                    </NavLink>
                  )}
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/reports/payment')) && (
                    <NavLink to="/admin/reports/payment" className="nav-item" title={isCollapsed ? "Payment" : ""}>
                      <FileText size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                      {!isCollapsed && <span>Payment</span>}
                    </NavLink>
                  )}
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/reports/blockchain-audit')) && (
                    <NavLink to="/admin/reports/blockchain-audit" className="nav-item" title={isCollapsed ? "Blockchain Audit" : ""}>
                      <FileText size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                      {!isCollapsed && <span>Blockchain Audit</span>}
                    </NavLink>
                  )}
              </div>
            </div>

            {user?.role === 'SYSTEM_ADMINISTRATOR' && (
              <div className="nav-section">
                {!isCollapsed && (
                  <div
                    className="nav-label"
                    onClick={() => toggleGroup('userManagement')}
                    onMouseEnter={() => handleGroupEnter('userManagement')}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>User Management</span>
                    {isGroupExpanded('userManagement') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                )}
                {isCollapsed && <div className="nav-divider" />}
                <div
                  className="nav-group-items"
                  ref={(el) => { navGroupRefs.current.userManagement = el; }}
                >
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/users')) && (
                    <NavLink to="/admin/users" className="nav-item" title={isCollapsed ? "User Admin" : ""}>
                      <Users size={22} className="nav-icon" />
                      {!isCollapsed && <span>User Admin</span>}
                    </NavLink>
                  )}
                  {(allowedPages.includes('*') || allowedPages.includes('/admin/role-management')) && (
                    <NavLink to="/admin/role-management" className="nav-item" title={isCollapsed ? "Role Management" : ""}>
                      <Shield size={22} className="nav-icon" />
                      {!isCollapsed && <span>Role Management</span>}
                    </NavLink>
                  )}
                </div>
              </div>
            )}

            <div className="nav-section">
              {!isCollapsed && <span className="nav-label">System</span>}
              {isCollapsed && <div className="nav-divider" />}
              {(allowedPages.includes('*') || allowedPages.includes('/admin/profile')) && (
                <NavLink to="/admin/profile" className="nav-item" title={isCollapsed ? "Profile" : ""}>
                  <Users size={22} className="nav-icon" />
                  {!isCollapsed && <span>My Profile</span>}
                </NavLink>
              )}
              {(allowedPages.includes('*') || allowedPages.includes('/admin/email-templates')) && (
                <NavLink to="/admin/email-templates" className="nav-item" title={isCollapsed ? "Email Templates" : ""}>
                  <Mail size={22} className="nav-icon" />
                  {!isCollapsed && <span>Email Templates</span>}
                </NavLink>
              )}
              {(allowedPages.includes('*') || allowedPages.includes('/admin/audit-logs')) && (
                <NavLink to="/admin/audit-logs" className="nav-item" title={isCollapsed ? "Audit Logs" : ""}>
                  <ClipboardList size={22} className="nav-icon" />
                  {!isCollapsed && <span>Audit Logs</span>}
                </NavLink>
              )}
              {(allowedPages.includes('*') || allowedPages.includes('/admin/alerts')) && (
                <NavLink to="/admin/alerts" className="nav-item" title={isCollapsed ? "Alerts" : ""}>
                  <Sparkles size={22} className="nav-icon" />
                  {!isCollapsed && <span>Alerts</span>}
                </NavLink>
              )}
              {(allowedPages.includes('*') || allowedPages.includes('/admin/settings')) && (
                <NavLink to="/admin/settings" className="nav-item" title={isCollapsed ? "Settings" : ""}>
                  <Settings size={22} className="nav-icon" />
                  {!isCollapsed && <span>Settings</span>}
                </NavLink>
              )}
            </div>

            <div style={{ flex: 1 }} />

            <div className="nav-section" style={{ marginTop: '16px' }}>
              {isCollapsed && <div className="nav-divider" style={{ marginBottom: 4 }} />}
              <button
                type="button"
                className="nav-item"
                onClick={toggleTheme}
                style={{
                  cursor: 'pointer',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left'
                }}
              >
                {isDark ? <Sun size={22} className="nav-icon" /> : <Moon size={22} className="nav-icon" />}
                {!isCollapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
              </button>

              <button
                type="button"
                className="nav-item"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                style={{
                  cursor: 'pointer',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  marginTop: '8px',
                  color: '#ef4444'
                }}
              >
                <LogOut size={22} className="nav-icon" style={{ opacity: 1 }} />
                {!isCollapsed && <span>Logout</span>}
              </button>
            </div>
          </nav>
        </aside>

        <main className="admin-main">
          <div className="admin-content">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
};
